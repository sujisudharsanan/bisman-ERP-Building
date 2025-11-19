const express = require('express')
const crypto = require('crypto')
const redis = require('../lib/redisClient')
const { getPrisma } = require('../lib/prisma')

const router = express.Router()
const prisma = (()=>{ try { return getPrisma(); } catch { return null } })()

// Config
const OTP_LEN = Number(process.env.TRIAL_OTP_LENGTH || 6)
const OTP_TTL_SEC = Number(process.env.TRIAL_OTP_TTL_SEC || 600) // 10 min
const REQ_LIMIT_EMAIL_HOURLY = Number(process.env.TRIAL_OTP_REQ_PER_EMAIL || 5)
const REQ_LIMIT_IP_HOURLY = Number(process.env.TRIAL_OTP_REQ_PER_IP || 20)
const RESEND_MAX = Number(process.env.TRIAL_OTP_RESEND_MAX || 3)
const HASH_SECRET = process.env.OTP_HASH_SECRET || 'dev_otp_secret'

const DISPOSABLE_DOMAINS = new Set(['mailinator.com','10minutemail.com','tempmail.com','guerrillamail.com','yopmail.com'])

function normalizeEmail(e){ return String(e||'').trim().toLowerCase() }
function isEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e||'') }
function isE164(m){ return /^\+?[1-9]\d{7,14}$/.test(String(m||'').trim()) }
function sanitize(s){ return String(s||'').replace(/[\n\r\t]/g,' ').trim().slice(0,200) }
function genId(){ return crypto.randomBytes(16).toString('hex') }
function genOtp(){ const n = crypto.randomBytes(4).readUInt32BE() % 1000000; return String(n).padStart(OTP_LEN,'0') }
function hmac(otp,email){ return crypto.createHmac('sha256', HASH_SECRET).update(`${email}|trial|${otp}`).digest('hex') }

async function rateKeyIncr(key, windowSec, max){
  const v = await redis.get(key)
  if (!v){ await redis.set(key, '1', 'EX', windowSec); return { ok: true, count: 1 } }
  const count = Number(v) + 1
  await redis.set(key, String(count), 'EX', windowSec)
  return { ok: count <= max, count }
}

function requireCaptchaIfAbuse(abuse){
  return async (req,res,next)=>{
    if (!abuse) return next()
    const token = (req.body && (req.body.captcha_token||req.body.recaptcha_token)) || ''
    if ((token||'').length < 10){ return res.status(400).json({ error: 'captcha_required' }) }
    return next()
  }
}

// GET /api/trial/modules/list
router.get('/modules/list', async (_req,res)=>{
  const list = [
    { id:'hr', name:'HR & Payroll', description:'Employee records, payroll runs, attendance', recommendedFor:['Services','Retail'] },
    { id:'finance', name:'Finance & Accounting', description:'Ledgers, invoicing, taxes', recommendedFor:['Retail','Manufacturing','Services'] },
    { id:'inventory', name:'Inventory & Stock', description:'Stock, SKUs, warehouses', recommendedFor:['Retail','Manufacturing'] },
    { id:'sales', name:'Sales & CRM', description:'Leads, deals, pipeline', recommendedFor:['Tech','Services'] },
    { id:'procurement', name:'Procurement', description:'Vendors, POs, GRNs', recommendedFor:['Manufacturing','Retail'] },
    { id:'projects', name:'Projects & Tasks', description:'Projects, tasks, time', recommendedFor:['Tech','Services'] },
    { id:'bi', name:'Reporting & BI', description:'Dashboards, KPIs', recommendedFor:['All'] },
    { id:'integrations', name:'Integrations & API', description:'APIs and connectors (limited in trial)', recommendedFor:['Tech'], disabled:true }
  ]
  res.json({ success:true, data:list })
})

// POST /api/trial/request-otp
router.post('/request-otp', async (req,res)=>{
  try{
    const ip = (req.headers['x-forwarded-for']||'').toString().split(',')[0].trim() || req.ip || 'unknown'
    const { email, mobile, businessType, employeeCount, locationCountry, locationCity, companyType, deviceInfo, captcha_token } = req.body||{}
    const em = normalizeEmail(email)
    if (!isEmail(em)) return res.status(400).json({ error: 'invalid_email' })
    if (!isE164(mobile)) return res.status(400).json({ error: 'invalid_mobile' })
    if (!businessType || !employeeCount || !locationCountry || !locationCity || !companyType) return res.status(400).json({ error: 'missing_required_fields' })
    const domain = (em.split('@')[1]||'').toLowerCase()
    if (DISPOSABLE_DOMAINS.has(domain)) return res.status(400).json({ error: 'disposable_email_blocked' })

    // Rate limit
    const rIp = await rateKeyIncr(`trialotp:ip:${ip}`, 3600, REQ_LIMIT_IP_HOURLY)
    const rEmail = await rateKeyIncr(`trialotp:email:${em}`, 3600, REQ_LIMIT_EMAIL_HOURLY)
    const abuse = !(rIp.ok && rEmail.ok)
    if (abuse && !captcha_token) return res.status(429).json({ error: 'rate_limited', requireCaptcha: true })

    // Generate OTP and store request in Redis
    const requestId = genId()
    const otp = genOtp()
    const otpHash = hmac(otp, em)
    const now = Date.now()
    const expiresAt = now + OTP_TTL_SEC*1000
    const record = {
      email: em,
      mobile: sanitize(mobile),
      businessType: sanitize(businessType),
      employeeCount: sanitize(employeeCount),
      locationCountry: sanitize(locationCountry),
      locationCity: sanitize(locationCity),
      companyType: sanitize(companyType),
      deviceInfo: deviceInfo || null,
      otpHash,
      attempts: 0,
      resend: 0,
      verified: false,
      tempToken: null,
      ip,
      expiresAt
    }
    await redis.set(`trialotp:req:${requestId}`, JSON.stringify(record), 'EX', OTP_TTL_SEC)

    // TODO: integrate email/SMS provider here. Do not log OTP.
    console.info('[trial-otp] OTP sent to user (masked). requestId=', requestId)

    res.json({ success:true, requestId, ttlSeconds: OTP_TTL_SEC })
  } catch(e){
    console.error('request-otp error', e)
    res.status(500).json({ error: 'request_failed' })
  }
})

// POST /api/trial/verify-otp
router.post('/verify-otp', async (req,res)=>{
  try{
    const { requestId, code } = req.body||{}
    if (!requestId || !code) return res.status(400).json({ error: 'missing_params' })
    const raw = await redis.get(`trialotp:req:${requestId}`)
    if (!raw) return res.status(404).json({ error: 'not_found' })
    const rec = JSON.parse(raw)
    if (Date.now() > rec.expiresAt) return res.status(400).json({ error: 'expired' })
    if (rec.verified) return res.json({ success:true, tempToken: rec.tempToken, remainingAttempts: Math.max(0,5-rec.attempts) })
    const attempt = (rec.attempts||0)+1
    const ok = hmac(String(code), rec.email) === rec.otpHash
    if (!ok){
      rec.attempts = attempt
      await redis.set(`trialotp:req:${requestId}`, JSON.stringify(rec), 'EX', Math.max(1, Math.floor((rec.expiresAt - Date.now())/1000)))
      if (attempt >= 5) return res.status(429).json({ error: 'too_many_attempts' })
      return res.status(400).json({ error: 'invalid_code', remainingAttempts: 5-attempt })
    }
    rec.verified = true
    rec.tempToken = genId()
    await redis.set(`trialotp:req:${requestId}`, JSON.stringify(rec), 'EX', Math.max(1, Math.floor((rec.expiresAt - Date.now())/1000)))
    res.json({ success:true, tempToken: rec.tempToken, remainingAttempts: 5-attempt })
  } catch(e){
    console.error('verify-otp error', e)
    res.status(500).json({ error: 'verify_failed' })
  }
})

// POST /api/trial/resend-otp
router.post('/resend-otp', async (req,res)=>{
  try{
    const { requestId } = req.body||{}
    if (!requestId) return res.status(400).json({ error: 'missing_params' })
    const raw = await redis.get(`trialotp:req:${requestId}`)
    if (!raw) return res.status(404).json({ error: 'not_found' })
    const rec = JSON.parse(raw)
    if (rec.resend >= RESEND_MAX) return res.status(429).json({ error: 'resend_limit' })
    // regenerate OTP & extend TTL slightly but cap total lifetime
    const newOtp = genOtp()
    rec.otpHash = hmac(newOtp, rec.email)
    rec.resend = (rec.resend||0)+1
    rec.expiresAt = Math.min(Date.now() + OTP_TTL_SEC*1000, rec.expiresAt + 2*60*1000)
    const ttl = Math.max(1, Math.floor((rec.expiresAt - Date.now())/1000))
    await redis.set(`trialotp:req:${requestId}`, JSON.stringify(rec), 'EX', ttl)
    console.info('[trial-otp] OTP resent to user (masked). requestId=', requestId)
    res.json({ success:true, ttlSeconds: ttl })
  } catch(e){
    console.error('resend-otp error', e)
    res.status(500).json({ error: 'resend_failed' })
  }
})

// POST /api/trial/complete
router.post('/complete', async (req,res)=>{
  try{
    const { requestId, tempToken, modules = [], demoData = false } = req.body||{}
    if (!requestId || !tempToken) return res.status(400).json({ error: 'missing_params' })
    if (!Array.isArray(modules) || modules.length === 0) return res.status(400).json({ error: 'select_at_least_one_module' })
    const raw = await redis.get(`trialotp:req:${requestId}`)
    if (!raw) return res.status(404).json({ error: 'not_found' })
    const rec = JSON.parse(raw)
    if (!rec.verified || rec.tempToken !== tempToken) return res.status(400).json({ error: 'not_verified' })

    const trialStart = new Date()
    const trialEnd = new Date(Date.now() + 14*24*60*60*1000)
    let clientId = null
    if (prisma) {
      const created = await prisma.client.create({
        data: {
          name: rec.companyType + ' Trial',
          productType: 'BUSINESS_ERP',
          subscriptionPlan: 'free',
          subscriptionStatus: 'active',
          super_admin_id: 1,
          is_active: false,
          settings: {
            enterprise: {
              status: 'trial',
              trialQuick: {
                email: rec.email,
                mobile: rec.mobile,
                businessType: rec.businessType,
                employeeCount: rec.employeeCount,
                location: { country: rec.locationCountry, city: rec.locationCity },
                companyType: rec.companyType,
                modules,
                demoData,
                trialStart: trialStart.toISOString(),
                trialEnd: trialEnd.toISOString(),
              }
            }
          }
        }
      })
      clientId = created.id
    }
    // One-shot: remove request
    await redis.del(`trialotp:req:${requestId}`)
    res.json({ success:true, client_id: clientId, trial_end: trialEnd.toISOString() })
  } catch(e){
    console.error('complete error', e)
    res.status(500).json({ error: 'complete_failed' })
  }
})

module.exports = router
