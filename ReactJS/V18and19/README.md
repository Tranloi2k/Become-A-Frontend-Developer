---
title: V18and19 (React 18 vs React 19)
---

## Mục lục

1. `React18-Concurrency.md`
   - Automatic Batching
   - Transitions: `useTransition`, `useDeferredValue`
   - Suspense trên Server (Streaming SSR)

2. `React19-Actions-Compiler.md`
   - Actions + form handling: `useActionState`, `useFormStatus`
   - `useOptimistic` (optimistic UI)
   - React Compiler (tự memo hóa ở build-time)
   - forwardRef deprecate / `ref` như một prop bình thường
   - `use()` để đọc Promise/Context trong render
   - Native metadata: `title`, `meta`, `link` được hoist vào `<head>`

---

## Ghi chú

- Tài liệu này tập trung vào phần “định nghĩa - vai trò - ví dụ - giải thích” đúng theo yêu cầu.
- Nội dung ví dụ dùng JSX/React APIs phổ biến; tuỳ framework (Next.js/Remix/router) bạn có thể cần chỉnh chút cách wiring `form action` và SSR streaming.

