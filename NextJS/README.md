# Next.js & Authentication — Lộ trình kiến thức

Tài liệu này bổ sung cho `App Router.md` và `SEO.md`, tập trung vào **App Router (Next.js 15)**, **Server Actions**, **Middleware**, và **Authentication** (NextAuth v5 + JWT backend).

Các ví dụ tham chiếu từ dự án thực tế: **Nova Shop** (`Nova-online-shopping`) — e-commerce Next.js + API NestJS + Stripe.

---

## Mục lục

| # | File | Nội dung |
|---|------|----------|
| 0 | [App Router.md](./App%20Router.md) | Điều hướng, prefetch `<Link>` (có sẵn) |
| 1 | [1. App Router - Chi tiet.md](./1.%20App%20Router%20-%20Chi%20tiet.md) | Routing, layouts, route groups, dynamic routes |
| 2 | [2. Server va Client Components.md](./2.%20Server%20va%20Client%20Components.md) | RSC, `"use client"`, composition |
| 3 | [3. Server Actions.md](./3.%20Server%20Actions.md) | `"use server"`, forms, revalidate |
| 4 | [4. Route Handlers.md](./4.%20Route%20Handlers.md) | `app/api/*`, REST trong Next.js |
| 5 | [5. Data Fetching va Cache.md](./5.%20Data%20Fetching%20va%20Cache.md) | fetch, cache, `revalidatePath` |
| 6 | [6. Middleware.md](./6.%20Middleware.md) | `middleware.ts`, matcher, auth gate |
| 7 | [7. Authentication - Tong quan.md](./7.%20Authentication%20-%20Tong%20quan.md) | Session, JWT, OAuth, cookies |
| 8 | [8. NextAuth v5.md](./8.%20NextAuth%20v5.md) | Providers, callbacks, SessionProvider |
| 9 | [9. JWT Cookies va Dual Auth.md](./9.%20JWT%20Cookies%20va%20Dual%20Auth.md) | access/refresh, authFetch, pattern Nova Shop |
| 10 | [10. Vi du Nova Shop.md](./10.%20Vi%20du%20Nova%20Shop.md) | Map file → chức năng trong dự án |
| — | [SEO.md](./SEO.md) | SEO on-page, metadata (có sẵn) |

---

## Lộ trình học gợi ý

```text
React cơ bản
    ↓
1. App Router (routing, layouts)
    ↓
2. Server vs Client Components
    ↓
3. Data Fetching + Server Actions
    ↓
4. Route Handlers (API nội bộ, webhook)
    ↓
5. Middleware (bảo vệ route)
    ↓
7–9. Authentication (NextAuth + JWT backend)
    ↓
10. Đọc code Nova Shop end-to-end
```

---

## Tài liệu chính thức

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn — App Router](https://nextjs.org/learn)
- [Auth.js (NextAuth v5)](https://authjs.dev/)

---

## Cấu trúc thư mục App Router (tóm tắt)

```text
app/
├── layout.tsx          # Root layout (font, providers)
├── page.tsx            # /
├── (shop)/             # Route group — không ảnh hưởng URL
├── (dashboard)/
│   ├── layout.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   └── cart/page.tsx
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── checkout/route.ts
│   └── stripe/webhook/route.ts
└── lib/                # Services, utils (thường import từ app/)
```
