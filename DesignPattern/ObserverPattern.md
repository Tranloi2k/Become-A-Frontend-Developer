## Observer Pattern trong JavaScript

### 1. Định nghĩa

**Observer Pattern** (Mẫu thiết kế Observer/Quan sát viên) là một mẫu thiết kế hành vi (behavioral pattern).  
Mục đích là định nghĩa mối quan hệ một-nhiều giữa các đối tượng: khi một đối tượng (subject/publisher) thay đổi trạng thái, tất cả các đối tượng phụ thuộc (observers/subscribers) sẽ được thông báo và cập nhật tự động.

**Nguồn xác minh:**  
- [Refactoring Guru - Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [MDN Web Docs - Observer pattern](https://developer.mozilla.org/en-US/docs/Glossary/Observer_pattern)

---

### 2. Khi nào nên dùng Observer Pattern?

- Khi một đối tượng cần thông báo cho nhiều đối tượng khác về sự thay đổi trạng thái.
- Khi cần giảm sự phụ thuộc trực tiếp giữa các đối tượng.

---

### 3. Các bước triển khai Observer Pattern

1. **Xem lại logic nghiệp vụ và phân tách thành 2 phần:**  
   - Phần chức năng cốt lõi, độc lập sẽ đóng vai trò publisher (subject).
   - Phần còn lại sẽ được chuyển thành các class subscriber (observer).

2. **Khai báo interface subscriber:**  
   - Tối thiểu nên có một phương thức update (hoặc notify).

3. **Khai báo interface publisher:**  
   - Cần có hai phương thức: thêm subscriber vào danh sách, và xóa subscriber khỏi danh sách.
   - Publisher chỉ làm việc với subscriber thông qua interface subscriber.

4. **Quyết định nơi lưu danh sách subscription và triển khai các phương thức subscription:**  
   - Thông thường nên đặt trong một abstract class kế thừa trực tiếp từ interface publisher, để các publisher cụ thể kế thừa lại.
   - Nếu áp dụng cho hệ thống class sẵn có, có thể dùng composition: đặt logic subscription trong một object riêng và cho các publisher sử dụng.

5. **Tạo các class publisher cụ thể:**  
   - Khi có sự kiện quan trọng, publisher sẽ thông báo cho toàn bộ subscriber đã đăng ký.

6. **Triển khai phương thức update ở các class subscriber cụ thể:**  
   - Thường các subscriber sẽ cần dữ liệu bối cảnh về sự kiện, có thể truyền qua tham số của update.
   - Ngoài ra, publisher cũng có thể truyền chính bản thân nó vào update, giúp subscriber tự lấy dữ liệu cần thiết.

7. **Client sẽ tạo các subscriber cần thiết và đăng ký với các publisher phù hợp.**

---

#### Ví dụ triển khai cơ bản

```javascript
interface Store {
  attach(customer: Customer): void;
  detach(customer: Customer): void;
  notify(): void;
}

class FptStore implements Store {
  public newPhoneName: string = "";
  private customers: Customer[] = [];
  public attach(customer: Customer): void {
    const isExist = this.customers.includes(customer);
    if (isExist) {
      return console.log("Customer has been attached already.");
    }
    this.customers.push(customer);
    console.log(`Attached a customer: ${customer.name}.`);
  }
  public detach(customer: Customer): void {
    const customerIndex = this.customers.indexOf(customer);
    if (customerIndex === -1) {
      return console.log(`Customer not found: ${customer.name}.`);
    }
    this.customers = this.customers.filter((c) => c !== customer);
    console.log(`Detached a customer: ${customer.name}.`);
  }
  public notify(): void {
    for (const customer of this.customers) {
      customer.update(this);
    }
  }

  public newPhoneRelease(phoneName: string): void {
    this.newPhoneName = phoneName;
    console.log(`New phone released: ${phoneName}`);
    this.notify();
  }
}

interface Customer {
  name: string;
  update(store: Store): void;
}

class IFanCustomer implements Customer {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  public update(store: Store): void {
    if (store instanceof FptStore) {
      console.log(
        `${this.name}: Notified about new phone release - ${store.newPhoneName}.`
      );
    }
  }
}

const fptStore = new FptStore();
const customer1 = new IFanCustomer("Alice");
const customer2 = new IFanCustomer("Bob");
fptStore.attach(customer1);
fptStore.attach(customer2);
fptStore.newPhoneRelease("iPhone 15");
fptStore.detach(customer1);
fptStore.newPhoneRelease("Samsung Galaxy S24");

```

---

### 4. Ưu điểm & Nhược điểm

**Ưu điểm:**
- Dễ mở rộng, thêm observer mới mà không cần sửa code publisher.
- Giảm coupling giữa publisher và subscriber.

**Nhược điểm:**
- Nếu không quản lý tốt, số lượng observer có thể khó kiểm soát.
- Nếu có quá nhiều observer, hiệu năng có thể bị ảnh hưởng.

---

### 5. Ứng dụng thực tế

- Hệ thống sự kiện (event system): DOM events, pub/sub trong frontend frameworks (React, Vue, Angular…).
- Mô hình MVVM, MVC (View lắng nghe thay đổi của Model).
- Notification system, data binding.

---

**Nguồn:**  
- [Refactoring Guru - Observer Pattern](https://refactoring.guru/design-patterns/observer)  
- [MDN Web Docs - Observer pattern](https://developer.mozilla.org/en-US/docs/Glossary/Observer_pattern)
