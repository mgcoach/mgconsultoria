// AnabTech 2.2.0 — service worker
// Página: busca a versão nova na rede primeiro e usa a cópia guardada sem internet.
// Fontes, ícones e GIFs: usa a cópia guardada e atualiza em segundo plano.
// Imagens de exercícios de fora e buscas no Open Food Facts não passam pelo cache.
const CACHE_NAME = 'mgcoach-consultoria-v2-2-0';
const ICONES = ['./apple-touch-icon.png', './icon-192.png', './icon-512.png', './favicon.png'];
const DO_COACH = ['./', './index.html', './manifest.json'], DO_ALUNO = ['./aluno.html', './guia.html', './novidades.json'];
// Quem instala decide o que guardar: a página do aluno não precisa baixar o app do treinador, e vice-versa.
self.addEventListener('install', e => { e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cl => {
  const aluno = cl.some(c => /\/(aluno|guia)\.html/.test(c.url)), coach = cl.some(c => !/\/(aluno|guia)\.html/.test(c.url)) || !cl.length;
  return caches.open(CACHE_NAME).then(c => Promise.all([...ICONES, ...(coach ? DO_COACH : []), ...(aluno ? DO_ALUNO : [])].map(u => c.add(u).catch(() => {}))));
}).catch(() => {})); self.skipWaiting(); });
// Rede primeiro, mas sem deixar o app travado quando o sinal está ruim: passou do tempo, abre a cópia guardada.
function redeComPrazo(req, chave, ms) {
  const rede = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => { if (res && res.ok) { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put(chave, c)); } return res; });
  return caches.match(chave).then(guardada => { if (!guardada) return rede; return Promise.race([rede.catch(() => guardada), new Promise(ok => setTimeout(() => ok(guardada), ms))]); });
}
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && (k.startsWith('mgcoach-consultoria') || k.startsWith('mgconsultoria'))).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.pathname.includes('/3d/')) { // visualizador 3D: rede primeiro, cópia guardada sem internet
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put(req, c)); return res; }).catch(() => caches.match(req)));
    return;
  }
  if (req.mode === 'navigate') {
    const pg = url.pathname.endsWith('/aluno.html') ? './aluno.html' : url.pathname.endsWith('/guia.html') ? './guia.html' : './index.html';
    e.respondWith(redeComPrazo(req, pg, 3500));
    return;
  }
  if (url.pathname.endsWith('novidades.json')) { e.respondWith(fetch(req, { cache: 'no-store' }).then(res => { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put(url.pathname, c)); return res; }).catch(() => caches.match(url.pathname))); return; }
  if (url.pathname.endsWith('.mp4')) return; // vídeo vai direto da rede (o iPhone pede por partes)
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin || fonte) {
    e.respondWith(caches.match(req).then(cached => {
      const rede = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE_NAME).then(x => x.put(req, c)); } return res; }).catch(() => cached);
      return cached || rede;
    }));
  }
});
