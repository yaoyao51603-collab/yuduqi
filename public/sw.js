/* 纸间离线缓存：安装时预缓存构建产物，导航请求网络优先、离线回退到应用外壳。 */
const CACHE_NAME = 'zhijian-shell-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(SHELL).catch(() => undefined)
      try {
        const response = await fetch('./precache-manifest.json', { cache: 'no-store' })
        if (response.ok) {
          const assets = await response.json()
          if (Array.isArray(assets)) {
            await Promise.all(
              assets.map((asset) =>
                cache.add(asset).catch(() => undefined),
              ),
            )
          }
        }
      } catch {
        // 首次安装拿不到清单也不阻塞，运行时仍会缓存访问过的资源
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          await cache.put('./index.html', response.clone())
          return response
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            (await caches.match('./')) ||
            Response.error()
          )
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    })(),
  )
})
