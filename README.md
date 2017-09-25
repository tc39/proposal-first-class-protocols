ECMAScript First-Class Protocols Proposal
=========================================

As of ES2015, new ECMAScript standard library APIs have used a protocol-based
design, enabled by the introduction of Symbols. Symbols are ECMAScript values
which have identity and may be used as object property keys. The goal of this
proposal is to provide a convenient syntactic facility for protocol-based
design.

The proposal has not yet been brought before TC39 and is therefore **Stage 0**.
It was on the [July 2017 agenda](https://github.com/tc39/agendas/blob/master/2017/07.md),
but was postponed until [September 2017](https://github.com/tc39/agendas/blob/master/2017/09.md)
due to time constraints.

## What does it look like?

```js
protocol ProtocolName {
  // declare a symbol which must be implemented
  thisMustBeImplemented;

  // and some methods that you get for free by implementing this protocol
  youGetThisMethodForFree(...parameters) {
      methodBody;
  }
}

class ClassName implements ProtocolName {
  [ProtocolName.thisMustBeImplemented]() {
    // this is the implementation for this class
  }
}

let instance = new ClassName;
instance[ProtocolName.youGetThisMethodForFree]();
```


## How can I play with it?

A prototype using [sweet.js](https://www.sweetjs.org/) is available at
https://github.com/disnet/sweet-interfaces


## What is it used for?

The most well-known protocol in ECMAScript is the iteration protocol. APIs such
as `Array.from`, the `Map` and `Set` constructors, destructuring syntax, and
`for-of` syntax are all built around this protocol. But there are many others.
For example, the protocol defined by `Symbol.toStringTag` could have been
expressed using protocols as

```js
protocol ToString {
  tag;

  toString() {
    return `[object ${this[ToString.tag]}]`;
  }
}

Object.prototype[ToString.tag] = 'Object';
Protocol.implement(Object, ToString);
```

The auto-flattening behaviour of `Promise.prototype.then` was a very controversial decision.
Valid arguments exist for both the auto-flattening and the monadic versions to be the default.
Protocols eliminate this issue in two ways:

1. Symbols are unique and unambiguous. There is no fear of naming collisions,
   and it is clear what function you are using.
1. Protocols may be applied to existing classes, so there is nothing
   preventing consumers with different goals from using their own methods.

```js
protocol Functor {
  map;
}

class Identity {
  constructor(val) { this.val = val; }
  unwrap() { return this.val; }
}

Promise.prototype[Functor.map] = function (f) {
  return this.then(function(x) {
    if (x instanceof Identity) {
      x = x.unwrap();
    }
    let result = f.call(this, x);
    if (result instanceof Promise) {
      result = new Identity(result);
    }
    return result;
  });
}
Protocol.implement(Promise, Functor);
```

Finally, one of the biggest benefits of protocols is that they eliminate the
fear of mutating built-in prototypes. One of the beautiful aspects of
ECMAScript is its ability to extend its built-in prototypes. But with the
limited string namespace, this is untenable in large codebases and impossible
when integrating with third parties. Because protocols are based on symbols,
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
Protocol.implement(String, Ordered);
```


## Features

### protocol inheritance

Protocols may extend other protocols. This expresses a dependency
relationship between the protocols.

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


### protocols throw when not fully implemented

If a class that is implementing a protocol is missing some of the required
symbols, it will fail at class definition time. This program will throw:

```js
protocol I { a; b; }

class C implements I {
  [I.a]() {}
  // note the missing implementation of I.b
}
```

### minimal implementations

Minimal implementations can be expressed using protocol inheritance.

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

### `Protocol.implement`

An important aspect of this proposal is that it needs to be possible to apply
a protocol to an existing class.

```js
protocol Functor {
  map;
}

Array.prototype[Functor.map] = Array.prototype.map;
Protocol.implement(Array, Functor);
```

`Protocol.implement` accepts zero or more protocols following the class.

```js
protocol I {}
protocol K {}

// these are all the same
let c = Protocol.implement(Protocol.implement(class C {}, I), K);
let c = Protocol.implement(class C {}, I, K);
class C implements I implements K {}
```

### `implements` operator

The `implements` operator returns `true` if and only if a given class provides
the symbols required to implement a given protocol as well as the methods
obtained from implementing the protocol.

```js
protocol I { a; b() {} }
protocol K { a; b() {} }

class C {
  [I.a]() {}
}
C implements I; // false
C implements K; // false

class D implements I {
  [I.a]() {}
}
D implements I; // true
D implements K; // false

class E {
  [I.a]() {}
  [I.b]() {}
}
E implements I; // true
E implements K; // false
```

### static symbols and methods

Some protocols require their methods to be put on the constructor instead of
the prototype. Use the `static` modifier for this.

```js
protocol A {
  static b() {}
}

class C implements A { }
C[A.b]();
```

Similarly, require a protocol symbol to be on the constructor instead of the
prototype using the `static` modifier.

```js
protocol Monoid {
  concat;
  static identity;
}
```

### combined export form

To mirror the existing combined declaration/export forms like `export class C {}`,
`export function f() {}`, etc., protocols can be simultaneously declared and
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


1. Should interfaces inherit from Object.prototype?
1. Should protocols be immutable prototype exotic objects? Frozen? Sealed?
1. Do we want to have protocols inherit from some `Protocol.prototype` object so they can be abstracted over?
1. Should implementing a protocol actually copy symbols to prototype/constructor or use internal slots for resolution?
1. Is there a way we can make `super` properties and `super` calls work?
1. How does this have to interact with the global symbol registry?
1. Should methods be created in realm of implementor or just once in realm of definition?


## Relationship to similar features

### Haskell type classes

This proposal was strongly inspired by Haskell's type classes. The conceptual
model is identical aside from the fact that in Haskell the type class instance
(essentially an implicit record) is resolved automatically by the type checker.
For a more Haskell-like calling pattern, one can define functions like

```js
function fmap(fn) {
  return function (functor) {
    return functor[Functor.fmap](fn);
  };
}
```

Similar to how each type in Haskell may only have a single implementation of
each type class (newtypes are used as a workaround), each class in JavaScript
may only have a single implementation of each protocol.

Haskell type classes exist only at the type level and not the term level, so they
cannot be passed around as first class values, and any abstraction over them must
be done through type-level programming mechanisms. The protocols in this proposal
are themselves values which may be passed around as first class citizens.

### Rust traits

Rust traits are very similar to Haskell type classes. Rust traits have
restrictions on implementations for built-in data structures; no such
restriction exists with this proposal. The `implements` operator in this
proposal would be useful in manually guarding a function in a way that Rust's
trait bounds do. Default methods in Rust traits are equivalent to what we've
called methods in this proposal.

### Java interfaces

Java interfaces, as of Java 8, have many of the same features as this proposal.
The biggest difference is that Java interfaces are not ad-hoc, meaning existing
classes cannot be declared to implement protocols after they've already been
defined. Additionally, Java interfaces share the member name namespace with
classes and other interfaces, so they may overlap, shadow, or otherwise be
incompatible, with no way for a user to disambiguate.

### Ruby mixins

Ruby mixins are similar to this proposal in that they allow adding
functionality to existing classes, but different in a number of ways. The
biggest difference is the overlapping/conflicting method names due to
everything existing in one shared namespace. Another difference that is unique
to Ruby mixins, though, is that they have no check that the methods they rely
on are implemented by the implementing class.

### ECMAScript `mixin(...)` pattern

```js
class A extends mixin(SuperClass, FeatureA, FeatureB) {}
```

This mixin pattern usually ends up creating one or more intermediate prototype
objects which sit between the class and its superclass on the prototype chain.
In contrast, this proposal works by copying the inherited protocol methods
into the class or its prototype. This proposal is also built entirely off of
Symbol-named properties, but doing so using existing mechanisms would be
tedious and difficult to do properly. For an example of the complexity involved
in doing it properly, see the output of the sweet.js implementation.


## Links to previous related discussions/strawmen

* [[ES Wiki] strawman:syntax_for_efficient_traits](https://web.archive.org/web/20160616221253/http://wiki.ecmascript.org/doku.php?id=strawman:syntax_for_efficient_traits)
* [[ES Wiki] strawman:classes_with_trait_composition](https://web.archive.org/web/20160318073016/http://wiki.ecmascript.org/doku.php?id=strawman:classes_with_trait_composition)
* [[es-discuss] Traits - current state of discussion](https://esdiscuss.org/topic/traits-current-state-of-discussion)
