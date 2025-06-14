const CACHE_NAME = 'mockjun-files';
const FILES_TO_CACHE = [
  // HTML 파일
  '../index.html',
  '../edit.html',
  '../list.html',
  '../problem.html',
  '../profile.html',
  '../start.html',

  // manifest
  '../manifest.json',

  // apps
  '../apps/app-base.js',
  '../apps/edit.js',
  '../apps/index.js',
  '../apps/list.js',
  '../apps/problem.js',
  '../apps/profile.js',
  '../apps/start.js',

  // assets
  '../assets/favicon.ico',
  '../assets/highlight.min.js',
  '../assets/logo.png',
  '../assets/style.css',

  // components
  '../components/banner.js',
  '../components/footer.js',
  '../components/header.js',
  '../components/index.js',
  '../components/problem-card.js',
  '../components/sidebar.js',

  // entity
  '../entity/file-sha.js',
  '../entity/page-info.js',
  '../entity/problem-data.js',
  '../entity/problem-meta.js',
  '../entity/stores.js',
  '../entity/submission-data.js',

  // modules
  '../modules/cookie.js',
  '../modules/db-module.js',
  '../modules/github-module.js',
  '../modules/utils.js',

  // repositories
  '../repositories/problem-repository.js',
  '../repositories/submission-repository.js',
  '../repositories/user-repository.js',

  // services
  '../services/problem-service.js',
  '../services/submission-service.js',
  '../services/user-service.js',

  // worker
  './executor.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
