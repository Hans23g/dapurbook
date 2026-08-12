const CACHE = 'restbook-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png?v=3',
  '/icons/icon-512.png?v=3',
  '/icons/icon-192-maskable.png?v=3',
  '/icons/icon-512-maskable.png?v=3',
  '/icons/apple-touch-icon.png?v=3',
  '/icons/logo-header.png?v=3',
  '/icons/favicon-32.png?v=3',
  '/icons/favicon-16.png?v=3'
];

self.addEventListener('install', (e) => {
  // Langsung aktif tanpa nunggu tab lama
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    // HAPUS SEMUA cache lama (termasuk dapurbook-* dan restbook-v1/v2)
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Jangan pernah cache panggilan Supabase/auth/storage
  if (url.hostname.includes('supabase')) return;

  // Network-first untuk dokumen (html) agar cepat dapat versi baru
  if (req.mode === 'navigate' || (req.headers.get('accept')||'').includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then(c=>{ try{c.put(req,copy);}catch(_){} });
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('/index.html')))
    );
    return;
  }

  // Aset lain: network-first
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch(_){} });
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
  );
});

// Begitu SW baru terdeteksi, langsung ambil alih
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
