# Netlify Deployment Guide

## Frontend Deployment Configuration

Your backend API: `https://chamberlinkbackend-production.up.railway.app`

## Files Configured

- ✅ `netlify.toml` - Build and redirect configuration
- ✅ `.env.production` - Production environment variables
- ✅ `.env.example` - Updated with production reference

## Deployment Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Configure for Netlify deployment"
git push origin main
```

### 2. Connect Netlify to GitHub

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings:

**Build Settings:**

- **Base directory**: `chamberlink_frontend`
- **Build command**: `npm run build` (auto-detected from netlify.toml)
- **Publish directory**: `chamberlink_frontend/dist` (auto-detected from netlify.toml)
- **Node version**: 18 (set in netlify.toml)

6. Click **"Deploy site"**

### 3. Environment Variables (Optional Override)

If you need to override `.env.production`:

1. Go to **Site settings** → **Environment variables**
2. Add variables:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://chamberlinkbackend-production.up.railway.app/api`

### 4. Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow Netlify's instructions for DNS configuration

### 5. Update Railway CORS

Once your Netlify site is deployed, you'll get a URL like:

```
https://your-app-name.netlify.app
```

**Update Railway Backend Environment Variables:**

```bash
FRONTEND_URL=https://your-app-name.netlify.app
```

Then restart your Railway service.

## Netlify Configuration Details

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

**What it does:**

- Sets build command and publish directory
- Redirects all routes to `index.html` (SPA support)
- Uses Node.js version 18

### Environment Variables

**Development** (`.env.local`):

```
VITE_API_BASE_URL=http://localhost:5000/api
```

**Production** (`.env.production`):

```
VITE_API_BASE_URL=https://chamberlinkbackend-production.up.railway.app/api
```

## Testing Your Deployment

### 1. Check Build Logs

- Go to **Deploys** tab in Netlify
- Click on the latest deploy
- Check for build errors

### 2. Test API Connection

Open browser console on your deployed site:

```javascript
// Check if API base URL is correct
console.log(import.meta.env.VITE_API_BASE_URL);

// Test API connection
fetch(import.meta.env.VITE_API_BASE_URL.replace('/api', '/health'))
  .then((res) => res.json())
  .then((data) => console.log('Backend connected:', data))
  .catch((err) => console.error('Connection error:', err));
```

### 3. Test Authentication Flow

1. Try to register/login
2. Check Network tab for API calls
3. Verify CORS headers in response

## Troubleshooting

### Build Fails

**Error: Module not found**

- Check `package.json` for missing dependencies
- Run `npm install` locally to verify

**Error: Build command failed**

- Check build logs in Netlify
- Verify `npm run build` works locally
- Check Node version compatibility

### API Connection Issues

**CORS Error**

```
Access to fetch at 'https://chamberlinkbackend-production.up.railway.app/api/...'
from origin 'https://your-app.netlify.app' has been blocked by CORS policy
```

**Solution:**

1. Go to Railway dashboard
2. Update `FRONTEND_URL` environment variable with your Netlify URL
3. Restart Railway service
4. Wait 1-2 minutes for changes to take effect

**Network Error / Failed to Fetch**

- Check if Railway backend is running: `https://chamberlinkbackend-production.up.railway.app/health`
- Verify `VITE_API_BASE_URL` in Netlify environment variables
- Check Railway logs for errors

### Routes Not Working (404 on Refresh)

If you get 404 errors when refreshing pages:

- Verify `netlify.toml` redirect rule is present
- Check **Redirects/Rewrites** in Netlify dashboard

### Environment Variables Not Working

**Issue**: Still connecting to localhost

- Verify `.env.production` exists
- Check Netlify build logs to confirm variables are loaded
- Try setting in Netlify UI: Site settings → Environment variables
- Redeploy the site

## Continuous Deployment

Netlify automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Netlify will:

1. Pull latest code
2. Run build command
3. Deploy to production
4. Send notification (if configured)

## Deploy Previews

Netlify creates preview deployments for pull requests:

1. Create a new branch
2. Make changes
3. Open pull request
4. Netlify creates a preview URL
5. Test before merging to main

## Performance Optimization

### Enable Netlify Features:

1. **Asset Optimization**
   - Site settings → Build & deploy → Post processing
   - Enable: Bundle CSS, Minify CSS, Minify JS

2. **Netlify Edge**
   - Automatic CDN distribution
   - No configuration needed

3. **Caching**
   - Netlify automatically caches static assets
   - Configure cache headers in `netlify.toml` if needed

## Security

### Headers Configuration (Optional)

Add to `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Monitoring

1. **Netlify Analytics** (paid)
   - Site settings → Analytics
   - Shows traffic, performance, etc.

2. **Deploy Notifications**
   - Site settings → Build & deploy → Deploy notifications
   - Configure Slack/Email/Webhook notifications

3. **Function Logs** (if using Netlify Functions)
   - Functions tab in dashboard

## Next Steps

After successful deployment:

1. ✅ Verify site is accessible
2. ✅ Test all major features
3. ✅ Update Railway CORS with Netlify URL
4. ✅ Configure custom domain (optional)
5. ✅ Set up deploy notifications
6. ✅ Monitor performance and errors
7. ✅ Document your deployment URLs

## Useful Commands

```bash
# Install Netlify CLI (optional)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from CLI
netlify deploy --prod

# View deploy logs
netlify deploy --build

# Open site in browser
netlify open:site
```

## Support Resources

- [Netlify Documentation](https://docs.netlify.com)
- [Netlify Community Forums](https://answers.netlify.com)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)
