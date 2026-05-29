---
title: React 18 - Concurrency (Automatic Batching, Transitions, Suspense Streaming SSR)
---

## 1) Concurrent Rendering là gì? Khác React cũ ở đâu?

### Định nghĩa (ngắn gọn)

**Concurrent Rendering** (render đồng thời / render có thể bị ngắt) là chế độ React có thể **bắt đầu render một phiên bản UI mới**, **tạm dừng** nếu có việc quan trọng hơn (gõ phím, click), rồi **tiếp tục hoặc bỏ** công việc cũ — thay vì chạy một lượt render “từ đầu đến cuối” và **khóa main thread** cho đến khi xong.

> Lưu ý từ vựng: **Concurrency** ở đây **không** có nghĩa React chạy nhiều thread song song (multi-threading). React vẫn chạy trên **một main thread**; “đồng thời” nghĩa là React **xen kẽ** nhiều luồng công việc render theo **độ ưu tiên**.

### React “cũ” render như thế nào?

Trước khi hiểu React 18, cần tách **3 thế hệ** (đừng nhầm “React cũ” = chỉ React 15):

| Thế hệ | API root | Đặc điểm render |
| --- | --- | --- |
| **React ≤ 15** | `ReactDOM.render` | Thuật toán **Stack Reconciler**: đi cây component **một mạch**, khó tách nhỏ, khó pause. |
| **React 16–17** | `ReactDOM.render` (legacy) | Đã có **Fiber** (đơn vị công việc nhỏ), nhưng mặc định vẫn **render đồng bộ** — một update thường chạy hết render + commit trước khi làm việc khác. |
| **React 18+** | `createRoot().render()` | **Concurrent features bật mặc định**: render có thể **interruptible**, ưu tiên theo **lanes**, batching rộng hơn. |

**Hành vi “cũ” mà dev hay gặp (legacy / synchronous mindset):**

1. User click hoặc gõ phím → `setState`.
2. React **render toàn bộ cây** liên quan **liên tục** trên main thread.
3. Khi render xong → **commit** (ghi DOM) **một lần**.
4. Trong lúc bước 2–3, nếu cây lớn → UI **đơ**, input **trễ**.

```text
[Update] ──► [Render phase: chạy hết, không dừng] ──► [Commit phase] ──► [Màn hình cập nhật]
                    ↑
            Main thread bị chiếm lâu
```

### React 18 thay đổi gì ở “tầng nhìn thấy được”?

| Khía cạnh | React cũ (legacy sync) | React 18 (Concurrent) |
| --- | --- | --- |
| **Khi render nặng** | Thường block đến khi xong | Có thể **yield** (nhường) cho input/animation giữa chừng |
| **Nhiều update liên tiếp** | Batching hạn chế (chủ yếu trong event React) | **Automatic batching** rộng hơn (Promise, `setTimeout`…) |
| **Update “không gấp”** | Vẫn tranh ưu tiên như update thường | `startTransition` / `useDeferredValue` → **lane ưu tiên thấp**, có thể bị cắt |
| **UI chưa xong** | Khó hiển thị trạng thái trung gian có kiểm soát | `Suspense` + `isPending` → fallback / UI cũ tạm thời |
| **SSR** | Thường chờ HTML full page | **Streaming SSR** — gửi shell trước, phần chậm sau |

**Điểm then chốt:** React 18 **không** thay đổi mô hình “component + state + props”. Nó thay đổi **cách Scheduler điều phối công việc render** sau khi state đổi.

### Cơ chế phía sau bị thay đổi / được “bật” ra sao?

#### 1) Fiber — nền tảng từ React 16, nhưng React 18 mới “dùng hết sức”

**Fiber** là đơn vị công việc nhỏ trong cây reconciler. Mỗi component tương ứng một **Fiber node**; React xử lý **từng node** thay vì “nuốt” cả cây một lần như Stack Reconciler.

Nhờ Fiber, React có thể:

- **Pause** giữa các node.
- **Resume** tiếp node kế.
- **Discard** cây work-in-progress nếu có update mới quan trọng hơn.

> Fiber có từ React 16; **Concurrent Rendering** là cách **bật chế độ** Fiber được phép interrupt + ưu tiên, qua `createRoot` và các API (`useTransition`, …).

#### 2) Hai phase: Render (có thể ngắt) vs Commit (không ngắt)

React luôn tách update thành 2 giai đoạn:

```text
                    RENDER PHASE                    COMMIT PHASE
              (pure, có thể bị interrupt)         (đồng bộ, atomic)
┌────────────────────────────────────────┐   ┌──────────────────────────┐
│ Gọi component → tạo React elements     │   │ Ghi DOM thật             │
│ Diff → quyết định thay đổi gì        │   │ Chạy layout effects      │
│ Không chạm DOM người dùng thấy       │   │ Chạy passive effects     │
└────────────────────────────────────────┘   └──────────────────────────┘
```

- **React cũ (sync):** Render phase chạy **một mạch** đến hết rồi mới commit.
- **React 18 (concurrent):** Render phase có thể **chia nhỏ (time slicing)** — làm một ít Fiber, kiểm tra còn thời gian không, nếu hết thì **nhường main thread** (để browser xử lý input, paint).

Commit phase **vẫn đồng bộ** — để người dùng không thấy UI “dở dang” (nửa list cũ nửa list mới trên DOM).

#### 3) Hai cây: Current vs Work-in-progress (double buffering)

React luôn duy trì:

- **Current tree** — khớp với những gì đang hiển thị.
- **Work-in-progress (WIP) tree** — bản nháp đang build trong render phase.

Khi render concurrent:

- User gõ tiếp → React có thể **bỏ WIP cũ**, clone từ Current, build WIP mới với state mới nhất.
- Chỉ khi WIP “thắng” (không bị urgent update chen ngang) → **swap** sang Current ở commit.

Đây là lý do React 18 có thể “chuẩn bị nhiều phiên bản UI” — thực chất là **bản nháp trong bộ nhớ**, không phải vẽ nhiều bản lên màn hình cùng lúc.

#### 4) Lanes — hệ thống ưu tiên update (React 18)

Thay vì mọi `setState` ngang hàng, React 18 gán mỗi update vào **lane** (bitmask ưu tiên):

- **Lane cao:** click, keyboard, hover cần phản hồi ngay.
- **Lane thấp:** update bọc trong `startTransition`, giá trị từ `useDeferredValue`.

Scheduler chọn lane **cao hơn** trước; lane thấp có thể **bị hoãn hoặc hủy** nếu lane cao xuất hiện.

```text
User gõ "a" (urgent lane)     ──► render input ngay
        │
        └── filter 10k items (transition lane) ──► bắt đầu render list
                    │
User gõ "ab" (urgent) ──► CẮT render list cũ ──► render input + list mới
```

#### 5) Time slicing — chia nhỏ công việc theo frame

**Time slicing** = Fiber + Scheduler hợp tác với browser:

- Mỗi “lát” render chỉ chạy trong **budget** thời gian ngắn (vài ms).
- Hết budget → `yield` → browser paint / xử lý event.
- Frame sau → tiếp tục Fiber kế.

→ Cảm giác “mượt” vì main thread không bị một render dài **monopolize** liên tục.

#### 6) `createRoot` — công tắc bật Concurrent Features

```jsx
// React 18+: concurrent features ON (mặc định cho cây này)
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")).render(<App />);

// Legacy (React 17 trở về trước): đã remove ở React 19
// ReactDOM.render(<App />, root);  // sync root, không có concurrent đầy đủ
```

Cùng một component, **root API khác** → hành vi Scheduler khác (có/không interrupt, batching async, Suspense data trên client, …).

### Một ví dụ “cùng code, khác cảm giác”

```jsx
// Không bọc transition: update vẫn có thể block nếu render nặng
setQuery(value);
setFiltered(heavyFilter(bigList, value)); // render list lớn ngay

// React 18 concurrent: đánh dấu phần nặng là non-urgent
setQuery(value); // urgent — input phản hồi ngay
startTransition(() => {
  setFiltered(heavyFilter(bigList, value)); // transition lane — có thể bị cắt
});
```

React cũ: cả hai `setState` vẫn chạy, nhưng **không có khái niệm lane** → render list nặng vẫn tranh main thread ngang với gõ phím.

React 18: `startTransition` báo Scheduler **“được phép hoãn / bỏ”** render list nếu user gõ tiếp.

### Tóm tắt: “phía sau” thay đổi cái gì?

| Tầng | React cũ (sync mindset) | React 18 Concurrent |
| --- | --- | --- |
| Reconciler | Stack (≤15) hoặc Fiber nhưng sync (16–17 legacy) | Fiber + **interruptible** render |
| Scheduling | Một update → chạy hết | **Lanes** + ưu tiên urgent/transition |
| Thời gian | Một khối liên tục | **Time slicing** / yield giữa các Fiber |
| Cây UI | Chủ yếu một nhánh WIP | **Current / WIP**, có thể discard WIP |
| DOM | Commit sau render sync | Commit vẫn atomic; render mới linh hoạt |
| API surface | `ReactDOM.render` | `createRoot` + Transitions + Suspense SSR |

### Liên hệ với các mục tiếp theo trong tài liệu này

Concurrent Rendering **không phải một API duy nhất** — nó là **nền**; các mục sau là cách bạn **tận dụng** nền đó:

- **Automatic Batching** — Scheduler gom update (ít render hơn).
- **Transitions** — bạn **gắn nhãn** update vào lane thấp (`useTransition`, `useDeferredValue`).
- **Suspense + Streaming SSR** — hiển thị / gửi HTML **từng phần** khi work chưa xong.

Xem thêm trong repo: `8. React Fiber.md`, `0. Reconciliation.md`.

---

## 2) Automatic Batching (Gom nhóm trạng thái tự động)

### Định nghĩa

Automatic Batching là cơ chế của React 18: bất kể bạn gọi `setState` liên tiếp ở đâu (trong Promise, `setTimeout`, event native…), React sẽ **tự động gom nhiều lần update** thành **một lần render** (hoặc ít lần render nhất có thể).

### Vai trò / vì sao quan trọng

- Giảm số lần render không cần thiết.
- Giảm “thrash” UI và cải thiện hiệu năng.
- Làm code async dễ chịu hơn: bạn không phải tự “hứa hẹn” rằng React sẽ batch hay không.

### So sánh nhanh

- **Trước React 18**: batching thường chỉ chắc chắn xảy ra trong phạm vi event handler của React.
- **React 18**: batching mở rộng ra hầu hết các ngữ cảnh (Promise/microtask, timer, native event…).

### Ví dụ

```jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

Trong React 18, bạn gọi nhiều lần setter liên tiếp trong cùng một “lần xử lý” sẽ thường được batch lại. Điều này càng hữu ích khi update nằm trong async boundary như:

```jsx
setTimeout(() => {
  setA(1);
  setB(2);
}, 0);
```

### Lưu ý quan trọng

- Batching **không làm cho state setter “đồng bộ theo kiểu bạn nghĩ”**. `setState` vẫn là hành vi **schedule** cập nhật.
- Nếu bạn cần tính toán dựa trên state trước đó, hãy dùng dạng **functional update** (`setX(prev => ...)`) để tránh stale closure.

---

## 3) Transitions (`useTransition` & `useDeferredValue`)

### Định nghĩa

Transitions là cơ chế giúp bạn tách cập nhật UI thành 2 nhóm:

- **Urgent (khẩn cấp)**: phải phản hồi ngay (gõ phím, click, input value).
- **Transition (không khẩn cấp)**: có thể chờ một chút (lọc danh sách, update kết quả tìm kiếm, chuyển tab hiển thị nội dung nặng…).

React sẽ ưu tiên render urgent trước, còn transition có thể bị trì hoãn hoặc bị “thay thế” bởi urgent update.

---

## 3.1) `useTransition`

### Vai trò

`useTransition` giúp bạn bao bọc các cập nhật “không khẩn cấp” bằng `startTransition(() => ...)` và lấy ra:

- `isPending`: đang ở trạng thái transition (thường dùng để hiển thị spinner/disable nhẹ).
- `startTransition`: hàm bọc cập nhật.

### Cú pháp

```jsx
const [isPending, startTransition] = useTransition();
```

### Ví dụ: Search với danh sách nặng

```jsx
import { useMemo, useState, useTransition } from "react";

function Search() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [isPending, startTransition] = useTransition();

  const bigData = useMemo(
    () => Array.from({ length: 10000 }, (_, i) => `Item ${i}`),
    []
  );

  function onChange(e) {
    // Urgent: cập nhật input text ngay
    setQuery(e.target.value);

    // Transition: lọc dữ liệu nặng có thể trì hoãn
    startTransition(() => {
      const q = e.target.value.toLowerCase();
      const filtered = bigData.filter((x) => x.toLowerCase().includes(q));
      setItems(filtered);
    });
  }

  return (
    <div>
      <input value={query} onChange={onChange} />
      {isPending && <div>Đang cập nhật kết quả…</div>}
      <ul>
        {items.slice(0, 20).map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Giải thích “đúng tinh thần”

- Input typing sẽ luôn “mượt” vì urgent update được ưu tiên.
- UI có thể hiển thị kết quả cũ trong thời gian transition, sau đó cập nhật khi ready.

---

## 3.2) `useDeferredValue`

### Định nghĩa

`useDeferredValue(value)` trả về một “bản deferred” của `value`, thường được dùng để **trì hoãn việc render** một phần UI nặng mà phụ thuộc vào `value`.

### Vai trò

- Giảm nặng cho cây component hiển thị danh sách/filtering.
- Khi user gõ nhanh, UI không bị block lâu bởi render dựa trên value đó.

### Ví dụ

```jsx
import { useDeferredValue, useMemo, useState } from "react";

function DeferredSearch({ bigData }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    return bigData.filter((x) => x.toLowerCase().includes(q));
  }, [bigData, deferredQuery]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {results.slice(0, 20).map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 4) Suspense trên Server (Streaming SSR)

### Định nghĩa

`Suspense` là cách bạn khai báo: “đoạn UI này có thể chưa sẵn sàng, hãy render fallback cho đến khi nó ready”.

Trong **SSR streaming**, React có thể:

1. Gửi HTML “shell” của trang ngay lập tức.
2. Với các phần “chậm” (component cần fetch/lazy/dữ liệu), React sẽ gửi tiếp phần HTML của chúng khi ready.

### Vai trò / lợi ích

- **Cải thiện thời gian thấy nội dung** (perceived performance).
- Tránh bắt người dùng chờ toàn bộ trang mới có UI.
- Phù hợp với các phần như: bình luận, danh sách sản phẩm, widget phụ…

### Ví dụ (conceptual)

```jsx
import { Suspense } from "react";

function Page() {
  return (
    <div>
      <h1>Shop</h1>
      <Suspense fallback={<div>Đang tải sản phẩm…</div>}>
        <ProductList /> {/* component “chậm” */}
      </Suspense>
    </div>
  );
}
```

Trong SSR streaming, fallback có thể xuất hiện trong HTML sớm, rồi phần thật sẽ được “stream” về sau.

### Giải thích “cần điều kiện gì?”

- Bạn cần framework/renderer hỗ trợ streaming SSR.
- Component bên trong `Suspense` phải “suspend” đúng cách (ví dụ: lazy/async data theo cơ chế Suspense của môi trường bạn dùng).

---

## 5) Checklist dùng concurrency đúng chỗ

- Nếu là input/click phải phản hồi nhanh: dùng urgent update bình thường.
- Nếu là render nặng dựa trên query/filter/compute: dùng `startTransition` hoặc `useDeferredValue`.
- Nếu là dữ liệu/khối UI chậm trên server: wrap bằng `<Suspense fallback=...>` để tận dụng streaming.

