# Component, Props, và State trong ReactJS Functional Component

### 1. Component

Trong React, **Component** giống như những khối xây dựng độc lập và có thể tái sử dụng để tạo nên giao diện người dùng (UI). Mỗi component quản lý một phần giao diện và logic của riêng nó. Thay vì xây dựng toàn bộ UI trong một file lớn, bạn sẽ chia nhỏ nó thành các component như `Header`, `Sidebar`, `Article`, `Footer`,...

**Functional Component:** Là một hàm JavaScript đơn giản nhận vào một đối tượng `props` và trả về một phần tử React (thường là JSX) để mô tả những gì sẽ được hiển thị trên màn hình.

**Ví dụ:**
```javascript
// Đây là một Functional Component đơn giản tên là Welcome
function Welcome(props) {
  return <h1>Chào mừng, {props.name}!</h1>;
}

// Sử dụng component
<Welcome name="Lợi" /> // Kết quả sẽ hiển thị: "Chào mừng, Lợi!"
```

### 2. Props

**Props** (viết tắt của "properties") là cách để truyền dữ liệu từ component cha xuống component con. Dữ liệu này là **bất biến (immutable)**, có nghĩa là component con chỉ có thể đọc chứ không thể thay đổi props mà nó nhận được.

Hãy coi props như những "tham số" bạn truyền vào một hàm.

**Đặc điểm chính của Props:**
*   Dùng để truyền dữ liệu (chuỗi, số, đối tượng, hàm,...) từ cha xuống con.
*   Chỉ đọc (read-only). Component con không được phép sửa đổi props.
*   Mỗi khi props của một component thay đổi từ component cha, React sẽ render lại component con đó với dữ liệu mới.

**Ví dụ:**

Component cha (`App`) truyền một `prop` tên là `userName` cho component con (`UserProfile`).

```javascript
// Component con: UserProfile.js
function UserProfile(props) {
  // Nhận dữ liệu qua props và hiển thị
  return <h2>Tên người dùng: {props.userName}</h2>;
}

// Component cha: App.js
function App() {
  return (
    <div>
      <h1>Trang chủ</h1>
      {/* Truyền prop 'userName' với giá trị "TranLoi2k" */}
      <UserProfile userName="TranLoi2k" />
    </div>
  );
}
```

### 3. State

**State** là một đối tượng dùng để lưu trữ dữ liệu *nội bộ* của một component. Khác với props, `state` có thể thay đổi theo thời gian, thường là do tương tác của người dùng (như click chuột, nhập liệu,...).

Khi `state` của một component thay đổi, React sẽ tự động **render lại (re-render)** component đó để cập nhật giao diện theo state mới.

Trong functional component, chúng ta quản lý state bằng một Hook đặc biệt tên là `useState`.

**Đặc điểm chính của State:**
*   Là dữ liệu nội bộ, chỉ component đó quản lý.
*   Có thể thay đổi (mutable).
*   Mỗi khi state thay đổi, component sẽ được render lại.
*   Để cập nhật state, phải sử dụng hàm setter đặc biệt do `useState` cung cấp (ví dụ: `setCount`), không được thay đổi trực tiếp.

**Ví dụ:**

Một component `Counter` có một nút bấm. Mỗi lần bấm, giá trị `count` trong state sẽ tăng lên và giao diện được cập nhật.

```javascript
import React, { useState } from 'react';

function Counter() {
  // Khai báo một biến state tên là 'count' với giá trị khởi tạo là 0
  // useState trả về một mảng: [giá trị hiện tại, hàm để cập nhật giá trị đó]
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Bạn đã nhấn {count} lần</p>
      {/* Khi nhấn nút, gọi hàm setCount để tăng giá trị của count lên 1 */}
      <button onClick={() => setCount(count + 1)}>
        Nhấn vào đây
      </button>
    </div>
  );
}
```

### Tóm tắt so sánh

| Tiêu chí | Props | State |
| :--- | :--- | :--- |
| **Nguồn gốc** | Được truyền từ component cha. | Được quản lý bên trong chính component đó. |
| **Khả năng thay đổi** | **Bất biến (Immutable)**. Component con không thể thay đổi. | **Có thể thay đổi (Mutable)**. |
| **Mục đích** | Truyền dữ liệu và cấu hình từ bên ngoài vào. | Quản lý trạng thái động, dữ liệu thay đổi theo tương tác. |
| **Cách sử dụng** | `props.propertyName` | `const [state, setState] = useState(initialValue);` |
