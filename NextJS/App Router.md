# App Router — Điều hướng & Prefetch (bổ trợ)

Phần ngắn về **`<Link>`** và prefetch. Hướng dẫn **đầy đủ** routing, layout, `searchParams`, `error.tsx` → **[1. App Router — Chi tiết](./1.%20App%20Router%20-%20Chi%20tiet.md)**.

**Docs:** [Routing](https://nextjs.org/docs/app/getting-started/routing) · [Link](https://nextjs.org/docs/app/api-reference/components/link)

---

## Code splitting theo route

Next.js **tự chia bundle theo route segment** — khác SPA load hết app lần đầu.

```text
User mở /           → chỉ JS cho /
User click /products → load thêm chunk /products
```

---

## `<Link>` và prefetch

```tsx
import Link from "next/link";

<Link href="/products">Shop</Link>
```

| Hành vi | Chi tiết |
|---------|----------|
| Client navigation | Không full page reload |
| Prefetch (production) | Khi link vào viewport, Next.js prefetch route trong nền |
| Kết quả | Click gần như tức thì |

**So với `<a href>`:** `<a>` luôn full reload (trừ khi intercept thủ công).

---

## Khi nào dùng `router.push`?

```tsx
"use client";
import { useRouter } from "next/navigation";

const router = useRouter();
router.push("/products?category=smartphones");
```

Nova: `product-toolbar.tsx` đổi filter bằng cách **cập nhật URL** `searchParams` — share được state, back/forward đúng.

---

## Liên quan Nova Shop

| Pattern | File |
|---------|------|
| Link catalog | `navbar.tsx`, `storefront-hero.tsx` |
| URL filter | `product-toolbar.tsx` + `product-filters.ts` |
| Dynamic slug | `products/[slug]/page.tsx` |

**Đọc tiếp:** [1. App Router — Chi tiết](./1.%20App%20Router%20-%20Chi%20tiet.md) · [10. Nova Shop](./10.%20Vi%20du%20Nova%20Shop.md)
