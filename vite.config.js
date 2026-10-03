import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const instagramAvatarPlugin = () => ({
  name: 'instagram-avatar-endpoint',
  configureServer(server) {
    const avatarCache = new Map(); // handle -> { buffer, contentType }
    const inFlight = new Map(); // handle -> Promise<{ buffer, contentType }>

    server.middlewares.use(async (req, res, next) => {
      if (req.url && req.url.startsWith('/api/avatar')) {
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const username = urlObj.searchParams.get('username');
          if (!username) {
            res.statusCode = 400;
            res.end('Missing username');
            return;
          }

          const handle = username.toLowerCase().trim().replace(/^@/, '');
          if (!handle) {
            res.statusCode = 400;
            res.end('Invalid username');
            return;
          }

          if (avatarCache.has(handle)) {
            const cached = avatarCache.get(handle);
            if (cached) {
              res.setHeader('Content-Type', cached.contentType || 'image/jpeg');
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.end(cached.buffer);
              return;
            } else {
              res.statusCode = 404;
              res.end('Not found');
              return;
            }
          }

          let fetchPromise = inFlight.get(handle);
          if (!fetchPromise) {
            fetchPromise = (async () => {
              try {
                const fetchRes = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
                  headers: {
                    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept': 'text/html'
                  },
                  signal: AbortSignal.timeout(5000)
                });

                if (fetchRes.ok) {
                  const html = await fetchRes.text();
                  const m = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                            html.match(/content="([^"]+)"\s+property="og:image"/i);
                  if (m && m[1]) {
                    const cdnUrl = m[1].replace(/&amp;/g, '&');
                    const imgRes = await fetch(cdnUrl, {
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      },
                      signal: AbortSignal.timeout(5000)
                    });
                    if (imgRes.ok) {
                      const buffer = Buffer.from(await imgRes.arrayBuffer());
                      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                      avatarCache.set(handle, { buffer, contentType });
                      return { buffer, contentType };
                    }
                  }
                }
              } catch (err) {
                // Ignore network error
              }
              avatarCache.set(handle, null);
              return null;
            })();
            inFlight.set(handle, fetchPromise);
          }

          const result = await fetchPromise;
          inFlight.delete(handle);

          if (result && result.buffer) {
            res.setHeader('Content-Type', result.contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.end(result.buffer);
            return;
          } else {
            res.statusCode = 404;
            res.end('Avatar not found');
            return;
          }
        } catch (err) {
          res.statusCode = 500;
          res.end('Internal error');
          return;
        }
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    instagramAvatarPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Peeksta - Instagram Audience & Chat Intelligence',
        short_name: 'Peeksta',
        description: 'Client-side private Instagram DM & relationship analytics, story recaps and audience insights',
        theme_color: '#0B0B0E',
        background_color: '#0B0B0E',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}']
      }
    })
  ],
})
