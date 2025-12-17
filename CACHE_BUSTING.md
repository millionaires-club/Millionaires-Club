# Cache Busting & Auto-Update System

## Overview
This application now has automatic cache busting and update detection to ensure users always see the latest version without manual cache clearing.

## How It Works

### 1. **Vite Build Configuration** (`vite.config.ts`)
   - Files are built with content hashes: `[name]-[hash].js`
   - When code changes, the hash changes, forcing browsers to download new files
   - Old cached files remain unused since filenames are different

### 2. **Version Detection** (`App.tsx`)
   - Checks `/public/version.txt` on app startup
   - If version differs, clears localStorage cache
   - Notifies user that new version is available

### 3. **Service Worker** (`index.tsx` + `public/sw.js`)
   - Registers a service worker for better control over caching
   - HTML files: Always fetch from network first
   - JS/CSS files: Cache with long expiration (1 year)
   - Images: Cache for 30 days

### 4. **GitHub Actions Automation** (`.github/workflows/deploy.yml`)
   - Automatically updates version file timestamp on every deployment
   - Ensures version check always detects fresh builds

### 5. **Cache Headers** (`public/.htaccess`)
   - HTML/JSON: Never cache (`no-cache, no-store`)
   - JS/CSS with hash: Cache forever (`max-age=31536000`)
   - Images: Cache for 30 days

## User Experience

### When Updates Deploy:
1. ✅ Service worker detects new version
2. ✅ Version check in App.tsx finds different timestamp
3. ✅ User sees notification: "New version available! Please refresh the page."
4. ✅ User refreshes (`F5`)
5. ✅ Gets the latest build automatically

### Manual Cache Clear (if needed):
**Windows/Linux:**
- `Ctrl + Shift + R` (hard refresh)

**Mac:**
- `Cmd + Shift + R`

**Or clear all cache:**
- Open DevTools (`F12`)
- Right-click refresh button → "Empty cache and hard refresh"

## Technical Details

### File Hashing
```
Before: /js/index.js
After:  /js/index-a3f4b2c1.js (changes with every update)
```

### Cache Control Headers
```
HTML:  Cache-Control: no-cache, no-store, must-revalidate
JS:    Cache-Control: public, max-age=31536000, immutable
Image: Cache-Control: public, max-age=2592000
```

### Version File Format
```
timestamp=2025-12-17T12:30:45Z
version=1734437445
```

## Benefits
✅ Users automatically get fresh content
✅ Old cached files don't interfere with updates
✅ Hashed filenames ensure browser downloads new versions
✅ Service worker provides offline capability
✅ Zero manual cache management needed

## Testing Cache Updates

### Local Testing:
```bash
# Build locally
npm run build

# Check dist folder for hashed files
ls dist/js/

# Should show something like:
# index-a3f4b2c1.js
# index-x7y8z9w2.js
```

### Live Testing:
1. Make a code change
2. Commit and push to `main`
3. GitHub Actions deploys
4. Visit live site URL
5. Should auto-update (or show update notification)
