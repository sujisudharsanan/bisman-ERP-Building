// agreementReminderJob.js - daily reminder scheduler logic (invoke via cron / worker)
const { Pool } = require('pg');
const pool = new Pool();

// default reminders days list from env AGREEMENT_REMINDERS=30,15,7
function getReminderDays() {
  const raw = process.env.AGREEMENT_REMINDERS || '30,15,7';
  return raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).sort((a,b)=>b-a); // descending
}

async function runAgreementReminderJob() {
  const client = await pool.connect();
  try {
    const today = new Date();
    const daysList = getReminderDays();
    // fetch agreements not expired
    const agRes = await client.query(`SELECT id, end_date, meta FROM agreements WHERE status IN ('active','expiring_soon') AND end_date >= CURRENT_DATE`);
    for (const ag of agRes.rows) {
      const endDate = new Date(ag.end_date);
      const reminders = (ag.meta && ag.meta.reminders) || daysList;
      for (const days of reminders) {
        const notifDate = new Date(endDate.getTime() - days*86400000);
        if (notifDate.toISOString().slice(0,10) === today.toISOString().slice(0,10)) {
          // check if already sent/queued today
          const exists = await client.query(`SELECT 1 FROM agreement_notifications WHERE agreement_id=$1 AND notif_date=$2`, [ag.id, notifDate]);
          if (!exists.rows.length) {
            await client.query(`INSERT INTO agreement_notifications (agreement_id, notif_type, notif_date, status) VALUES ($1,'expiry_reminder',$2,'queued')`, [ag.id, notifDate]);
          }
        }
      }
    }
    return { processed: agRes.rows.length };
  } finally { client.release(); }
}

module.exports = { runAgreementReminderJob };
