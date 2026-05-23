> **Bộ tài liệu đầy đủ:** xem [README.md](./README.md) và [1. App Router - Chi tiet.md](./1.%20App%20Router%20-%20Chi%20tiet.md) cho routing, layouts, dynamic routes, searchParams.

# I. Navigating Between Pages

**Next.js automatically code splits your application by route segments**. This is different from a traditional React SPA, where the browser loads all your application code on the initial page load.

**In production, whenever <Link> components appear in the browser's viewport, Next.js automatically prefetches the code for the linked route in the background**. By the time the user clicks the link, the code for the destination page will already be loaded in the background, and this is what makes the page transition near-instant!
