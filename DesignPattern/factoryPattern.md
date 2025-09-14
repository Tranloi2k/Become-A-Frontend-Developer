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
/**
 * The Creator class declares the factory method that is supposed to return an
 * object of a Product class. The Creator's subclasses usually provide the
 * implementation of this method.
 */
abstract class Creator {
    /**
     * Note that the Creator may also provide some default implementation of the
     * factory method.
     */
    public abstract factoryMethod(): Product;

    /**
     * Also note that, despite its name, the Creator's primary responsibility is
     * not creating products. Usually, it contains some core business logic that
     * relies on Product objects, returned by the factory method. Subclasses can
     * indirectly change that business logic by overriding the factory method
     * and returning a different type of product from it.
     */
    public someOperation(): string {
        // Call the factory method to create a Product object.
        const product = this.factoryMethod();
        // Now, use the product.
        return `Creator: The same creator's code has just worked with ${product.operation()}`;
    }
}

/**
 * Concrete Creators override the factory method in order to change the
 * resulting product's type.
 */
class ConcreteCreator1 extends Creator {
    /**
     * Note that the signature of the method still uses the abstract product
     * type, even though the concrete product is actually returned from the
     * method. This way the Creator can stay independent of concrete product
     * classes.
     */
    public factoryMethod(): Product {
        return new ConcreteProduct1();
    }
}

class ConcreteCreator2 extends Creator {
    public factoryMethod(): Product {
        return new ConcreteProduct2();
    }
}

/**
 * The Product interface declares the operations that all concrete products must
 * implement.
 */
interface Product {
    operation(): string;
}

/**
 * Concrete Products provide various implementations of the Product interface.
 */
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

/**
 * The client code works with an instance of a concrete creator, albeit through
 * its base interface. As long as the client keeps working with the creator via
 * the base interface, you can pass it any creator's subclass.
 */
function clientCode(creator: Creator) {
    // ...
    console.log('Client: I\'m not aware of the creator\'s class, but it still works.');
    console.log(creator.someOperation());
    // ...
}

/**
 * The Application picks a creator's type depending on the configuration or
 * environment.
 */
console.log('App: Launched with the ConcreteCreator1.');
clientCode(new ConcreteCreator1());
console.log('');

console.log('App: Launched with the ConcreteCreator2.');
clientCode(new ConcreteCreator2());
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
