# Next.js & Authentication — Lộ trình kiến thức

Bộ ghi chú học **Next.js 15 App Router** + **Auth (NextAuth v5 + JWT backend)** với ví dụ từ **Nova Shop** (`Nova-online-shopping`).

**Phong cách tài liệu** (theo [5. Data Fetching va Cache](./5.%20Data%20Fetching%20va%20Cache.md)):

- Giải thích **vấn đề → khái niệm → luồng Nova → FAQ**
- Sơ đồ mermaid, bảng so sánh, bài tập có đáp án gợi ý
- Link docs chính thức Next.js / Auth.js

---

## Mục lục tài liệu

| # | File | Nội dung | Độ sâu |
|---|------|----------|--------|
| **0** | [Mapping & Best Practices](./0.%20Next.js%20Official%20Docs%20Mapping%20va%20Best%20Practices.md) | Đối chiếu docs chính thức vs Nova | Tra cứu |
| 0b | [App Router.md](./App%20Router.md) | Prefetch `<Link>` (ngắn) | Bổ trợ |
| 1 | [App Router — Chi tiết](./1.%20App%20Router%20-%20Chi%20tiet.md) | Routing, layout, searchParams, error | ★★★ |
| 2 | [Server vs Client](./2.%20Server%20va%20Client%20Components.md) | RSC, composition, khi nào `"use client"` | ★★★ |
| 3 | [Server Actions](./3.%20Server%20Actions.md) | `"use server"`, form, revalidate | ★★★ |
| 4 | [Route Handlers](./4.%20Route%20Handlers.md) | Stripe, webhook, NextAuth API | ★★★ |
| **5** | **[Data Fetching & Cache](./5.%20Data%20Fetching%20va%20Cache.md)** | **Mẫu chuẩn:** cache, tag, path, refresh, **segment config (§13)** | ★★★★ |
| 6 | [Middleware](./6.%20Middleware.md) | `matcher`, `authorized`, dual cookie | ★★★ |
| 7 | [Authentication — Tổng quan](./7.%20Authentication%20-%20Tong%20quan.md) | AuthN/AuthZ, token, OAuth | ★★★ |
| 8 | [NextAuth v5](./8.%20NextAuth%20v5.md) | Providers, callbacks, session | ★★★ |
| 9 | [JWT & Dual Auth](./9.%20JWT%20Cookies%20va%20Dual%20Auth.md) | `authFetch`, refresh, cookies | ★★★ |
| 10 | [Nova Shop — Đọc code](./10.%20Vi%20du%20Nova%20Shop.md) | Map file + 4 luồng end-to-end | ★★★ |
| — | [SEO.md](./SEO.md) | Metadata, JSON-LD (chủ đề riêng) | ★★ |

---

## Lộ trình học (khuyến nghị)

```text
Tuần 1 — Nền App Router
  1 → 2 → 5 (mục 1–4: fetch cơ bản)

Tuần 2 — Mutation & API
  3 → 4 → 5 (mục 5–8: revalidate)

Tuần 3 — Auth
  7 → 8 → 9 → 6

Tuần 4 — Thực hành
  10 (đọc code Nova song song)
  0 (tra cứu gap khi review)
```

**Một ngày crash course:** 1 → 2 → 5 → 3 → 6 → 8 → 9 → 10.

---

## Tài liệu chính thức

- [Next.js Docs](https://nextjs.org/docs) · [llms.txt index](https://nextjs.org/docs/llms.txt)
- [Next.js 15](https://nextjs.org/blog/next-15)
- [Caching](https://nextjs.org/docs/app/guides/caching)
- [Authentication](https://nextjs.org/docs/app/guides/authentication)
- [Auth.js](https://authjs.dev/)

---

## Cấu trúc Nova Shop (tóm tắt)

```text
app/(shop)/          → catalog, cart (ShopShell)
app/api/             → Stripe, NextAuth
app/lib/services/    → getProducts, addToCart, ...
middleware.ts        → bảo vệ /products, /cart
auth.ts + auth-tokens.ts → dual auth
```

Chi tiết: [10. Vi du Nova Shop](./10.%20Vi%20du%20Nova%20Shop.md)
