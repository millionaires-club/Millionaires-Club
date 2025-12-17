# Quick Cache Clearing Guide

## For Users (Visitors to the Site)

### If you're seeing old content:

**Windows/Chrome/Firefox/Edge:**
```
Ctrl + Shift + R
```

**Mac/Safari/Chrome:**
```
Cmd + Shift + R
```

**Mobile:**
- Chrome: Menu → Settings → Privacy → Clear browsing data
- Safari: Settings → General → Safari → Clear History and Website Data

---

## For Developers

### Option 1: Hard Refresh (Quickest)
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Option 2: DevTools (Most Thorough)
1. Open DevTools: `F12` or `Ctrl+Shift+I`
2. Go to **Application** tab
3. **Storage** section on left:
   - Clear **Local Storage**
   - Clear **Session Storage**
   - Clear **Cache Storage**
4. **Service Workers** → Unregister
5. Close DevTools and refresh

### Option 3: Browser Settings
- **Chrome/Edge**: Settings → Privacy → Clear browsing data → All time
- **Firefox**: Preferences → Privacy → Clear All
- **Safari**: Preferences → Privacy → Remove All

---

## Why This Happens

The app now uses:
- **File hashing** - Filenames change with updates
- **Service workers** - Control which files are cached
- **Cache headers** - Tell browsers how long to keep files

This means:
✅ Old files are rarely kept more than necessary
✅ New updates deploy instantly
✅ You rarely need to manually clear cache

---

## Test That Cache Works

1. Open the app
2. Open DevTools → **Network** tab
3. Refresh the page
4. Look at file sizes:
   - JS files should show **from cache** (no download)
   - HTML should show **from network** (always fresh)

This is the desired behavior!
