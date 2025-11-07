# Deploy Mattermost to Railway (CLI)

This repo includes a minimal setup to deploy Mattermost Team Edition to Railway using the official Docker image.

## Prerequisites
* Railway account and the Railway CLI installed
  * Install: `npm i -g @railway/cli`
  * Login: `railway login`
* Postgres plugin (script creates if missing)
* macOS/Linux shell

## One-time setup
1. (Optional) Set team slug:
   ```bash
   export MM_TEAM_SLUG=erp
   ```
2. Provision project, Postgres, env vars, and deploy:
   ```bash
   bash devops/mattermost/railway/railway-provision.sh mattermost
   ```
3. The script performs:
   * `railway init` / `railway link`
   * Postgres service creation if missing
   * Variable injection (MM_* settings)
   * `railway up --detached`

## Verify
```bash
railway logs --service mattermost
curl https://mattermost.up.railway.app/api/v4/system/ping
```

## Frontend integration
Set these Railway variables to allow the Next.js app to proxy:
* `MM_SERVICESETTINGS_SITEURL=https://mattermost.up.railway.app`
* `MM_ADMIN_TOKEN=<personal access token>` (create via Mattermost UI)

Then in local `.env.local`:
```env
MM_BASE_URL=https://mattermost.up.railway.app
MM_ADMIN_TOKEN=<same token>
NEXT_PUBLIC_MM_TEAM_SLUG=erp
```

## File storage note
Current config uses local filesystem (`/mattermost/data`). For production durability, switch to S3:
Set:
```
MM_FILESETTINGS_DRIVERNAME=s3
MM_S3_BUCKET=your-bucket
MM_S3_ENDPOINT=https://s3.amazonaws.com
MM_S3_ACCESSKEY=...
MM_S3_SECRETKEY=...
MM_S3_REGION=us-east-1
```

## Cleanup
```bash
railway down --service mattermost
railway service:delete <service-id>
```
