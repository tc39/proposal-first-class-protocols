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
interface InterfaceName {
  // declare a symbol which much be implemented
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
instance.youGetThisMethodForFree();
```


## How can I play with it?

A prototype using [sweet.js](https://www.sweetjs.org/) is available at
https://github.com/disnet/sweet-algebras


## What is it used for?

The most well-known protocol in ECMAScript is the iteration protocol. APIs such
as `Array.from`, the `Map` and `Set` constructors, destructuring syntax, and
`for-of` syntax are all built around this protocol. But there are many others.
For example, the protocol defined by `Symbol.toStringTag` could have been
expressed using interfaces as

```js
interface ToString {
  tag;

  toString() {
    return `[object ${this[ToString.tag]}]`;
  }
}

Object.prototype[ToString.tag] = 'Object';
Object implements ToString;
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
interface Monad extends Applicative {
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
Promise implements Monad;
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

interface Ordered {
  compare;

  lessThan(other) {
    return this[Ordered.compare](other) === Ordering.LT;
  }
}

String.prototype[Ordered.compare] = function() { /* elided */ };
String implements Ordered;
```


## Features

### interface inheritance

Interfaces may extend other interfaces. This expresses a dependency
relationship between the interfaces.

```js
interface A { a; }
interface B extends A { b; }

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
interface I { a; b; }

class C implements I {
  [I.a]() {}
  // note the missing implementation of I.b
}
```

### minimal implementations

Minimal implementations can be expressed using interface inheritance.

```js
// Applicative elided
interface Monad extends Applicative {
  bind;
  join;
  kleisli() {}
}

// two possible minimal implementations for Monad
interface MonadViaBind extends Monad {
  [Monad.join]() { /* default implementation in terms of bind elided */ }
}
interface MonadViaJoin extends Monad {
  [Monad.bind]() { /* default implementation in terms of join elided */ }
}

class C implements MonadViaBind {
  [Monad.bind]() {}
}
class D implements MonadViaJoin {
  [Monad.join]() {}
}
```

### `implements` operator

An important aspect of this proposal is that it needs to be possible to apply
an interface to an existing class.

```js
interface Functor {
  map;
}

Array.prototype[Functor.map] = Array.prototype.map;
Array implements Functor;
```

The `implements` operator returns its left operand to allow for chaining.

```js
C implements A implements B;
```

is equivalent to

```js
C implements A;
C implements B;
```

### static fields and methods

Some interfaces require their methods to be put on the constructor instead of
the prototype. Use the `static` modifier for this.

```js
interface A {
  static b() {}
}

class C implements A { }
C.b();
```

Similarly, require an interface field to be on the constructor instead of the
prototype using the `static` modifier.

```js
interface Monoid {
  concat;
  static identity;
}
```


## Details

See the tests in https://github.com/disnet/sweet-algebras/tree/master/test for
specific details about the proposal.


## Open questions or issues

1. Should method names be symbols like fields?
1. Relatedly, if we stick with strings, what do we do about method names that conflict with existing ones on the implementer?
1. Do we want to have a way to query whether a class implements an interface?
1. `export interface ...` form?


## Relationship to similar features

### Haskell-style typeclasses

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
