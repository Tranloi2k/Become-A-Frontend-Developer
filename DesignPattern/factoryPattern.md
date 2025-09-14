# Factory Pattern trong JavaScript

Dưới đây là thông tin **đã được xác minh** về **Factory Pattern** trong JavaScript, dựa trên các nguồn uy tín như [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Details_of_the_Object_Model), [Refactoring Guru - Factory Method](https://refactoring.guru/design-patterns/factory-method/javascript/example), và [Addy Osmani - Learning JavaScript Design Patterns](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#factorypatternjavascript).

---

## 1. Định nghĩa

**Factory Pattern** (Mẫu thiết kế nhà máy) là một mẫu thiết kế tạo sinh (creational design pattern).  
Nó **đóng gói quá trình khởi tạo đối tượng**, giúp bạn tạo ra các đối tượng mà không cần chỉ rõ lớp (class) cụ thể của nó.  
Bạn chỉ làm việc với một "factory" (nhà máy) – nơi quyết định loại đối tượng sẽ được tạo dựa trên tham số hoặc điều kiện.

**Tóm lại**: Factory Pattern giúp tách biệt logic khởi tạo đối tượng khỏi việc sử dụng đối tượng. Đảm bảo tính mở rộng và bảo trì cao cho phần mềm.

---

## 2. Khi nào nên dùng Factory Pattern?

- Khi bạn cần tạo nhiều đối tượng có cùng interface nhưng khác chi tiết bên trong.
- Khi logic khởi tạo đối tượng phức tạp hoặc thay đổi theo từng trường hợp cụ thể.
- Khi bạn muốn giảm sự phụ thuộc trực tiếp vào các class cụ thể (giảm coupling).

---

## 3. Cách triển khai Factory Pattern trong JavaScript

#### Ví dụ minh họa

```javascript
abstract class Creator {
    public abstract factoryMethod(): Product;

    public someOperation(): string {
        // Call the factory method to create a Product object.
        const product = this.factoryMethod();
        // Now, use the product.
        return `Creator: The same creator's code has just worked with ${product.operation()}`;
    }
}

class ConcreteCreator1 extends Creator {
    public factoryMethod(): Product {
        return new ConcreteProduct1();
    }
}

class ConcreteCreator2 extends Creator {
    public factoryMethod(): Product {
        return new ConcreteProduct2();
    }
}

interface Product {
    operation(): string;
}

class ConcreteProduct1 implements Product {
    public operation(): string {
        return '{Result of the ConcreteProduct1}';
    }
}

class ConcreteProduct2 implements Product {
    public operation(): string {
        return '{Result of the ConcreteProduct2}';
    }
}

function clientCode(creator: Creator) {
    // ...
    console.log('Client: I\'m not aware of the creator\'s class, but it still works.');
    console.log(creator.someOperation());
    // ...
}

console.log('App: Launched with the ConcreteCreator1.');
clientCode(new ConcreteCreator1());
console.log('');

console.log('App: Launched with the ConcreteCreator2.');
clientCode(new ConcreteCreator2());
```

---

## 4. Ưu điểm

- **Tăng khả năng mở rộng**: Dễ dàng thêm loại đối tượng mới mà không phải sửa code sử dụng factory.
- **Ẩn logic khởi tạo**: Phức tạp đến đâu cũng chỉ nằm trong factory, code sử dụng không cần biết.
- **Giảm sự phụ thuộc (decoupling)**: Code không bị gắn chặt với các class cụ thể.

---

## 5. Nhược điểm

- **Tăng số lượng class/factory function**: Nếu có quá nhiều loại đối tượng, code factory có thể phức tạp.
- **Khó đọc nếu lạm dụng**: Nếu chỉ có 1-2 loại object đơn giản thì đôi khi không cần thiết dùng factory.

---

## 6. Ứng dụng thực tế

### 💡 Khi nào nên dùng Factory Method?

### a. Khi bạn không biết trước chính xác loại đối tượng và các phụ thuộc (dependencies) mà code của bạn sẽ làm việc cùng

- **Nghĩa là**: Đôi khi bạn viết code mà không thể xác định trước cần tạo ra loại đối tượng cụ thể nào (ví dụ: `Dog` hay `Cat`, `Button` vuông hay `Button` tròn).
- **Giải pháp**: Factory Method giúp tách biệt phần code tạo ra sản phẩm (object) khỏi phần code sử dụng sản phẩm đó.
- **Lợi ích**: Khi muốn thêm sản phẩm mới, chỉ cần tạo subclass mới và override phương thức factory – không phải sửa code cũ.

**Ví dụ:**
```js
// Interface cho động vật
class Animal {
  speak() {}
}

class Dog extends Animal {
  speak() { console.log("Woof!"); }
}

class Cat extends Animal {
  speak() { console.log("Meow!"); }
}

// Factory Method
function createAnimal(type) {
  if (type === "dog") return new Dog();
  if (type === "cat") return new Cat();
  throw new Error("Unknown type");
}

// Sử dụng
const animal1 = createAnimal("dog");
animal1.speak(); // Woof!

const animal2 = createAnimal("cat");
animal2.speak(); // Meow!
```

---

### b. Khi bạn muốn người dùng thư viện hoặc framework của mình có thể mở rộng các thành phần bên trong một cách dễ dàng

- **Kế thừa (Inheritance)** là cách đơn giản nhất để mở rộng hành vi mặc định của một thư viện.
- **Vấn đề**: Làm sao để framework biết dùng subclass mới của bạn thay vì component mặc định?
- **Giải pháp**: Gom hết logic tạo các thành phần vào một phương thức factory duy nhất và cho phép override nó.

**Ví dụ:**
```js
// Component gốc
class Button {
  render() { console.log("Square Button"); }
}

// Mở rộng thành phần
class RoundButton extends Button {
  render() { console.log("Round Button"); }
}

// UI Framework cơ bản
class UIFramework {
  createButton() {
    return new Button();
  }
  renderButton() {
    this.createButton().render();
  }
}

// Subclass framework để mở rộng
class UIWithRoundButtons extends UIFramework {
  createButton() {
    return new RoundButton();
  }
}

// Sử dụng
const ui = new UIWithRoundButtons();
ui.renderButton(); // Round Button
```

---

### c. Khi bạn muốn tiết kiệm tài nguyên hệ thống bằng cách tái sử dụng đối tượng thay vì tạo mới liên tục

- Thường gặp khi các đối tượng đó rất “nặng” như kết nối database, file system, tài nguyên mạng.
- **Để tái sử dụng, bạn cần:**
  1. Tạo nơi lưu các object đã tạo (object pool).
  2. Khi cần, kiểm tra xem có object nào “rảnh” không để trả về.
  3. Nếu không có thì mới tạo mới và lưu vào pool.
- Nếu tản mạn logic này khắp nơi thì code sẽ lộn xộn, trùng lặp.
- **Factory Method** cho phép đặt hết logic này vào một nơi duy nhất, giúp kiểm soát và tái sử dụng đối tượng một cách tập trung, sạch sẽ.

**Ví dụ:**
```js
class DBConnection {
  constructor(id) {
    this.id = id;
    this.busy = false;
  }
}

// Object Pool dùng Factory Method
class DBConnectionFactory {
  constructor() {
    this.pool = [];
    this.counter = 0;
  }

  getConnection() {
    // Tìm một connection rảnh
    const freeConn = this.pool.find(conn => !conn.busy);
    if (freeConn) {
      freeConn.busy = true;
      return freeConn;
    }
    // Nếu không có thì tạo mới
    const conn = new DBConnection(++this.counter);
    conn.busy = true;
    this.pool.push(conn);
    return conn;
  }

  releaseConnection(conn) {
    conn.busy = false;
  }
}

// Sử dụng
const factory = new DBConnectionFactory();
const conn1 = factory.getConnection();
console.log(conn1.id); // 1
factory.releaseConnection(conn1);
const conn2 = factory.getConnection();
console.log(conn2.id); // 1 (tái sử dụng)
```

---
