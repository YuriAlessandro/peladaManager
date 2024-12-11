const CACHE_NAME = `volley_score_cache_v6`;

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil((async () => {
      const deleted = caches.delete(CACHE_NAME);
      if(!deleted) {
        alert('Cache não deletado');
      } else {
        alert('Cache deletado');
      }
    })());
});
