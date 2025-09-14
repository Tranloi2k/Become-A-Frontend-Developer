# 🌟 **Advanced JavaScript**

## **I. Closure**

> **A closure** is a function that "remembers" the scope where it was created, allowing it to access variables from its parent function even after the parent has finished execution.

### 🌱 **Basic Closure Example**

```js
function outer() {
  let counter = 0;
  function inner() {
    counter++;
    return counter;
  }
  return inner;
}
const fn = outer();
console.log(fn()); // 1
console.log(fn()); // 2
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
function sum(a) {
  return function (b) {
    return function (c) {
      return a + b + c;
    };
  };
}
console.log(sum(1)(2)(3)); // 6
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
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve("done!"), 1000);
});
```

#### ⚡ **Handling Promise Results**

- **.then(onFulfilled, onRejected)**: Handle success or failure.
- **.catch(onRejected)**: Handle failure.
- **.finally(onFinally)**: Always executed when the Promise is settled (either fulfilled or rejected).

```js
p.then((result) => {
  console.log(result);
})
  .catch((err) => {
    console.error(err);
  })
  .finally(() => {
    console.log("Finished");
  });
```

#### 🔗 **Promise Chaining**

Chain multiple asynchronous operations.

```js
doA()
  .then((resultA) => doB(resultA))
  .then((resultB) => doC(resultB))
  .catch((error) => handleError(error));
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
