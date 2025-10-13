# Environment Setup Guide

## 🔐 Security Notice
**NEVER commit actual `.env` files with real credentials to Git!**

## 📋 Setup Instructions

### Backend Setup

1. **Copy the example file:**
   ```bash
   cd my-backend
   cp .env.example .env
   ```

2. **Edit `.env` and fill in your actual values:**
   ```bash
   # Edit with your preferred editor
   nano .env
   # or
   code .env
   ```

3. **Required values to update:**
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `DB_PASSWORD` - Your database password
   - `JWT_SECRET` - Generate a strong secret (e.g., `openssl rand -base64 32`)
   - `FRONTEND_URL` - Your frontend URL (http://localhost:3001 for local dev)

### Frontend Setup

1. **Copy the example file:**
   ```bash
   cd my-frontend
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and fill in your actual values:**
   ```bash
   # Edit with your preferred editor
   nano .env.local
   # or
   code .env.local
   ```

3. **Required values to update:**
   - `NEXT_PUBLIC_API_URL` - Your backend API URL (http://localhost:3000 for local dev)

## 🚀 Production Deployment

### Render (Backend)
Set environment variables in Render Dashboard:
- Go to your service → Environment tab
- Add all variables from `.env.example`
- Use production values (e.g., Render PostgreSQL connection string)

### Vercel (Frontend)
Set environment variables in Vercel Dashboard:
- Go to your project → Settings → Environment Variables
- Add all variables from `.env.example`
- Use production values (e.g., your Render backend URL)

## 🔒 Security Best Practices

1. **Never commit:**
   - `.env`
   - `.env.local`
   - `.env.production`
   - Any file with actual credentials

2. **Always commit:**
   - `.env.example` (with placeholder values)
   - `.gitignore` (to protect env files)

3. **Generate strong secrets:**
   ```bash
   # Generate a JWT secret
   openssl rand -base64 32
   
   # Or use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

## 📝 Team Collaboration

When a new developer joins:
1. They clone the repository
2. They copy `.env.example` to `.env`
3. You share the actual credentials securely (via password manager, secure chat, etc.)
4. They fill in their local `.env` file

## ❓ Questions?

If you need help setting up your environment, contact the team lead.
