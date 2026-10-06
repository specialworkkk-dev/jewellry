export const dynamic = "force-dynamic";

const deploymentVersion = (
  process.env.VERCEL_DEPLOYMENT_ID
  || process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.NEXT_DEPLOYMENT_ID
  || "local-development"
).slice(0, 40);

function serviceWorkerSource(version: string) {
  return `
const CACHE_PREFIX = "luxestore-";
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = typeof data.title === "string" ? data.title : "LuxeStore update";
  const requestedUrl = typeof data.url === "string" ? data.url : "/";
  const target = new URL(requestedUrl, self.location.origin);
  const safeUrl = target.origin === self.location.origin
    ? target.pathname + target.search + target.hash
    : "/";

  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === "string" ? data.body : "A shop you follow has an update.",
    icon: typeof data.icon === "string" ? data.icon : "/icon-192.png",
    badge: typeof data.badge === "string" ? data.badge : "/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag : "luxestore-update",
    renotify: true,
    data: { url: safeUrl },
    actions: [{ action: "view", title: "View update" }],
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";
  const absoluteUrl = new URL(requestedUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("navigate" in client) client.navigate(absoluteUrl);
        return "focus" in client ? client.focus() : undefined;
      }
      return self.clients.openWindow ? self.clients.openWindow(absoluteUrl) : undefined;
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isPrivatePath = url.pathname.startsWith("/api/")
    || url.pathname.startsWith("/admin")
    || url.pathname.startsWith("/dashboard")
    || url.pathname.startsWith("/login")
    || url.pathname.startsWith("/register");

  if (!isSameOrigin || isPrivatePath) return;

  if (request.mode === "navigate") {
    const isPublicPage = url.pathname === "/" || url.pathname.startsWith("/shop/");
    if (!isPublicPage) return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  const cacheableDestinations = new Set(["image", "style", "script", "font"]);
  if (!cacheableDestinations.has(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
`;
}

export function GET() {
  return new Response(serviceWorkerSource(deploymentVersion), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'",
      "Service-Worker-Allowed": "/",
    },
  });
}
