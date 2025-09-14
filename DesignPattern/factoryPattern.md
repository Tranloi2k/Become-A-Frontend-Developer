## Factory Pattern trong JavaScript

Dưới đây là thông tin **đã được xác minh** về **Factory Pattern** trong JavaScript, dựa trên các nguồn uy tín như [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Details_of_the_Object_Model), [Refactoring Guru - Factory Method](https://refactoring.guru/design-patterns/factory-method/javascript/example), và [Addy Osmani - Learning JavaScript Design Patterns](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#factorypatternjavascript).

---

### 1. Định nghĩa

**Factory Pattern** (Mẫu thiết kế nhà máy) là một mẫu thiết kế tạo sinh (creational design pattern).  
Nó **đóng gói quá trình khởi tạo đối tượng**, giúp bạn tạo ra các đối tượng mà không cần chỉ rõ lớp (class) cụ thể của nó.  
Bạn chỉ làm việc với một "factory" (nhà máy) – nơi quyết định loại đối tượng sẽ được tạo dựa trên tham số hoặc điều kiện.

---

### 2. Khi nào nên dùng Factory Pattern?

- Khi bạn cần tạo nhiều đối tượng có cùng interface nhưng khác chi tiết bên trong.
- Khi logic khởi tạo đối tượng phức tạp hoặc thay đổi theo từng trường hợp cụ thể.
- Khi bạn muốn giảm sự phụ thuộc trực tiếp vào các class cụ thể (giảm coupling).

---

### 3. Cách triển khai Factory Pattern trong JavaScript

#### Ví dụ minh họa

```javascript
// Định nghĩa các class hoặc hàm khởi tạo đối tượng
function Dog(name) {
  this.name = name;
  this.speak = function () {
    return `Gâu, tôi là ${this.name}`;
  };
}

function Cat(name) {
  this.name = name;
  this.speak = function () {
    return `Meo, tôi là ${this.name}`;
  };
}

// Factory function
function AnimalFactory() {}
AnimalFactory.prototype.createAnimal = function (type, name) {
  switch (type) {
    case "dog":
      return new Dog(name);
    case "cat":
      return new Cat(name);
    default:
      throw new Error("Không hỗ trợ loại này");
  }
};

// Cách sử dụng
const factory = new AnimalFactory();
const cho = factory.createAnimal("dog", "Mực");
const meo = factory.createAnimal("cat", "Mun");

console.log(cho.speak()); // "Gâu, tôi là Mực"
console.log(meo.speak()); // "Meo, tôi là Mun"
```

---

### 4. Ưu điểm

- **Tăng khả năng mở rộng**: Dễ dàng thêm loại đối tượng mới mà không phải sửa code sử dụng factory.
- **Ẩn logic khởi tạo**: Phức tạp đến đâu cũng chỉ nằm trong factory, code sử dụng không cần biết.
- **Giảm sự phụ thuộc (decoupling)**: Code không bị gắn chặt với các class cụ thể.

---

### 5. Nhược điểm

- **Tăng số lượng class/factory function**: Nếu có quá nhiều loại đối tượng, code factory có thể phức tạp.
- **Khó đọc nếu lạm dụng**: Nếu chỉ có 1-2 loại object đơn giản thì đôi khi không cần thiết dùng factory.

---

### 6. Ứng dụng thực tế

- Tạo các đối tượng UI (button, input, modal...) dựa trên cấu hình.
- Sinh các kết nối database cho từng loại (MySQL, MongoDB, PostgreSQL...).
- Factory cho request/response theo từng loại API khác nhau.
- Tạo đối tượng dịch vụ tùy môi trường (dev, prod, test...).

---

Nếu bạn muốn ví dụ thực tế cụ thể hơn cho trường hợp nào, vui lòng nói rõ!
