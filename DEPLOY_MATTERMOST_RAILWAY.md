# Deploy Mattermost to Railway (with Neon PostgreSQL)

This guide shows how to deploy Mattermost Team Edition to Railway using an external Neon PostgreSQL database.

## Prerequisites
* Railway account and Railway CLI installed
  * Install: `npm i -g @railway/cli`
  * Login: `railway login`
* Neon PostgreSQL database (already created)
* macOS/Linux shell

## Quick Start (Automated)

1. **Navigate to the deployment directory:**
   ```bash
   cd devops/mattermost/railway
   ```

2. **Link your Railway project:**
   ```bash
   railway link
   ```
   - Select workspace: `sujisudharsanan's Projects`
   - Select project: `mattermost`
   - Select environment: `production`

3. **Run the deployment script:**
   ```bash
   bash deploy.sh
   ```

4. **Verify deployment:**
   ```bash
   railway logs --lines 200
   curl https://mattermost-production.up.railway.app/api/v4/system/ping
   ```

## Manual Deployment Steps

### 1. Link Railway Project
```bash
cd devops/mattermost/railway
railway link
# Choose: mattermost project, production environment
```

### 2. Set Environment Variables
```bash
railway variables set MM_SERVICESETTINGS_SITEURL="https://mattermost-production.up.railway.app"
railway variables set MM_SQLSETTINGS_DRIVERNAME="postgres"
railway variables set MM_SQLSETTINGS_DATASOURCE="postgres://bisman-erp-db:Suji@335960@ep-cool-host.ap-southeast-1.aws.neon.tech:5432/mattermost?sslmode=require&connect_timeout=10"
railway variables set MM_FILESETTINGS_DRIVERNAME="local"
railway variables set MM_FILESETTINGS_DIRECTORY="/mattermost/data"
railway variables set MM_PLUGINSETTINGS_ENABLE="true"
railway variables set MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS="true"
railway variables set MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS="true"
railway variables set MM_TEAM_SLUG="erp"
```

### 3. Deploy
```bash
railway up --detach
```

### 4. Verify
```bash
railway logs --lines 200
railway status
railway domain  # Get your Railway URL
curl https://your-domain.up.railway.app/api/v4/system/ping
```

Expected response:
```json
{"status":"OK"}
```

### 5. Open Mattermost
```bash
railway open
```

## Configuration Files

- **Dockerfile**: Uses official `mattermost/mattermost-team-edition:latest`
- **railway.json**: Railway-specific build and deploy configuration
- **.env.railway**: Environment variable template
- **deploy.sh**: Automated deployment script

## Frontend Integration

After Mattermost is running:

1. **Update your local `.env.local`:**
   ```env
   MM_BASE_URL=https://mattermost-production.up.railway.app
   MM_ADMIN_TOKEN=<create-personal-access-token-in-mattermost>
   NEXT_PUBLIC_MM_TEAM_SLUG=erp
   ```

2. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/api/mattermost/health
   ```
   
   Expected:
   ```json
   {"status":"ok","team_slug":"erp","ping":"ok"}
   ```

3. **Access embedded chat:**
   - Navigate to: `http://localhost:3000/chat`

## Database Notes

- Using external Neon PostgreSQL (not Railway's built-in PostgreSQL)
- Connection string includes `sslmode=require` for secure connection
- Database: `mattermost`
- No need to run migrations manually (Mattermost handles schema on first boot)

## Troubleshooting

### Deployment fails
```bash
railway logs --lines 500
```
Look for database connection errors or port binding issues.

### Database connection errors
- Verify Neon database is accessible: `psql "postgres://bisman-erp-db:Suji@335960@ep-cool-host.ap-southeast-1.aws.neon.tech:5432/mattermost?sslmode=require"`
- Check if `mattermost` database exists in Neon
- Verify SSL mode is `require` (Neon requires SSL)

### Port issues
- Railway automatically maps port 8065 to HTTPS
- Health check uses: `/api/v4/system/ping`

### Get Railway domain
```bash
railway domain
```

### Redeploy after changes
```bash
railway up --detach
# or
railway redeploy
```

## Production Considerations

### File Storage
Current setup uses local container storage (`/mattermost/data`). For production:
- Use S3-compatible storage (AWS S3, Cloudflare R2, etc.)
- Set these variables:
  ```bash
  railway variables set MM_FILESETTINGS_DRIVERNAME="s3"
  railway variables set MM_FILESETTINGS_AMAZONS3BUCKET="your-bucket"
  railway variables set MM_FILESETTINGS_AMAZONS3ENDPOINT="s3.amazonaws.com"
  railway variables set MM_FILESETTINGS_AMAZONS3ACCESSKEYID="your-key"
  railway variables set MM_FILESETTINGS_AMAZONS3SECRETACCESSKEY="your-secret"
  railway variables set MM_FILESETTINGS_AMAZONS3REGION="us-east-1"
  ```

### Email/SMTP
```bash
railway variables set MM_EMAILSETTINGS_SMTPSERVER="smtp.example.com"
railway variables set MM_EMAILSETTINGS_SMTPPORT="587"
railway variables set MM_EMAILSETTINGS_SMTPUSERNAME="your-email"
railway variables set MM_EMAILSETTINGS_SMTPPASSWORD="your-password"
```

### Custom Domain
```bash
railway domain add yourdomain.com
```
Then update `MM_SERVICESETTINGS_SITEURL`.

## Cleanup
```bash
railway down
# or delete from dashboard
```
