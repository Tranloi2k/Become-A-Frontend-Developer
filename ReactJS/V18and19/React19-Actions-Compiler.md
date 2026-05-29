---
title: React 19 - Actions, Compiler, ref-as-prop, use(), Native Metadata
---

## 1) Actions: chuẩn hóa cách xử lý async (submit form, gọi API)

### Định nghĩa (tư duy cốt lõi)

React 19 đưa ra cách làm “trơn tru” hơn cho các tác vụ async như:

- Submit form (server mutations)
- Gọi API để thay đổi dữ liệu
- Các thao tác bất đồng bộ có trạng thái (pending/success/error)

Thay vì bạn tự dựng nhiều state thủ công (`isLoading`, `error`, `success`…), bạn dùng **Actions** + các hook liên quan để React xử lý luồng cập nhật.

---

## 2) `useActionState` (trạng thái từ action async)

### Vai trò

`useActionState` giúp quản lý state phát sinh từ một action bất đồng bộ, thường gặp ở trường hợp form submission:

- Bạn nhận về trạng thái hiện tại (ví dụ: data trả về hoặc lỗi).
- React quản lý pending state.
- Bạn nhận “form action” để cắm vào `<form action={...}>`.

### Cú pháp (mang tính mô tả)

```jsx
const [state, formAction, isPending] = useActionState(actionFn, initialState);
```

### Ví dụ: Submit form với `useActionState`

```jsx
"use client";

import { useActionState } from "react";

async function loginAction(prevState, formData) {
  const email = formData.get("email");

  // ví dụ: gọi API server-side / route handler
  const res = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) return { error: "Login failed" };
  return { error: null, message: "Logged in successfully" };
}

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    { error: null, message: null }
  );

  return (
    <form action={formAction}>
      <input name="email" type="email" placeholder="Email" required />

      <button disabled={isPending}>
        {isPending ? "Đang xử lý..." : "Login"}
      </button>

      {state?.error && <p style={{ color: "red" }}>{state.error}</p>}
      {state?.message && <p>{state.message}</p>}
    </form>
  );
}
```

### Giải thích

- `actionFn` nhận `prevState` (state trước) và `formData`.
- React sẽ điều phối việc gọi action và cập nhật UI theo kết quả.

---

## 3) `useFormStatus` (pending/error status cho component con trong `<form>`)

### Vai trò

`useFormStatus` cho phép component con (nằm bên trong cây của `<form>`) đọc trạng thái của form đó:

- `pending`: đang submit chưa
- `data`, `method`, `action`: tùy môi trường/renderer cung cấp

Điểm quan trọng: `useFormStatus` dùng để tránh “prop drilling” cho trạng thái submit.

### Ví dụ: Button con biết pending qua `useFormStatus`

```jsx
"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Đang gửi..." : "Gửi"}
    </button>
  );
}

export default function CreatePostForm({ formAction }) {
  return (
    <form action={formAction}>
      <input name="title" placeholder="Tiêu đề" />
      <SubmitButton />
    </form>
  );
}
```

---

## 4) `useOptimistic` (Optimistic UI)

### Định nghĩa

`useOptimistic` giúp bạn hiển thị UI “lạc quan” trong khi action bất đồng bộ đang chạy:

- Hiển thị ngay kết quả kỳ vọng (optimistic state).
- Khi server trả về thật, React sẽ reconcile lại về state thật.
- Nếu server thất bại, bạn quay về state cũ (rollback theo cơ chế của hook).

### Vai trò / use-cases

- Nút Like/Un-like
- Thêm vào giỏ hàng
- Tạo comment và hiển thị ngay lập tức trước khi server confirm

### Ví dụ: Like bài viết

```jsx
"use client";

import { useOptimistic } from "react";

async function likeAction(postId) {
  const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
  if (!res.ok) throw new Error("Like failed");
  return res.json(); // ví dụ: { liked: true, likeCount: 123 }
}

export default function LikeButton({ postId, liked, likeCount }) {
  const [optimisticState, addOptimistic] = useOptimistic(
    { liked, likeCount },
    (currentState, _postId) => ({
      ...currentState,
      liked: !currentState.liked,
      likeCount: currentState.liked
        ? currentState.likeCount - 1
        : currentState.likeCount + 1,
    })
  );

  async function onClick() {
    // Hiển thị ngay (optimistic)
    addOptimistic(postId);

    // Chạy action thật (nếu lỗi, rollback theo cơ chế của hook)
    await likeAction(postId);
  }

  return (
    <button onClick={onClick}>
      {optimisticState.liked ? "Liked" : "Like"} ({optimisticState.likeCount})
    </button>
  );
}
```

---

## 5) React Compiler (tự memo hóa ở build-time)

### Định nghĩa

React Compiler là một công cụ build-time (thường là plugin cho build tool/Babel) phân tích code và **tự động tối ưu hóa memoization** (tương đương với việc bạn viết `useMemo`, `useCallback`, hoặc `React.memo` đúng chỗ).

Điểm mấu chốt: bạn không “viết lại” logic, compiler tối ưu dựa trên phân tích tĩnh và Rules of React.

### Vai trò / lợi ích

- Giảm boilerplate thủ công quanh `useMemo`/`useCallback`.
- Giảm nguy cơ memo sai dependency (hoặc quên memo hóa).
- Nhắm tới hiệu năng bằng cách hạn chế re-render không cần thiết.

### Giới hạn thực tế

- Nó tối ưu tốt nhất khi code của bạn tuân thủ các nguyên tắc: không đột biến/side effect trong render, giữ referential expectations, v.v.
- Bạn vẫn nên profile khi có bottleneck thật.

---

## 6) “Tạm biệt forwardRef”: `ref` như một prop thường

### Định nghĩa

Trong React 19, `ref` có hướng tiếp cận đơn giản hơn: function component có thể **nhận `ref` như prop bình thường**.

Vì thế `forwardRef` trở nên ít cần thiết và được đánh dấu là deprecated.

### Ví dụ: thay `forwardRef` bằng `ref` prop

Trước (React 18):

```jsx
import { forwardRef } from "react";

const MyInput = forwardRef(function MyInput(props, ref) {
  return <input ref={ref} {...props} />;
});
```

Sau (React 19):

```jsx
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

### Giải thích

- Function component nhận `ref` từ parent.
- Bạn pass trực tiếp `ref` xuống DOM node (hoặc component con nào đó chấp nhận `ref`).

---

## 7) `use()` (API đọc Promise/Context trong render)

### Định nghĩa

`use()` là một API mới trong React 19 để đọc giá trị từ:

- **Promise**: React sẽ “suspend” cho đến khi promise resolve (kết hợp `Suspense`).
- **Context**: tương tự `useContext`, nhưng linh hoạt hơn vì có thể gọi ở conditional/loop.

Điểm quan trọng: `use` **không phải** “hook” theo nghĩa Rules of Hooks truyền thống, nên bạn có thể gọi nó bên trong `if`/loop (và nó vẫn chạy trong render).

### Ví dụ: `use(promise)` kết hợp Suspense

```jsx
import { Suspense, use } from "react";

function User({ userPromise }) {
  const user = use(userPromise); // pending => suspend
  return <div>{user.name}</div>;
}

export default function UserPage({ userPromise }) {
  return (
    <Suspense fallback={<div>Đang tải user...</div>}>
      <User userPromise={userPromise} />
    </Suspense>
  );
}
```

### Ví dụ: `use(context)` trong điều kiện

```jsx
import { use } from "react";

function ConditionalTheme({ show }) {
  if (!show) return null;

  const theme = use(ThemeContext);
  return <div style={{ color: theme.primary }}>Theme!</div>;
}
```

### Lưu ý quan trọng

- Promise truyền vào `use(promise)` nên **được giữ ổn định** (stable) giữa các lần render; nếu promise mới liên tục, UI có thể suspend liên tục.
- Nếu promise reject, bạn cần `Error Boundary` gần đó để hiển thị UI lỗi.
- Không dùng `use()` trong event handlers tuỳ tiện; nó phục vụ cho render flow.

---

## 8) Native metadata: viết `<title>`, `<meta>`, `<link>` trong component

### Định nghĩa

React 19 hỗ trợ bạn render các thẻ metadata trực tiếp trong component tree (ví dụ `title`, `meta`, `link`), và React sẽ **hoist** chúng vào `<head>`.

### Vai trò

- Giảm nhu cầu thư viện kiểu `react-helmet` trong nhiều trường hợp phổ biến.
- Làm metadata hoạt động “tự nhiên” với SSR và streaming.

### Ví dụ

```jsx
export default function ProductPage({ product }) {
  return (
    <>
      <title>{product.name} | My Store</title>
      <meta name="description" content={product.summary} />
      <link rel="canonical" href={`https://example.com/products/${product.slug}`} />
      <h1>{product.name}</h1>
    </>
  );
}
```

### Giải thích

- React tự đẩy các thẻ đó vào `<head>`.
- Nếu nhiều metadata cùng xuất hiện, cần nắm rule “thẻ nào thắng” theo tree/renderer của framework bạn dùng.

---

## 9) Tóm tắt nhanh React 18 vs React 19

- React 18 tập trung vào **Concurrency Rendering**:
  - Automatic Batching
  - Transitions (`useTransition`, `useDeferredValue`)
  - Suspense + Streaming SSR

- React 19 tập trung vào **Developer Experience & Async/UI primitives**:
  - Actions + `useActionState`, `useFormStatus`
  - `useOptimistic` cho optimistic UI
  - React Compiler tự memo hóa ở build-time
  - `ref` như prop bình thường, giảm boilerplate `forwardRef`
  - `use()` đọc Promise/Context trong render
  - Native metadata hoist vào `<head>`

