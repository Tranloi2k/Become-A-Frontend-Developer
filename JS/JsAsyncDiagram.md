# 🟡 **I JavaScript Asynchronous Diagram**

![Ảnh minh họa](image.png)

| **Component**      | **Description**                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Memory Heap**    | Where variables and objects are stored.                                                 |
| **Call Stack**     | Where synchronous JS code is executed (LIFO – Last In, First Out).                      |
| **Web APIs**       | Asynchronous APIs provided by browser (DOM, AJAX, Timer, ...).                          |
| **Callback Queue** | Queue for callbacks from Web APIs after completion (Task Queue / Macro-task).           |
| **Event Loop**     | Continuously checks Call Stack and pushes tasks from the Queue when the Stack is empty. |

---

## 🚦 **How the Flow Works**

The event loop is a concept within the JavaScript runtime environment regarding how asynchronous operations are executed within JavaScript engines. It works as such:

1. The JavaScript engine starts executing scripts, placing synchronous operations on the call stack.
2. When an asynchronous operation is encountered (e.g., `setTimeout()`, HTTP request), it is offloaded to the respective Web API or Node.js API to handle the operation in the background.
3. Once the asynchronous operation completes, its callback function is placed in the respective queues – task queues (also known as macrotask queues / callback queues) or microtask queues. We will refer to "task queue" as "macrotask queue" from here on to better differentiate from the microtask queue.
4. The event loop continuously monitors the call stack and executes items on the call stack. If/when the call stack is empty:
   1. Microtask queue is processed. Microtasks include promise callbacks (`then`, `catch`, `finally`), `await` continuations, `MutationObserver` callbacks, and calls to `queueMicrotask()`. The event loop takes the first callback from the microtask queue and pushes it to the call stack for execution. This repeats until the microtask queue is empty.
   2. Macrotask queue is processed. Macrotasks include web APIs like `setTimeout()`, HTTP requests, user interface event handlers like clicks, scrolls, etc. The event loop dequeues the first callback from the macrotask queue and pushes it onto the call stack for execution. However, after a macrotask queue callback is processed, the event loop does not proceed with the next macrotask yet! The event loop first checks the microtask queue. Checking the microtask queue is necessary as microtasks have higher priority than macrotask queue callbacks. The macrotask queue callback that was just executed could have added more microtasks!
      1. If the microtask queue is non-empty, process them as per the previous step.
      2. If the microtask queue is empty, the next macrotask queue callback is processed. This repeats until the macrotask queue is empty.
5. This process continues indefinitely, allowing the JavaScript engine to handle both synchronous and asynchronous operations efficiently without blocking the call stack.

> **Note:**
>
> - JavaScript has only **one Call Stack** (single-threaded), but thanks to this mechanism, it can handle multiple asynchronous tasks smoothly.
> - **Callback Queue** ≈ **Task Queue** (macro-task).
> - **Microtask Queue** (Promise, MutationObserver, ...) has **higher priority** than Callback Queue but is not shown in this diagram. Event loop always processes tasks in Microtask Queue first whenever Call Stack is empty, then continues to process Macrotask Queue.

# 🟡 **II Cách sử dụng `this` trong JavaScript (có giải thích ví dụ)**

Dưới đây là tổng hợp chi tiết về cách sử dụng và ý nghĩa của `this` trong JavaScript, dựa trên tài liệu xác minh từ [MDN Web Docs – this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this) và [ECMAScript specification](https://tc39.es/ecma262/#sec-this-keyword):

---

## 1. `this` là gì?

`this` là một từ khóa đặc biệt trong JavaScript, đại diện cho **ngữ cảnh thực thi (execution context)** hiện tại – cụ thể là đối tượng mà hàm đang được gọi thông qua nó.

---

## 2. Ý nghĩa của `this` phụ thuộc vào cách gọi hàm

### a. Trong hàm thông thường (non-strict mode)

```javascript
function show() {
  console.log(this);
}
show(); // this === window (trình duyệt) hoặc global (Node.js)
```

Khi gọi một hàm thông thường ở chế độ không strict, `this` mặc định là đối tượng toàn cục (`window` trên trình duyệt, `global` trên Node.js).

---

### b. Trong strict mode

```javascript
"use strict";
function show() {
  console.log(this);
}
show(); // this === undefined
```

Trong strict mode, khi gọi hàm thông thường, `this` sẽ là `undefined` thay vì tham chiếu đến đối tượng toàn cục.

---

### c. Trong phương thức của object

```javascript
const obj = {
  name: "Loi",
  show: function () {
    console.log(this.name);
  },
};
obj.show(); // this === obj => 'Loi'
```

Khi gọi một method thông qua object (obj.show()), `this` trỏ đến chính object đó (`obj`), nên `this.name` sẽ in ra `'Loi'`.

---

### d. Trong constructor function

Khi sử dụng `new`, hàm sẽ tạo một object mới và `this` bên trong hàm sẽ trỏ đến object mới đó.

```javascript
function Person(name) {
  this.name = name;
}
const p = new Person("Loi");
console.log(p.name); // 'Loi', this === p
```

---

### e. Trong class (ES6)

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    console.log(this.name);
  }
}
const dog = new Animal("Muc");
dog.speak(); // this === dog => 'Muc'
```

Tương tự constructor function, `this` trong class sẽ trỏ đến instance vừa được tạo, nên `this.name` sẽ truy cập tên của đối tượng.

---

## 3. Explicit binding

Explicit binding is when you force a function to use a specific object as this. You do this using three built-in methods: call, apply, and bind.

```javascript
function greet() {
  console.log("Hello", this.name);
}
const user = { name: "Loi" };
greet.call(user); // Hello Loi
greet.apply(user); // Hello Loi
const greetUser = greet.bind(user);
greetUser(); // Hello Loi
```

`call`, `apply`, và `bind` cho phép chỉ định cụ thể giá trị của `this` khi gọi hàm.

- `call` và `apply` gọi hàm ngay lập tức với `this` là `user`.
- `bind` trả về một bản sao của hàm với `this` cố định là `user`.

---

## 4. `this` trong arrow function

- Arrow function **không có ngữ cảnh `this` riêng**.
- `this` bên trong arrow function sẽ lấy từ hàm cha gần nhất.

```javascript
const obj = {
  name: "Loi",
  show: function () {
    const arrow = () => {
      console.log(this.name);
    };
    arrow();
  },
};
obj.show(); // 'Loi'
```

Arrow function không có `this` riêng, nó "kế thừa" `this` từ hàm chứa nó (`show`).  
Vì `show` là method của `obj`, nên `this.name` vẫn là `'Loi'`.

---

## 5. Một số trường hợp đặc biệt

### a. Khi truyền method làm callback

Khi truyền trực tiếp method của object cho hàm khác (như setTimeout), ngữ cảnh object bị mất, nên `this` không còn trỏ về `obj` nữa.

```javascript
const obj = {
  name: "Loi",
  show: function () {
    console.log(this.name);
  },
};
setTimeout(obj.show, 1000); // undefined (trong strict mode) hoặc window.name nếu không strict
```

**Giải pháp:** Dùng arrow function hoặc bind:

Sử dụng arrow function hoặc bind sẽ giữ đúng ngữ cảnh `this` là `obj`.

```javascript
setTimeout(() => obj.show(), 1000);
```

hoặc

```javascript
setTimeout(obj.show.bind(obj), 1000);
```

---

## 6. Trong DOM event handler

Khi xử lý sự kiện DOM bằng function thông thường (không phải arrow), `this` sẽ trỏ đến phần tử DOM kích hoạt sự kiện.

```javascript
const btn = document.querySelector("button");
btn.onclick = function () {
  console.log(this); // this === btn
};
```

---

## 7. Tóm tắt bảng tra cứu `this`

| Cách gọi                     | `this` là gì?                    |
| ---------------------------- | -------------------------------- |
| Hàm thường (non-strict)      | Đối tượng global (window/global) |
| Hàm thường (strict mode)     | undefined                        |
| Method thuộc object          | Chính object đó                  |
| Constructor (dùng `new`)     | Đối tượng mới được tạo           |
| Arrow function               | `this` của scope bên ngoài       |
| Dùng `call`, `apply`, `bind` | Đối tượng được truyền vào        |
| DOM event handler            | Phần tử DOM kích hoạt sự kiện    |

---

**Nguồn:**

- [MDN Web Docs – this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [ECMAScript specification – this](https://tc39.es/ecma262/#sec-this-keyword)
