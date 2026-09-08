
import PWASettings from './pwa.js';

/*
- Cache size
const quota = await navigator.storage.estimate();
const percentUsed = quota.usage / quota.quota;
if (percentUsed > 0.8) // prune cache

- Cache management
consider separate named caches for different asset types so you can apply different
size limits and expiry policies to each, and clear one without affecting the others.

- Cache expiry
const headers = new Headers(response.headers);
headers.append('sw-cached-at', Date.now().toString());
cache.put(request, new Response(response.body, { headers }));
// Then check it on retrieval and treat stale entries as cache misses.

- Background sync
The frontend registers a sync tag when a request fails, and the service worker replays it when online.
*/

function getCache(url,accept) {
    const compare = path => {
		const string = path.replace('./','/');
		return path.endsWith(string)
	};
	switch (true) {
		case PWASettings.static.urls.some(compare):
			return PWASettings.static;
		case accept.includes('text/html'):
			return PWASettings.pages;
		case accept.includes('image/'):
		case /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname):
			return PWASettings.images;
		default:
			return PWASettings.static;
	}
}


const strategies = {
	// try network, fall back to cache. Good for HTML pages where freshness matters
	networkFirst: async function(request,settings) {
		const cache = await caches.open(settings.cache);
	    try {
	        const response = await fetch(request);
			const clone = response.clone();
	        cache.put(request,clone);
			await this.pruneCache(settings);
	        return response;
	    } catch {
			const cached = await caches.match(request);
	        return cached ?? caches.match('/offline.html');
	    }
	},
	// serve from cache, fall back to network. Good for static assets that rarely change
	cacheFirst: async function(request,settings) {
		const cached = await caches.match(request);
	    if (cached) return cached;
	    const response = await fetch(request);
	    const cache = await caches.open(settings.cache);
		const clone = response.clone();
	    cache.put(request,clone);
		await this.pruneCache(settings);
	    return response;
	},
	// serve cache immediately, then update cache in background. Good balance for most assets
	staleWhileRevalidate: async function(request,settings) {
		const cache = await caches.open(settings.cache);
	    const cached = await caches.match(request);
		const addToCache = response => {
			const clone = response.clone();
	        cache.put(request,clone);
			await this.pruneCache(settings);
	        return response;
		};
		const fetchPromise = fetch(request).then(addToCache);
	    return cached ?? await fetchPromise;
	},
	// call it after each cache.put
	pruneCache: async function(settings) {
		if (settings.limit > 0) {
			const cache = await caches.open(settings.cache);
	        const keys = await cache.keys();
			if (keys.length > settings.limit) {
	            const toDelete = keys.slice(0, keys.length - settings.limit);
				const clear = key => cache.delete(key);
				const promises = toDelete.map(clear);
	            await Promise.all(promises);
	        }
		}
    }
}

async function handleEvents(event) {
	let response;
	switch (event.type) {
		case 'activate':
			// When a service worker is initially registered, pages won't use it until they next load.
			// The claim() method causes those pages to be controlled immediately.
			// There's a latency cost as the service worker has to start up before the fetch begins.
			// Navigation preload lets the network request start in parallel with worker startup.
			console.log('SW: send "claim" message to the clients.');
			const promises = [
				self.clients.claim(),
				self.registration.navigationPreload?.enable()
			]
			const promise = Promise.all(promises);
			event.waitUntil(promise);
			break;
		case 'fetch':
			const url = new URL(event.request.url);
			const accept = event.request.headers.get('Accept') || '';
			const settings = getCache(url,accept);
			switch (true) {
				case event.request.method !== 'GET':
				//case url.pathname.startsWith('/api/'):
					return;
				case accept.includes('text/html'):
					// HTML pages — network first for freshness
					const preloaded = await event.preloadResponse?.catch(() => null);
					if (preloaded) {
						return preloaded;
					}
					response = strategies.networkFirst(event.request,settings);
					break;
				case url.origin === self.location.origin:
					// Your own static assets — cache first
					response = strategies.cacheFirst(event.request,settings);
					break;
				default:
					// Third party requests — stale while revalidate
					response = strategies.staleWhileRevalidate(event.request,settings);
			}
			event.respondWith(response);
			break;
		case 'install':
			//self.skipWaiting(); // activate immediately without waiting for old worker to die

			// Load and store required static resources on installation
			console.log('SW: cache app shell on install.');
			const cache = await self.caches.open(PWASettings.cache);
			const errors = reason => console.log(url+' failed: '+reason);
			const addURLs = url => cache.add(url).catch(errors);
			// Load all resources at the same time (parallel)
			const promises = PWASettings.files.map(addURLs);
			const cached = Promise.all(promises);
			// Wait until all static files will be cached
		    event.waitUntil(cached);
			break;
		case 'sync':
			if (event.tag === 'submit-form') {
				const promise = replayQueuedRequests();
				event.waitUntil(promise);

				const clients = await self.clients.matchAll();
				const message = { type: 'SYNC_COMPLETE' };
				const post = client => client.postMessage(message);
				clients.forEach(post);
			}
			break;
		/*case 'periodicsync': // currently Chromium-only
			if (event.tag === 'refresh-content') {
				const promise = refreshCachedPages();
				event.waitUntil(promise);
			}
			break;*/
		case 'push':
			// Requires backend support (Web Push protocol) and user permission.
			const data = event.data.json();
			const options = {
	            body: data.body,
	            icon: './graphics/favicon.svg'
	        }
			const promise = self.registration.showNotification(data.title,options);
			event.waitUntil(promise);
			break;
	}
}

self.addEventListener('activate',handleEvents);
self.addEventListener('fetch',handleEvents);
self.addEventListener('install',handleEvents);
self.addEventListener('sync',handleEvents);
//self.addEventListener('periodicsync',handleEvents);
self.addEventListener('push',handleEvents);
