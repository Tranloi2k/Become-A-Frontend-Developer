### 1. Prototype & Inheritance

In JavaScript, almost every object has a hidden property called `[[Prototype]]` (accessible in most browsers via `__proto__`).

**Inheritance** in JS works through delegation: when you ask for a property on an object and it isn't there, the browser doesn't give up. It looks at the object's prototype. If it’s not there either, it looks at the prototype's prototype, and so on.

### 2. The Prototype Chain

The **Prototype Chain** is the series of links between objects.

- The chain always ends at `Object.prototype`, which is the "grandparent" of almost all objects.
- The very end of the chain is `null`.
- If a property is not found anywhere in the chain, you get `undefined`.

**Example:**
If you have an Array, it inherits methods like `map()` and `filter()` from `Array.prototype`. If you call `.toString()`, it might go even higher to `Object.prototype`.

---

### 3. Class Syntax: Just "Syntactic Sugar"

In languages like Java or C++, classes are "blueprints" used to create objects. In JavaScript, **classes do not exist** in the traditional sense.

The `class` keyword (introduced in ES6) is **syntactic sugar**. This means it is a cleaner, prettier way to write the same old prototype-based code. Under the hood, JavaScript is still using constructor functions and prototypes.

**Behind the Scenes:**

```javascript
// What you write (Class Syntax):
class Animal {
  constructor(name) {
    this.name = name;
  }
  eat() {
    console.log("Eating...");
  }
}

// What JS actually does (Prototype Syntax):
function Animal(name) {
  this.name = name;
}
Animal.prototype.eat = function () {
  console.log("Eating...");
};
```

---

### 4. Instance Methods vs. Static Methods

When defining a class, you have to decide where the method "lives."

#### **Instance Methods**

These are methods available on the **objects created** by the class. They usually deal with specific data belonging to that instance (using `this`).

- **Where they live:** On the `.prototype`.
- **Access:** `myObject.methodName()`.

#### **Static Methods**

These are methods called on the **Class itself**, not on an instance. They are often utility functions (like `Math.random()` or `Array.from()`).

- **Where they live:** On the constructor function itself, not the prototype.
- **Access:** `ClassName.methodName()`.
- **Key limitation:** They cannot access `this` (the instance data).

| Feature       | Instance Method                    | Static Method                          |
| ------------- | ---------------------------------- | -------------------------------------- |
| **Keyword**   | None                               | `static`                               |
| **Called on** | The instance (`const a = new A()`) | The Class (`A.method()`)               |
| **Use case**  | Operating on specific object data  | General utilities related to the class |

### Summary

1. **Prototypes** are objects from which other objects inherit properties.
2. The **Chain** is the path JS travels to find a property.
3. **Classes** are just a "mask" over the prototype system to make it look like other languages.
4. **Instance methods** belong to the "child" (object); **Static methods** belong to the "parent" (class definition).
