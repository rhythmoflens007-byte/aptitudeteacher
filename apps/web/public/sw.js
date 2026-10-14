// Aptitude Teacher service worker: lets the installed app open instantly and survive a lost connection.
// Pages go to the network first (always fresh), falling back to the last copy we saw; built assets,
// fonts and icons are served from cache first because their URLs change whenever they change.
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const SHELL = ["/", "/dashboard", "/practice", "/tests", "/tutor", "/profile", "/login"];

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Aptitude Teacher</title><style>
:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fbfaf7;color:#17171f;text-align:center;padding:24px}
@media (prefers-color-scheme:dark){body{background:#0c0c11;color:#f3f2ee}}img{width:72px;height:72px;border-radius:20px}h1{font-size:22px;margin:20px 0 8px}p{margin:4px 0;opacity:.75;line-height:1.5}
button{margin-top:20px;border:0;border-radius:999px;padding:12px 22px;font-size:16px;font-weight:600;background:#5b5bf5;color:#fff}</style></head>
<body><main><img src="/icons/icon-192.png" alt=""><h1>You're offline</h1><p>Check your internet, then try again.</p><p lang="hi">आप ऑफ़लाइन हैं।</p><p lang="ta">நீங்கள் ஆஃப்லைனில் உள்ளீர்கள்.</p><p lang="te">మీరు ఆఫ్‌లైన్‌లో ఉన్నారు.</p>
<button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:woff2?|svg|png|ico)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only our own origin: API calls and voices live elsewhere and must never be served stale.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(PAGES).then((cache) => cache.put(request, res.clone()));
          return res;
        })
        .catch(async () => {
          const cached = (await caches.match(request, { ignoreSearch: true })) || (await caches.match("/dashboard"));
          return cached || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(ASSETS).then((cache) => cache.put(request, res.clone()));
            return res;
          }),
      ),
    );
  }
});
