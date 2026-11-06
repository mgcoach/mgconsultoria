// MG COACH Consultoria 1.3.0 — service worker
// Página: busca a versão nova na rede primeiro e usa a cópia guardada sem internet.
// Fontes, ícones e GIFs: usa a cópia guardada e atualiza em segundo plano.
// Imagens de exercícios de fora e buscas no Open Food Facts não passam pelo cache.
const CACHE_NAME = 'mgcoach-consultoria-v1-3-1';
const ASSETS = ['./', './index.html', './manifest.json', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && (k.startsWith('mgcoach-consultoria') || k.startsWith('mgconsultoria'))).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put('./index.html', c)); return res; }).catch(() => caches.match('./index.html')));
    return;
  }
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin || fonte) {
    e.respondWith(caches.match(req).then(cached => {
      const rede = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put(req, c)); } return res; }).catch(() => cached);
      return cached || rede;
    }));
  }
});
