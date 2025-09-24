# Code Splitting là gì? Hướng dẫn chi tiết

**Tác giả:** @Tranloi2k  
**Ngày tạo:** 2025-09-24  
**Mô tả:** Giải thích về code splitting, lợi ích, cách sử dụng trong React/Webpack và các lưu ý thực tế.

---

## 1. Code Splitting là gì?

**Định nghĩa:**  
Code Splitting (chia nhỏ mã nguồn) là kỹ thuật chia ứng dụng thành nhiều phần (bundle) nhỏ, chỉ tải phần cần dùng tại thời điểm người dùng truy cập. Thay vì tải toàn bộ ứng dụng ngay từ đầu, code splitting giúp tối ưu tốc độ, giảm dung lượng tải về và nâng cao trải nghiệm người dùng.

---

## 2. Lợi ích của Code Splitting

- **Tăng tốc độ tải trang lần đầu:** Chỉ tải phần mã quan trọng, các phần còn lại tải khi cần.
- **Tiết kiệm băng thông:** Người dùng chỉ tải những phần họ truy cập.
- **Tối ưu hiệu năng:** Giảm lượng JS phải parse, thực thi, giúp trình duyệt mượt hơn.
- **Hỗ trợ lazy loading:** Kết hợp với lazy loading để tải component, module khi thực sự cần thiết.

---

## 3. Cách sử dụng Code Splitting trong React

### a. Component Level Spliting

Sử dụng React.lazy và Suspense

React cung cấp `React.lazy()` để tải động component khi cần, kết hợp với `Suspense` để hiển thị UI loading.

**Ví dụ:**
```jsx
import React, { Suspense, lazy } from 'react';

// Chia nhỏ component, chỉ tải khi render
const UserProfile = lazy(() => import('./UserProfile'));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Đang tải...</div>}>
        <UserProfile />
      </Suspense>
    </div>
  );
}
```

### b. Router-based Spliting

Code splitting với React Router

Chỉ tải từng page khi người dùng chuyển route.

**Ví dụ:**
```jsx
import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./Home'));
const Admin = lazy(() => import('./Admin'));

function App() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}
```

---

## 4. Code Splitting với Webpack (Chi tiết)

Webpack là công cụ phổ biến giúp chia nhỏ bundle hiệu quả. Dưới đây là các kỹ thuật code splitting chi tiết với Webpack:

### a. Dynamic spliting

Dynamic `import()` (Tách bundle ở runtime)

Webpack tự động tách code thành các bundle nhỏ khi bạn dùng cú pháp import động:

```js
// Chỉ tải module khi cần thiết
button.onclick = () => {
  import('./moduleA')
    .then(module => {
      module.doSomething();
    });
};
```
**Giải thích:**  
- Khi người dùng bấm nút, Webpack sẽ tạo ra một bundle riêng cho `moduleA` (thường có tên dạng `moduleA.[hash].js`) và chỉ tải khi cần, không nằm trong bundle chính.
- Có thể dùng với async/await:
  ```js
  async function loadModule() {
    const module = await import('./moduleA');
    module.doSomething();
  }
  ```

### b. Entry Points Spliting

Multiple Entry Points (Nhiều điểm vào)

Bạn có thể cấu hình nhiều entry points trong Webpack để tạo nhiều bundle cho các phần độc lập của ứng dụng (ví dụ: admin, user).

**webpack.config.js**
```js
module.exports = {
  entry: {
    main: './src/index.js',
    admin: './src/admin.js',
    landing: './src/landing.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: __dirname + '/dist'
  }
};
```
**Giải thích:**  
- Webpack sẽ tạo các file: `main.bundle.js`, `admin.bundle.js`, `landing.bundle.js`.
- Bạn chỉ cần load bundle phù hợp vào từng trang.

### c. SplitChunksPlugin (Tối ưu bundle chia sẻ)

Webpack cung cấp `optimization.splitChunks` để tự động chia nhỏ các module dùng chung (ví dụ: thư viện React, lodash) thành một bundle riêng.

**webpack.config.js**
```js
module.exports = {
  // ...các cấu hình khác
  optimization: {
    splitChunks: {
      chunks: 'all', // chia nhỏ cả async và sync chunks
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
```
**Giải thích:**  
- Các thư viện từ `node_modules` sẽ được đóng gói vào `vendors.js`.
- Các bundle nhỏ này được cache hiệu quả trên trình duyệt, giúp lần tải sau nhanh hơn.

### d. Prefetch & Preload

Webpack hỗ trợ directive magic comment để tối ưu tải trước các bundle khi cần:

```js
// Prefetch: Tải trước khi trình duyệt rảnh
import(/* webpackPrefetch: true */ './moduleA');

// Preload: Tải ngay khi có thể (ưu tiên cao)
import(/* webpackPreload: true */ './moduleB');
```
**Giải thích:**  
- Giúp tối ưu trải nghiệm người dùng, ví dụ preload admin khi user sắp chuyển sang trang quản trị.

### e. Kết hợp với React, React Router

Khi sử dụng code splitting trong React, Webpack sẽ tự động tạo các bundle nhỏ cho từng page/component khi dùng `React.lazy` hoặc import động.

---

## 5. Lưu ý khi dùng code splitting

- Luôn có UI loading (`fallback`) khi tải component động.
- Kiểm tra hiệu năng thực tế bằng công cụ như Lighthouse.
- Đảm bảo các phần quan trọng (critical JS) luôn được tải đầu tiên.
- Với SSR (Server Side Rendering), cần cấu hình thêm để hỗ trợ code splitting đúng cách.
- Tránh chia quá nhiều phần nhỏ dẫn đến nhiều request nhỏ liên tục.
- Tối ưu cache các bundle chung (vendors.js) để giảm tải cho lần truy cập sau.

---

## 6. Tổng kết

Code splitting là kỹ thuật quan trọng giúp tối ưu hóa tốc độ tải trang và trải nghiệm người dùng với ứng dụng web hiện đại. Trong React, nên kết hợp với lazy loading và Suspense để đạt hiệu quả tối đa! Với Webpack, hãy tận dụng các kỹ thuật như dynamic import, multi-entry, splitChunks... để chia bundle hợp lý cho dự án của bạn.
