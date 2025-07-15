const CACHE_NAME = "studysphere-v1.0.0";
const STATIC_CACHE_NAME = "studysphere-static-v1.0.0";
const API_CACHE_NAME = "studysphere-api-v1.0.0";

// Define what to cache
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/attendance",
  "/assignments",
  "/login",
  "/signup",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// API endpoints to cache
const API_ENDPOINTS = [
  "/api/dashboard",
  "/api/lectures",
  "/api/attendance",
  "/api/assignments",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ]),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== CACHE_NAME
            ) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ]),
  );
});

// Fetch event - handle network requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests (assets, etc.)
  event.respondWith(handleAssetRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME)
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (request.method === "GET" && networkResponse.ok) {
  cache.put(request, networkResponse.clone());
}


    return networkResponse;
  } catch (error) {
    console.log("Service Worker: Network failed, trying cache for API request");

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for failed API calls
    return new Response(
      JSON.stringify({ error: "Offline - please check your connection" }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log("Service Worker: Network failed, serving cached app shell");

    // Fallback to cached app shell
    const cache = await caches.open(STATIC_CACHE_NAME);
    return cache.match("/") || cache.match("/index.html");
  }
}

// Handle asset requests with cache-first strategy
async function handleAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("Service Worker: Failed to fetch asset", request.url);

    // For images, return a placeholder
    if (request.destination === "image") {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Offline</text></svg>',
        { headers: { "Content-Type": "image/svg+xml" } },
      );
    }

    throw error;
  }
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag);

  if (event.tag === "attendance-sync") {
    event.waitUntil(syncAttendanceData());
  }

  if (event.tag === "assignment-sync") {
    event.waitUntil(syncAssignmentData());
  }
});

// Sync attendance data when back online
async function syncAttendanceData() {
  try {
    // Implementation for syncing cached attendance data
    console.log("Service Worker: Syncing attendance data");
    // This would sync any offline attendance data when connection is restored
  } catch (error) {
    console.error("Service Worker: Failed to sync attendance data", error);
  }
}

// Sync assignment data when back online
async function syncAssignmentData() {
  try {
    // Implementation for syncing cached assignment data
    console.log("Service Worker: Syncing assignment data");
    // This would sync any offline assignment data when connection is restored
  } catch (error) {
    console.error("Service Worker: Failed to sync assignment data", error);
  }
}

// Handle push notifications (for future features)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push notification received");

  const options = {
    body: event.data
      ? event.data.text()
      : "You have new updates in StudySphere",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open StudySphere",
        icon: "/icons/icon-192x192.png",
      },
      {
        action: "close",
        title: "Close notification",
        icon: "/icons/icon-192x192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("StudySphere", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked");

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
