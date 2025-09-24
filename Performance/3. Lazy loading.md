# Lazy Loading là gì?

---

## 1. Lazy Loading là gì?

**Định nghĩa:**  
Lazy Loading (tải lười biếng) là kỹ thuật chỉ tải hoặc khởi tạo tài nguyên (hình ảnh, dữ liệu, component, module...) khi thực sự cần thiết, thay vì tải tất cả ngay từ đầu. Điều này giúp cải thiện hiệu năng, giảm thời gian tải trang và tiết kiệm tài nguyên hệ thống.

---

## 2. Vấn đề Lazy Loading giải quyết

- **Tối ưu tốc độ tải trang:** Trang web sẽ hiển thị nhanh hơn vì không phải tải toàn bộ tài nguyên ngay lập tức.
- **Tiết kiệm băng thông:** Chỉ tải những gì người dùng thực sự cần xem hoặc sử dụng.
- **Giảm áp lực cho server:** Ít request đồng thời và ít dữ liệu phải xử lý, đặc biệt với ứng dụng lớn.
- **Tăng trải nghiệm người dùng:** Người dùng thấy nội dung chính nhanh hơn, các phần phụ sẽ tải khi cần.

---

## 3. Các dạng Lazy Loading phổ biến

### a. Lazy Loading hình ảnh

Chỉ tải hình khi hình đó xuất hiện trên màn hình (viewport).

**Ví dụ:**
```html
<img src="thumbnail.jpg" data-src="large-image.jpg" loading="lazy" alt="Hình lớn" />
```
Hoặc dùng thư viện như `lazysizes`, `react-lazyload`.

### b. Lazy Loading component/module (React/JS)

Chỉ tải component hoặc module khi người dùng truy cập tới phần đó (code splitting).

**Ví dụ với React:**
```jsx
import React, { Suspense, lazy } from 'react';

// Tải component khi cần
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
Hoặc với React Router:
```jsx
import { lazy } from 'react';
const AdminPage = lazy(() => import('./AdminPage'));

<Route path="/admin" element={<AdminPage />} />
```

### c. Lazy Loading với Intersection Observer

Intersection Observer API là một Web API cho phép phát hiện một phần tử (element) xuất hiện trong viewport (cửa sổ trình duyệt), từ đó thực hiện các hành động như lazy-load hình ảnh, animation, hoặc gọi API.

**Ví dụ:**
```jsx

const LazyProductList = () => {

  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductRef = useRef<HTMLLIElement | null>(null);

  const fetchProducts = async () => {
    ...
  };

  useEffect(() => {
    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        fetchProducts();
      }
    };

    observer.current = new IntersectionObserver(callback, {threshold: 1.0});

    const currentRef = lastProductRef.current;
    if (currentRef) {
      observer.current.observe(currentRef);
    }

    return () => {
      if (currentRef && observer.current) {
        observer.current.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <>
     <ul>
        {products.map((product, index) => {
          const isLastProduct = index === products.length - 1;
          return (
            <li key={index} ref={isLastProduct ? lastProductRef : null}>
              {product.name}
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default LazyProductList;

}
```

---

## 4. Lưu ý khi sử dụng Lazy Loading

- Đảm bảo có fallback/loading UI để người dùng không thấy trang trắng khi tài nguyên chưa tải xong.
- Với hình ảnh, dùng thuộc tính `loading="lazy"` và kiểm tra tương thích trình duyệt.
- Với component, sử dụng `Suspense` trong React để quản lý trạng thái tải.
- Đảm bảo SEO nếu lazy loading ảnh hoặc nội dung quan trọng (nên preload hoặc dùng SSR nếu cần).
- Kiểm tra hiệu năng thực tế, tránh lazy loading quá nhiều dẫn đến nhiều request nhỏ liên tục.

---

## 5. Lợi ích và hạn chế

| Lợi ích                | Hạn chế                        |
|------------------------|-------------------------------|
| Tăng tốc độ tải trang   | Phức tạp hơn khi code         |
| Tiết kiệm băng thông   | Có thể ảnh hưởng SEO          |
| Cải thiện UX           | Cần xử lý loading, error UI   |
| Giảm tải server        | Yêu cầu kiểm tra kỹ lưỡng     |

---

## 6. Tổng kết

Lazy Loading là một kỹ thuật tối ưu cực kỳ quan trọng với web hiện đại, đặc biệt với ứng dụng lớn hoặc nhiều hình ảnh/data. Hãy áp dụng hợp lý để cải thiện UX và hiệu năng ứng dụng của bạn!
