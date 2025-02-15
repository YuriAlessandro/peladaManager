const CACHE_NAME = `volley_score_cache_v7`;

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil((async () => {
      const deleted = caches.delete(CACHE_NAME);
      if(!deleted) {
        console.log('Cache não deletado');
      } else {
        console.log('Cache deletado');
      }
    })());
});
