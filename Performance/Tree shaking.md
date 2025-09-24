# Tree Shaking là gì? Giải thích chi tiết

**Tác giả:** @Tranloi2k  
**Ngày tạo:** 2025-09-24  
**Mô tả:** Giải thích về kỹ thuật tree shaking, cách hoạt động, lợi ích và lưu ý khi sử dụng với Webpack và các bundler hiện đại.

---

## 1. Tree Shaking là gì?

**Định nghĩa:**  
Tree Shaking là kỹ thuật loại bỏ (shake out) các mã nguồn (code) không sử dụng (unused code) khỏi bundle cuối cùng khi build ứng dụng web. Điều này giúp giảm kích thước file JS, tối ưu hiệu năng tải trang.

**Tên "tree shaking"** xuất phát từ ý tưởng "lắc cái cây", chỉ giữ lại những nhánh (code) cần thiết, loại bỏ phần không dùng.

---

## 2. Tree Shaking hoạt động như thế nào?

- Dựa vào cơ chế **import/export kiểu ES Module (import/export)** để phân tích các phần code nào thực sự được sử dụng.
- Khi build, các bundler như **Webpack**, **Rollup**, **Vite** sẽ:
    - Quét toàn bộ dependency graph của dự án.
    - Tìm các hàm, biến, module nào không được import hoặc sử dụng ở đâu cả.
    - Loại bỏ toàn bộ code đó khỏi bundle cuối cùng.

**Quan trọng:**  
Tree shaking **chỉ hoạt động tốt với ES Module** (`import`/`export`).  
Nếu dùng CommonJS (`require`, `module.exports`), tree shaking sẽ gặp nhiều hạn chế.

---

## 3. Lợi ích của Tree Shaking

- **Giảm kích thước bundle:** Loại bỏ các module, hàm, biến không dùng.
- **Tăng tốc độ tải trang:** File JS nhỏ hơn, trình duyệt tải và parse nhanh hơn.
- **Tối ưu hiệu năng:** Giảm bộ nhớ và tài nguyên cần dùng khi chạy app.

---

## 4. Ví dụ về tree shaking

**Module utils.js:**
```js
// utils.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
```

**Dùng trong app.js:**
```js
import { add } from './utils';
// Chỉ dùng hàm add
console.log(add(2, 3));
```
=> Khi build với Webpack/Rollup/Vite, **hàm subtract sẽ bị loại khỏi bundle**, chỉ hàm add được giữ lại.

---

## 5. Lưu ý khi sử dụng Tree Shaking

- **Chỉ hoạt động với ES Module (import/export).**
- Không hoạt động tốt với các side-effect imports hoặc CommonJS.
- Đảm bảo các thư viện bạn dùng hỗ trợ ES Module để tree shaking hiệu quả.
- Tránh viết code có side effect ở ngoài module scope, vì sẽ không bị loại bỏ.
- Có thể kiểm tra hiệu quả tree shaking qua báo cáo bundle (Webpack Bundle Analyzer).

**Ví dụ về side-effect (không bị tree shake):**
```js
// module.js
export function foo() {}
console.log('Side effect ở ngoài scope'); // Dù không import, dòng này vẫn nằm trong bundle
```

---

## 6. Cấu hình Tree Shaking trong Webpack

Webpack hỗ trợ tree shaking mặc định khi ở chế độ `production` và code dùng ES Module.

**webpack.config.js:**
```js
module.exports = {
  mode: 'production', // tự động bật tree shaking
  // Có thể cấu hình thêm cho tối ưu
  optimization: {
    usedExports: true
  }
};
```

---

## 7. Tổng kết

Tree Shaking là một kỹ thuật tối ưu hoá cực kỳ quan trọng giúp loại bỏ mã thừa khi build ứng dụng web hiện đại. Hãy viết code sử dụng ES Module, tránh side-effect không cần thiết để tận dụng tối đa tree shaking!
