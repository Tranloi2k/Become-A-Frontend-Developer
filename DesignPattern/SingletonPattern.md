## Singleton Pattern trong JavaScript

### 1. Định nghĩa

**Singleton Pattern** (Mẫu thiết kế Singleton) là một mẫu thiết kế thuộc nhóm creational (tạo sinh).  
Nó đảm bảo rằng chỉ tồn tại duy nhất một instance (thể hiện) của một class hoặc object trong toàn bộ vòng đời của ứng dụng, và cung cấp một điểm truy cập toàn cục (global access point) tới instance đó.

**Nguồn:**  
- [MDN Web Docs - Singleton pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object#singleton_pattern)
- [Refactoring Guru - Singleton](https://refactoring.guru/design-patterns/singleton/javascript/example)

---

### 2. Cách triển khai Singleton Pattern trong JavaScript

#### a. Dùng IIFE (Immediately Invoked Function Expression)

```javascript
const Singleton = (function() {
  let instance;

  function createInstance() {
    return { time: Date.now() }; // có thể là object hoặc class
  }

  return {
    getInstance: function() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    }
  };
})();

// Cách dùng
const obj1 = Singleton.getInstance();
const obj2 = Singleton.getInstance();
console.log(obj1 === obj2); // true
```
**Giải thích:**  
- Khi gọi `Singleton.getInstance()`, nếu instance chưa tồn tại thì tạo mới, còn nếu đã có thì trả về instance đã tạo.
- Chỉ có một instance duy nhất trong toàn bộ ứng dụng.

---

#### b. Dùng ES6 Class với static

```javascript
class SingletonClass {
  constructor() {
    if (SingletonClass.instance) {
      return SingletonClass.instance;
    }
    this.time = Date.now();
    SingletonClass.instance = this;
  }
}

// Cách dùng
const a = new SingletonClass();
const b = new SingletonClass();
console.log(a === b); // true
```
**Giải thích:**  
- Lần đầu gọi `new SingletonClass()`, instance được tạo và lưu vào `SingletonClass.instance`.
- Các lần sau sẽ trả về instance đã tạo ban đầu.

---

### 3. Ứng dụng thực tế

- Giữ kết nối database duy nhất trong một ứng dụng backend.
- Lưu trữ config, cache, logger dùng chung cho toàn bộ ứng dụng.
- Quản lý state toàn cục (global state manager).

---

### 4. Ưu điểm & Nhược điểm

**Ưu điểm:**
- Đảm bảo chỉ có một instance, tránh lãng phí tài nguyên.
- Dễ dàng truy cập ở bất cứ đâu trong code.

**Nhược điểm:**
- Có thể gây khó khăn cho việc kiểm thử (test) nếu singleton lưu trạng thái.
- Gây phụ thuộc toàn cục (global dependency), dễ dẫn đến code khó bảo trì nếu lạm dụng.

---

**Nguồn tham khảo:**  
- [MDN Web Docs - Singleton pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object#singleton_pattern)
- [Refactoring Guru - Singleton](https://refactoring.guru/design-patterns/singleton/javascript/example)
- [Addy Osmani - Learning JavaScript Design Patterns](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#singletonpatternjavascript)
