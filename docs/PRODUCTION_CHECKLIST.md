# Production Deployment Checklist

Critical items to configure before deploying SmashIt to production.

---

## 🔐 Security Configuration

### 1. NEXTAUTH_SECRET
Generate a strong secret and set it in **both** environments:

```bash
# Generate a secure secret
openssl rand -base64 32
```

**Set in:**
- `apps/web/.env` → `NEXTAUTH_SECRET="your-generated-secret"`
- `apps/api/.env` → `NEXTAUTH_SECRET="your-generated-secret"` (must match!)

> ⚠️ These MUST be identical for JWT verification to work.

---

### 2. Disable Header Auth Fallback
Ensure this is **NOT set** in production:

```bash
# apps/api/.env - DO NOT SET IN PRODUCTION
# ALLOW_HEADER_AUTH="true"  ← Remove or keep commented
```

---

### 3. Google OAuth Credentials
Update with production credentials:

```bash
# apps/web/.env
GOOGLE_CLIENT_ID="production-client-id"
GOOGLE_CLIENT_SECRET="production-client-secret"
```

Configure authorized redirect URIs in Google Cloud Console:
- `https://your-domain.com/api/auth/callback/google`

---

### 4. CORS Origin
Update to production domain:

```bash
# apps/api/.env
CORS_ORIGIN="https://your-domain.com"
```

---

### 5. NextAuth URL
```bash
# apps/web/.env
NEXTAUTH_URL="https://your-domain.com"
```

---

## 🗄️ Database

### 1. Database URL
```bash
# apps/api/.env & packages/database/.env
DATABASE_URL="postgresql://user:password@host:5432/avith?sslmode=require"
```

### 2. Run Migrations
Currently, the project uses `pnpm prisma migrate deploy` to sync the schema safely. This is automated in `deploy_manual.sh`.

```bash
# Manual sync if needed
pnpm prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

---

## ⚡ Redis

### 1. Redis URL
```bash
# apps/api/.env
REDIS_URL="redis://user:password@host:6379"
```

---

## 📋 Pre-Deploy Verification

- [ ] `NEXTAUTH_SECRET` matches in both web and api
- [ ] `ALLOW_HEADER_AUTH` is NOT set or is `false`
- [ ] Google OAuth credentials are for production
- [ ] `CORS_ORIGIN` points to production domain
- [ ] `NEXTAUTH_URL` points to production domain
- [ ] Database is migrated (`prisma migrate deploy`)
- [ ] Redis is accessible
- [ ] SSL/TLS configured for all connections

---

## 🚀 Build & Deploy

```bash
# Run the automated deployment script
./deploy_manual.sh
```
