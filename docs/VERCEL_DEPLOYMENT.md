# Vercel Deployment Guide

## Environment Variables Setup

When deploying to Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Variables

#### Database (Neon Integration)
If you're using Neon's Vercel integration, these will be automatically added:
- `DATABASE_URL` - Pooled connection (recommended for serverless)
- `DATABASE_URL_UNPOOLED` - Direct connection for migrations

If setting up manually:
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@host/database?sslmode=require
```

#### WAHA (WhatsApp API)
```
WAHA_API_URL=https://your-waha-instance.com
WAHA_API_KEY=your_waha_api_key
```

#### Google OAuth
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.vercel.app/api/auth/google/callback
```

#### AI Services
```
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

#### App URL (Client-side)
```
NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
```

## Security Notes

⚠️ **IMPORTANT**: Only `NEXT_PUBLIC_APP_URL` should have the `NEXT_PUBLIC_` prefix. All other variables are server-side only and should NOT be exposed to the client.

Variables with `NEXT_PUBLIC_` prefix are:
- Embedded in the client-side JavaScript bundle
- Visible to anyone who inspects the browser
- Should NEVER contain sensitive data like API keys or database credentials

## Deployment Steps

1. **Connect your repository to Vercel**
   - Import your GitHub/GitLab repository
   - Vercel will auto-detect Next.js

2. **Add environment variables**
   - Go to Project Settings → Environment Variables
   - Add all variables listed above
   - Set them for Production, Preview, and Development environments as needed

3. **Connect Neon Database** (recommended)
   - Use Vercel's Neon integration for automatic setup
   - This will automatically add `DATABASE_URL` and related variables

4. **Deploy**
   - Vercel will automatically run `pnpm run build`
   - The build script includes `prisma generate` to ensure the Prisma Client is ready

## Build Configuration

The project is configured to:
- Run `prisma generate` before building (in `build` script)
- Run `prisma generate` after installing dependencies (in `postinstall` script)

This ensures the Prisma Client is always available during builds.

## Troubleshooting

### "Module '@prisma/client' has no exported member 'PrismaClient'"
This means Prisma Client wasn't generated. The build scripts should handle this automatically, but if you encounter this:
- Ensure `DATABASE_URL` is set in your environment
- Check that the build logs show "Generated Prisma Client"

### WAHA Connection Issues
- Ensure `WAHA_API_URL` is accessible from Vercel's servers
- If using localhost, deploy WAHA to a public URL first

### Google OAuth Redirect Mismatch
- Update `GOOGLE_REDIRECT_URI` to match your Vercel domain
- Add the redirect URI to your Google Cloud Console OAuth settings
