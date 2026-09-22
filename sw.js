const CACHE='aurevia-platform-v15';
const ASSETS=['/','/index.html','/login.html','/register.html','/terms.html','/privacy.html','/deposit.html','/history.html','/trades.html','/withdraw.html','/withdraw-history.html','/profile.html','/upgrade.html','/password.html','/settings.html','/notifications.html','/help.html','/logout.html','/markets.html','/assets/css/base.css','/assets/css/dashboard.css','/assets/css/admin.css','/assets/js/app.js','/assets/js/admin.js','/assets/js/data.js','/assets/images/aurevia-logo-3d.png','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET') return;
 const url=new URL(event.request.url);
 if(url.pathname.startsWith('/api/')) return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&url.origin===location.origin){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response}).catch(()=>caches.match('/index.html'))));
});
