ECMAScript Interfaces Proposal
==============================

As of ES2015, new ECMAScript standard library APIs have used a protocol-based
design, enabled by the introduction of Symbols. Symbols are ECMAScript values
which have identity and may be used as object property keys. The goal of this
proposal is to provide a convenient syntactic facility for protocol-based
design.

The proposal has not yet been brought before TC39 and is therefore **Stage 0**.
It is on the [July 2017 agenda](https://github.com/tc39/agendas/blob/master/2017/07.md).

## What does it look like?

```js
protocol InterfaceName {
  // declare a symbol which must be implemented
  thisMustBeImplemented;

  // and some methods that you get for free by implementing this interface
  youGetThisMethodForFree(...parameters) {
      methodBody;
  }
}

class ClassName implements InterfaceName {
  [InterfaceName.thisMustBeImplemented]() {
    // this is the implementation for this class
  }
}

let instance = new ClassName;
instance[InterfaceName.youGetThisMethodForFree]();
```


## How can I play with it?

A prototype using [sweet.js](https://www.sweetjs.org/) is available at
https://github.com/disnet/sweet-interfaces


## What is it used for?

The most well-known protocol in ECMAScript is the iteration protocol. APIs such
as `Array.from`, the `Map` and `Set` constructors, destructuring syntax, and
`for-of` syntax are all built around this protocol. But there are many others.
For example, the protocol defined by `Symbol.toStringTag` could have been
expressed using interfaces as

```js
protocol ToString {
  tag;

  toString() {
    return `[object ${this[ToString.tag]}]`;
  }
}

Object.prototype[ToString.tag] = 'Object';
Reflect.implement(Object, ToString);
```

The auto-flattening behaviour of `Promise.prototype.then` was a very controversial decision.
Valid arguments exist for both the auto-flattening and the monadic versions to be the default.
Interfaces eliminate this issue in two ways:

1. Symbols are unique and unambiguous. There is no fear of naming collisions,
   and it is clear what function you are using.
1. Interfaces may be applied to existing classes, so there is nothing
   preventing consumers with different goals from using their own methods.

```js
// Applicative elided here
protocol Monad extends Applicative {
  bind;
}

class Identity {
  constructor(val) { this.val = val; }
  unwrap() { return this.val; }
}

Promise.prototype[Monad.bind] = function (f) {
  this.then(function(...args) {
    return new Identity(f.apply(this, args));
  }).unwrap();
}
Reflect.implement(Promise, Monad);
```

Finally, one of the biggest benefits of interfaces is that they eliminate the
fear of mutating built-in prototypes. One of the beautiful aspects of
ECMAScript is its ability to extend its built-in prototypes. But with the
limited string namespace, this is untenable in large codebases and impossible
when integrating with third parties. Because interfaces are based on symbols,
this is no longer an anti-pattern.

```js
class Ordering {
  static LT = new Ordering;
  static EQ = new Ordering;
  static GT = new Ordering;
}

protocol Ordered {
  compare;

  lessThan(other) {
    return this[Ordered.compare](other) === Ordering.LT;
  }
}

String.prototype[Ordered.compare] = function() { /* elided */ };
Reflect.implement(String, Ordered);
```


## Features

### interface inheritance

Interfaces may extend other interfaces. This expresses a dependency
relationship between the interfaces.

```js
protocol A { a; }
protocol B extends A { b; }

class C implements B {
  [A.a]() {}
  [B.b]() {}
}

class D implements A {
  [A.a]() {}
}
```

In the example above, notice how B extends A and any class that implements B
must also implement A.


### interfaces throw when not fully implemented

If a class that is implementing an interface is missing some of the required
fields, it will fail at class definition time. This program will throw:

```js
protocol I { a; b; }

class C implements I {
  [I.a]() {}
  // note the missing implementation of I.b
}
```

### minimal implementations

Minimal implementations can be expressed using interface inheritance.

```js
// Applicative elided
protocol Monad extends Applicative {
  bind;
  join;
  kleisli() {}
}

// two possible minimal implementations for Monad
protocol MonadViaBind extends Monad {
  [Monad.join]() { /* default implementation in terms of bind elided */ }
}
protocol MonadViaJoin extends Monad {
  [Monad.bind]() { /* default implementation in terms of join elided */ }
}

class C implements MonadViaBind {
  [Monad.bind]() {}
}
class D implements MonadViaJoin {
  [Monad.join]() {}
}
```

### `Reflect.implement`

An important aspect of this proposal is that it needs to be possible to apply
an interface to an existing class.

```js
protocol Functor {
  map;
}

Array.prototype[Functor.map] = Array.prototype.map;
Reflect.implement(Array, Functor);
```

`Reflect.implement` accepts zero or more interfaces following the class.

```js
interface I {}
interface K {}

// these are all the same
let c = Reflect.implement(Reflect.implement(class C {}, I), K);
let c = Reflect.implement(class C {}, I, K);
class C implements I implements K {}
```

### `implements` operator

The `implements` operator returns `true` if and only if a given class provides
the fields required to implement a given interface as well as the methods
obtained from implementing the interface.

```js
protocol I { a; b() {} }
protocol K { a; b() {} }

class C { [I.a]() {} }
C implements I; // false
C implements K; // false

class D implements I { [I.a]() {} }
D implements I; // true
D implements K; // false

class E {
  [I.a]() {}
  [I.b]() {}
}
E implements I; // true
E implements K; // false
```

### static fields and methods

Some interfaces require their methods to be put on the constructor instead of
the prototype. Use the `static` modifier for this.

```js
protocol A {
  static b() {}
}

class C implements A { }
C[A.b]();
```

Similarly, require an interface field to be on the constructor instead of the
prototype using the `static` modifier.

```js
protocol Monoid {
  concat;
  static identity;
}
```

### combined export form

To mirror the existing combined declaration/export forms like `export class C {}`,
`export function f() {}`, etc., interfaces can be simultaneously declared and
exported using a similar combined form.

```js
export protocol I {
  // ...
}
```


## Details

See the tests in https://github.com/disnet/sweet-interfaces/tree/master/test for
specific details about the proposal.


## Open questions or issues

1. Should interfaces be immutable prototype exotic objects? Frozen?
1. Do we want to have interfaces inherit from some `Interface.prototype` object so they can be abstracted over?


## Relationship to similar features

### Haskell-style typeclasses

TODO

### Rust traits

TODO

### Java-style interfaces

TODO

### Ruby-style mixins

TODO

### ECMAScript `mixin(...)` pattern

```js
class A extends mixin(FeatureA, FeatureB) {}
```

TODO

### ECMAScript proposed bind (`::`) operator

TODO
