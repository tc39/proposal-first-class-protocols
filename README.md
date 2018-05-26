ECMAScript First-Class Protocols Proposal
=========================================

The proposal is at **Stage 1** after having been proposed at the
[September 2017](https://github.com/tc39/agendas/blob/master/2017/09.md)
TC39 meeting.

## What does it look like?

```js
protocol ProtocolName {
  // declare a symbol which must be implemented
  requiredMethodName;

  // and some methods that are provided by implementing this protocol
  providedMethodName(...parameters) {
    ...method body...
  }
}

class ClassName {
  implements ProtocolName {
    requiredMethodName() {
      console.log('hello yes i am the required one have a nice day');
    }
  }
}

let instance = new ClassName();
instance[ProtocolName].providedMethodName();
```

## What is it used for?

The most well-known protocol in ECMAScript is the iteration protocol. APIs such
as `Array.from`, the `Map` and `Set` constructors, destructuring syntax, and
`for-of` syntax are all built around this protocol. But there are many others.

```js
protocol ToString {
  tag;

  toString() {
    return `[object ${this[ToString].tag}]`;
  }

  // Coherence-guaranteed implementation for existing classes
  implFor Object {
    tag = 'Object';
  };
}
```

Protocols isolate implementations meant for different purposes by keeping them
in a separate object with certain static guarantees.

One of the biggest benefits of protocols is that they eliminate the
fear of mutating built-in prototypes in potentially conflicting ways. One of the
beautiful aspects of ECMAScript is its ability to extend its built-in
prototypes. But with the limited string namespace, this is untenable in large
codebases and impossible when integrating with third parties. Because protocols
are based on symbols and support coherence, this is no longer an anti-pattern.

```js
class Ordering {
  constructor (str) { this.symbol = Symbol(str) }
}

protocol Ordered {
  static LT = new Ordering('LT');
  static EQ = new Ordering('EQ');
  static GT = new Ordering('GT');
  static fromNum (num) {
      if (num < 0) return Ordered.LT;
      if (num === 0) return Ordered.EQ;
      if (num > 0) return Ordered.GT;
    }
  }
  compare;

  lessThan(other) {
    return this[Ordered].compare(other) === Ordered.LT;
  }

  implFor String {
    compare(other) {
      return Ordered.fromNum(String.localeCompare(other));
    }
  }

  implFor Number {
    compare(other) {...}
  }
}

(2)[Ordered].compare(1) // Ordered.GT
'a'[Ordered].lessThan('aa') // true
```

## Other Features

### protocol inheritance

Protocols may extend other protocols. This expresses a dependency relationship
between the protocols.

```js
protocol Iterator { next; }
protocol PeekableIterator extends Iterator { prev; }

class BackAndForth {
  constructor (values) {
    this.values = [...values]
    this.idx = 0
  }
  // Iterator MUST be implemented if PeekableIterator is being defined.
  // If a superclass implemented Iterator already, though, that counts.
  implements Iterator {
    next() { ... }
  }
  implements PeekableIterator {
    prev() { ... }
  }
}

// This throws an ProtocolDependencyError, because Iterator must be implemented
class OnlyPeeks {
  implements PeekableIterator {
    prev() { ... }
  }
}
```

### protocols throw when not fully implemented

If a class that is implementing a protocol is missing some of the required
symbols, it will fail at class definition time. This program will throw:

```js
protocol I { a; b; }

class C {
  implements I {
    a() {}
    // b() {}
    // ^__ throws PartialImplError
  }
}
```

### `implFor <class>`

An important aspect of this proposal is that it needs to be possible to apply
a protocol to an existing class.

```js
protocol Functor {
  map;

  implFor Array {
    map() { return this.map.apply(this, arguments) }
  }
}
```

Having `implFor` allows extending existing prototypes for one's own purposes
while preventing multiple conflicting implementations using the same protocol
symbols. With this format, there's only two ways to implement a protocol:

1. Using the new `implements` keyword in `class` bodies, which allows new class definitions to use a pre-existing protocol.
2. Using `implFor` to make an existing class comply with the protocol.

If you do not own one or the other, you are unable to implement the protocol. It
is impossible to define individual protocol properties and methods in class
definitions without using the `implements` keyword. This guarantees coherence,
which means a protocol can only be implemented once and only once, globally.

### `implements` operator

The `implements` operator returns `true` iff a given class has implemented a
protocol, or if a protocol has provided an `implFor` for an existing class.
There is no way to define individual protocol methods on a class without using
one of these two methods.

```js
protocol I { a; b() {} }
protocol K { a; b() {} }

class D {
  implements I {
    a() {}
  }
}
D implements I; // true
D implements K; // false

class F {
  implements I {
    a() {}
  }
  implements K {
    a() {}
  }
}
D implements I; // true
D implements K; // true
```

### static methods

Static protocol methods are added to the protocol object itself, not to classes
that implement it:

```js
protocol A {
  static b = 'b'
  static c() { return 'c'; }
}

A.b() // 'b'
A.c() // 'c'
```

### Legacy string-based protocols

There is no way to implement or enforce classic property-based protocols using
this language feature. At best, one can implement public interfaces into one
specific protocol implementation:

```js
protocol Thenable {
  then;

  implFor Promise {
    // Forward the private Thenable then() method to the existing public
    then() { return this.then.apply(this, arguments) }
  }
}

// Alternately, editing our own implementation to add the impl.
class MyOldDeferred {
  then(onResolve, onReject) {
    ...legacy impl...
  }
  implements Thenable {
    then(onResolve, onReject) {
      // Call the toplevel, regular method.
      return this.then(onResolve, onReject)
    }
  }
}

// These both do the same thing.
new MyOldDeferred().then(console.log)
new MyOldDeferred()[Thenable].then(console.log)
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

### `super`

The `super` keyword inside a protocol implementation works as it usually would:

```js
protocol Proto { then; }

class Parent {
  implements Proto {
    greet() { return 'hello'; }
  }
}

class Child extends Parent {
  implements Proto {
    greet() { return super[Proto].greet() + ' world'; }
  }
}

```

## Open questions or issues

1. Should protocols inherit from Object.prototype?
1. Should protocols be immutable prototype exotic objects? Frozen? Sealed?
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
may only have a single implementation of each protocol. Haskell programmers
get around this limitation through the use of newtypes. Users of this proposal
will extend the protocol they wish to implement with each possible alternative
and allow the consumer to choose the implementation with the symbol they use.

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

The coherence restrictions in this proposal (not allowing implementations
outside of `class` or `protocol` bodies) are based on Rust's coherence
restrictions and adapted for JavaScript itself. Unlike Rust's, the restrictions
in this proposal are more flexible because they allow using multiple overlapping
methods from separate protocols in the same module, unlike Rust.

### Java 8+ interfaces

Java interfaces, as of Java 8, have many of the same features as this proposal.
The biggest difference is that Java interfaces are not ad-hoc, meaning existing
classes cannot be declared to implement interfaces after they've already been
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
In contrast, this proposal works by copying the provided protocol methods
into the class or its prototype. This proposal is also built entirely off of
Symbol-named properties, but doing so using existing mechanisms would be
tedious and difficult to do properly. For an example of the complexity involved
in doing it properly, see the output of the sweet.js implementation.


## Links to previous related discussions/strawmen

* [[ES Wiki] strawman:syntax_for_efficient_traits](https://web.archive.org/web/20160616221253/http://wiki.ecmascript.org/doku.php?id=strawman:syntax_for_efficient_traits)
* [[ES Wiki] strawman:classes_with_trait_composition](https://web.archive.org/web/20160318073016/http://wiki.ecmascript.org/doku.php?id=strawman:classes_with_trait_composition)
* [[es-discuss] Traits - current state of discussion](https://esdiscuss.org/topic/traits-current-state-of-discussion)
