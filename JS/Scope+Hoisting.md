Optimized tool selectionHere are concise explanations for each concept in JavaScript:

**var vs let vs const**

- `var`: Function-scoped or globally scoped. Can be redeclared and updated. Hoisted (initialized as undefined).
- `let`: Block-scoped. Cannot be redeclared in the same scope, but can be updated. Hoisted but not initialized (see TDZ).
- `const`: Block-scoped. Must be initialized at declaration and cannot be reassigned. The binding is constant, but object properties can still be changed.

**Temporal Dead Zone (TDZ)**

- is a specific behavior in JavaScript where a variable is inaccessible from the moment its containing scope begins until the moment it is actually declared. Accessing the variable in this zone throws a ReferenceError. Example:
  ```js
  console.log(a); // ReferenceError
  let a = 5;
  ```

**Closure**

- A closure is a function that "remembers" its lexical scope even when executed outside that scope. Example:
  ```js
  function outer() {
    let x = 10;
    return function inner() {
      console.log(x); // x is remembered
    };
  }
  const fn = outer();
  fn(); // prints 10
  ```

**Lexical Scope**

- In JavaScript, lexical scope (also known as static scope) means that the accessibility of variables is determined by their physical location in the source code. Inner functions have access to variables defined in their outer (parent) scopes. Example:
  ```js
  function outer() {
    let x = 1;
    function inner() {
      console.log(x); // x is accessible here
    }
    inner();
  }
  ```

Let me know if you want code examples or a deeper dive into any of these!
