## State Pattern trong JavaScript

### 1. Định nghĩa

**State Pattern** (Mẫu thiết kế trạng thái) là một mẫu thiết kế hành vi (behavioral pattern) cho phép một đối tượng thay đổi hành vi của mình khi trạng thái nội bộ thay đổi. Đối tượng sẽ xuất hiện như thể nó được thay đổi class động.

**Nguồn xác minh:**  
- [Refactoring Guru - State Pattern](https://refactoring.guru/design-patterns/state)
- [MDN Web Docs - Design Patterns](https://developer.mozilla.org/en-US/docs/Glossary/Design_pattern)

---

### 2. Khi nào nên dùng State Pattern?

- Khi một object có nhiều trạng thái và hành vi của nó thay đổi theo trạng thái đó.
- Khi muốn tách rời code xử lý logic từng trạng thái ra khỏi lớp chính.

---

### 3. Cách triển khai State Pattern trong JavaScript

#### Các bước triển khai (theo Refactoring Guru):

1. **Xác định class nào sẽ đóng vai trò Context.**  
   Đó có thể là một class hiện có vốn đã chứa code phụ thuộc vào trạng thái, hoặc tạo mới nếu code trạng thái phân tán ở nhiều class.

2. **Khai báo giao diện State (State Interface).**  
   Interface này nên chứa các phương thức có thể có hành vi khác nhau tùy trạng thái (không cần phải liệt kê mọi phương thức của context nếu không cần).

3. **Với mỗi trạng thái thực tế, tạo một class kế thừa interface State.**  
   Sau đó, duyệt qua các phương thức của context và chuyển toàn bộ code liên quan đến trạng thái đó sang class mới vừa tạo.

4. **Khi di chuyển code sang class State, nếu phát hiện code phụ thuộc vào thành viên private của context:**  
   - Có thể chuyển các trường/phương thức này thành public.
   - Hoặc chuyển logic thành public method trên context và gọi từ state (giải pháp nhanh nhưng có thể xấu về mặt kiến trúc, có thể refactor sau).
   - Hoặc lồng class State vào trong context nếu ngôn ngữ hỗ trợ.

5. **Trong class Context, thêm trường tham chiếu tới interface State và setter public để thay đổi trạng thái.**

6. **Duyệt lại các phương thức của context và thay các conditional kiểm tra trạng thái bằng lời gọi phương thức tương ứng của state object.**

7. **Để chuyển trạng thái context:**  
   Tạo instance của class state tương ứng và gán vào context. Việc này có thể thực hiện từ bên trong context, trong chính các state, hoặc từ client.  
   => Ở đâu thực hiện thì nơi đó sẽ phụ thuộc vào class state cụ thể.

---

#### Ví dụ: Máy bán hàng tự động (Vending Machine)

```javascript
abstract class Mode {
  public abstract type: string;
  protected internetContext?: InternetContext;
  public abstract connect(): void;
  public setInternetContext(internetContext: InternetContext): void {
    this.internetContext = internetContext;
  }
}

class InternetContext {
  private mode!: Mode;

  constructor(mode: Mode) {
    this.setMode(mode);
  }

  public setMode(mode: Mode): void {
    console.log(`Internet mode set to ${mode.type}.`);
    this.mode = mode;
    this.mode.setInternetContext(this);
  }

  public accessInternet(): void {
    console.log(`Accessing the internet in ${this.mode.type} mode.`);
    this.mode.connect();
  }

  public turnOff(): void {
    console.log("turn off the internet");
    this.setMode(new OfflineMode());
  }
}

class PrivateMode extends Mode {
  public type: "private" = "private";

  public connect(): void {
    console.log("Connecting to the internet in private mode...");
    this.internetContext?.setMode(new PublicMode());
  }
}

class PublicMode extends Mode {
  public type: "public" = "public";
  connect(): void {
    console.log("Connecting to the internet in public mode...");
    this.internetContext?.setMode(new PrivateMode());
  }
}

class OfflineMode extends Mode {
  public type: "offline" = "offline";
  connect(): void {
    console.log("You are offline. Please connect to the internet.");
  }
}

const internetPrivate = new InternetContext(new PrivateMode());
internetPrivate.accessInternet();
internetPrivate.turnOff();
internetPrivate.accessInternet();

```

---

### 4. Ưu điểm & Nhược điểm

**Ưu điểm:**
- Tách biệt rõ ràng logic từng trạng thái.
- Dễ mở rộng, bảo trì hoặc thêm trạng thái mới.

**Nhược điểm:**
- Tăng số lượng class nếu có nhiều trạng thái.
- Có thể phức tạp hóa hệ thống nếu trạng thái đơn giản.

---

### 5. Ứng dụng thực tế

- Quản lý trạng thái của UI component (nút bấm, form, modal...).
- Máy trạng thái (Finite State Machine) cho game, workflow, quy trình nghiệp vụ.
- Luồng xác thực, đăng nhập/log out.

---

**Nguồn:**  
- [Refactoring Guru - State Pattern](https://refactoring.guru/design-patterns/state)  
- [MDN Web Docs - Design Patterns](https://developer.mozilla.org/en-US/docs/Glossary/Design_pattern)
