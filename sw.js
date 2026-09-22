/* Mimo de Mãe — service worker.
   Rede primeiro, cache so como reserva: o app abre sempre na versao nova e
   so cai no cache quando a rede falha. Supabase e os CDNs nunca entram no
   cache (so entra o que e da propria origem). */

const CACHE = 'mimo-de-mae-v1';

const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './img/icone-192.png',
  './img/icone-512.png',
  './img/apple-touch-icon.png'
];

/* Cada arquivo por conta propria: um 404 num item nao derruba a instalacao inteira. */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ESSENCIAIS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // Supabase e CDNs: direto na rede

  const guardar = e.request.mode === 'navigate'
    || url.pathname.endsWith('/')
    || /\.(html|css|js|json|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);

  e.respondWith(
    fetch(e.request).then(resp => {
      if (guardar && resp && resp.ok && resp.type === 'basic') {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return resp;
    }).catch(() =>
      caches.match(e.request).then(r => r || caches.match('./index.html'))
    )
  );
});
