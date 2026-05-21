# 🌟 **Advanced JavaScript**

## **I. Closure**

> **A closure** is a function that "remembers" the scope where it was created, allowing it to access variables from its parent function even after the parent has finished execution.

### 🌱 **Basic Closure Example**

```js
function taoBoDem() {
  let count = 0;

  return function () {
    count++;
    console.log(count);
  };
}

const demSo = taoBoDem(); // demSo bây giờ là một closure

demSo(); // In ra: 1
demSo(); // In ra: 2
demSo(); // In ra: 3
// Biến `count` vẫn tồn tại và được ghi nhớ giữa các lần gọi.
```

### 🛡️ **Applications**

#### **a. Data Privacy / Encapsulation**

Closures enable simulating private variables (before ES6 class #private fields).

```js
function createOrderManager() {
  let total = 0;
  return {
    add(price) {
      total += price;
    },
    getTotal() {
      return total;
    },
  };
}
const order = createOrderManager();
order.add(100);
console.log(order.getTotal()); // 100
```

**With ES6+**, you can use class private fields:

```js
class Order {
  #total = 0;
  add(price) {
    this.#total += price;
  }
  getTotal() {
    return this.#total;
  }
}
```

**Closures** are still useful when:

- Using functional programming
- Creating simple modules, singletons

#### **b. Function Factories**

Create functions with pre-configured initial parameters.

```js
function multiplyBy(x) {
  return function (y) {
    return x * y;
  };
}
const double = multiplyBy(2);
console.log(double(5)); // 10
```

#### **c. Currying**

Transform a function with multiple parameters into a sequence of functions, each taking one parameter.

```js
// Hàm gốc chưa được "curry" hóa
function log(thoiGian, mucDo, thongDiep) {
  console.log(`[${thoiGian}] [${mucDo}]: ${thongDiep}`);
}

// Hàm đã được "curry" hóa
function curryLog(thoiGian) {
  return function (mucDo) {
    return function (thongDiep) {
      console.log(`[${thoiGian}] [${mucDo}]: ${thongDiep}`);
    };
  };
}

// Cách sử dụng:
const logHomNay = curryLog(new Date().toLocaleDateString()); // Áp dụng một phần, tạo hàm log cho ngày hôm nay
const logInfoHomNay = logHomNay("INFO"); // Áp dụng tiếp, tạo hàm log INFO cho hôm nay

logInfoHomNay("Người dùng đã đăng nhập.");
logInfoHomNay("Người dùng đã cập nhật hồ sơ.");
```

---

## **II. Promises & Async/Await**

### **1. Promises**

> **A Promise** is an object representing a future value (or error), commonly used for handling asynchronous actions, making code more readable and avoiding callback hell.

#### 🌳 **3 Promise States**

| **State** | **Meaning**                                       |
| --------- | ------------------------------------------------- |
| Pending   | Promise just created, not yet completed or failed |
| Fulfilled | The action succeeded and returned a value         |
| Rejected  | The action failed and returned an error           |

```js
const demoPromise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const isSuccess = true;
    if (isSuccess) {
      resolve("Thành công!");
    } else {
      reject("Thất bại!");
    }
  }, 1000);
});
```

#### ⚡ **Handling Promise Results**

- **.then(onFulfilled, onRejected)**: Handle success or failure.
- **.catch(onRejected)**: Handle failure.
- **.finally(onFinally)**: Always executed when the Promise is settled (either fulfilled or rejected).

```js
demoPromise
  .then((result) => {
    console.log("Kết quả:", result); // Thành công!
  })
  .catch((error) => {
    console.error("Lỗi:", error);
  })
  .finally(() => {
    console.log("Hoàn tất thao tác!");
  });
```

#### 🔗 **Promise Chaining**

We can chain multiple asynchronous actions by returning a Promise in a .then().

```js
function plus1(x) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(x + 1), 500);
  });
}

plus1(1)
  .then((result) => {
    console.log(result); // 2
    return plus1(result);
  })
  .then((result) => {
    console.log(result); // 3
  });
```

#### 🛠️ **Handling Multiple Promises in Parallel**

| **Method**                      | **Description**                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Promise.all([p1, p2, ...])`    | Waits for all Promises to complete, returns array of results. Any rejected Promise rejects all. |
| `Promise.race([p1, p2, ...])`   | Returns result of the first settled Promise (fulfilled or rejected).                            |
| `Promise.allSettled([p1, ...])` | Returns status and value/reason for all Promises, regardless of outcome.                        |
| `Promise.any([p1, ...])`        | Returns value of the first fulfilled Promise. If all are rejected, returns an AggregateError.   |

```js
Promise.all([p1, p2])
  .then(([v1, v2]) => {
    /*...*/
  })
  .catch((err) => {
    /*...*/
  });
```

---

> **Summary:**
>
> - The asynchronous flow ensures JS apps don't "freeze" while handling multiple tasks.
> - Closures are powerful for data protection, modularization, and functional programming.
> - Promises make asynchronous code more readable and maintainable.
