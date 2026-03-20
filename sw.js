// 도토리 가계부 Service Worker
// 버전을 올리면 캐시가 갱신되어 사용자에게 업데이트 알림이 표시됩니다.
const CACHE_VERSION = 'dountoo-v1.0.3';
const CACHE_NAME = CACHE_VERSION;

// 오프라인에서도 동작할 파일 목록
const PRECACHE_URLS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache partial fail:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선, 실패 시 캐시 반환 (항상 최신 버전 우선)
self.addEventListener('fetch', event => {
  // Google API, OAuth 요청은 캐시 안 함
  const url = event.request.url;
  if (
    url.includes('googleapis.com') ||
    url.includes('accounts.google.com') ||
    url.includes('fonts.gstatic.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 유효한 응답이면 캐시에 저장
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 오프라인이면 캐시에서 반환
        return caches.match(event.request);
      })
  );
});

// 새 SW 설치 시 클라이언트에 업데이트 알림 전송
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
      });
    })
  );
});
