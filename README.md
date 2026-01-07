ECMAScript First-Class Protocols Proposal
=========================================

As of ES2015, new ECMAScript standard library APIs have used a protocol-based
design, enabled by the introduction of Symbols. Symbols are ECMAScript values
which have identity and may be used as object property keys. The goal of this
proposal is to provide a convenient syntactic facility for protocol-based
design.

Stage: **1**

Champions:
- Michael Ficarra (@michaelficarra)
- Lea Verou (@leaverou)

## What does it look like?

### Basic syntax

The syntax for declaring a protocol looks like this:

```js
protocol Foldable {
  // required members
  foldr;

  // provided members
  toArray() {
    return this[Foldable.foldr]((m, a) => [a].concat(m), []);
  }
  get length() {
    return this[Foldable.foldr](m => m + 1, 0);
  }
}
```

Field-like declarations define **required members** whereas methods and accessors define **provided members**.
Despite the syntactic similarity to class elements, the names of protocol members are actually symbols, which ensures uniqueness and prevents name collisions.
E.g. in this example, the required member is not a `"foldr"` property, but a `Foldable.foldr` symbol,
and the two methods provided will not be added to classes as `"toArray"` or `"length"` properties, but as `Foldable.toArray` and `Foldable.length` symbols.

Once a protocol is declared, it can be _implemented_ on any class that satisfies the protocol's requirements (currently only property presence).

> [!IMPORTANT]
> Currently the only constraint is around property presence. See issue [#4](https://github.com/tc39/proposal-first-class-protocols/issues/4) for discussion on additional constraint types.

One possible syntax is via the `implements` keyword:
```js
class C implements Foldable {
  [Foldable.foldr](f, memo) {
    // implementation elided
  }
}
```

By implementing `Foldable`, class `C` now gained a `C.prototype[Foldable.toArray]` method and a `C.prototype[Foldable.length]` accessor, which it can choose to expose to the outside world like so:

```js
class C implements Foldable {
  [Foldable.foldr](f, memo) {
    // implementation elided
  }

  get toArray() {
    return this[Foldable.toArray];
  }

  get length() {
    return this[Foldable.length];
  }
}
```

### Sugar for defining required members

Conveniences can be provided for implementing protocols without repeating members names through a new ClassElement for declaring protocol implementation:

```js
class NEList {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }

  implements protocol Foldable {
    // Sugar for defining [Foldable.foldr]
    foldr (f, memo) {
      // implementation elided
    }
  }
}
```

> [!IMPORTANT]
> Is this useful? Should it be generalized beyond protocols? See [#56](https://github.com/tc39/proposal-first-class-protocols/issues/56).

### Inline implementations for existing classes

While typically classes are protocol consumers, protocols can also define implementations for existing classes, including built-in classes:

```js
protocol Foldable {
  // ...

  implemented by Array {
    foldr (f, memo) {
      // implementation elided
    }
  }
}
```

> [!IMPORTANT]
> Is this MVP, given `Protocol.implement()` can also do this? See issue [#63](https://github.com/tc39/proposal-first-class-protocols/issues/63).

### Dynamic implementation

Protocol implementation can also be entirely decoupled from both protocol and class definition, via the `Protocol.implement()` function:

```js
protocol Functor { map; }

class NEList {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
}

NEList.prototype[Functor.map] = function (f) {
  // implementation elided
};

Protocol.implement(NEList, Functor);
```

### Protocol composition

Like classes, protocols can use inheritance to compose progressively more complex protocols from simpler ones:

```js
protocol A { a; }
protocol B extends A { b; }

class C {
  implements protocol B {
    a() {}
    b() {}
  }
}

// or

class C {
  implements protocol A {
    a() {}
  }
  implements protocol B {
    b() {}
  }
}
```

### Imperative protocol construction

Protocols can also be constructed imperatively, via the `Protocol()` constructor.
All options are optional.

```js
const Foldable = new Protocol({
  name: 'Foldable',
  extends: [ ... ],
  requires: {
    foldr: Symbol('Foldable.foldr'),
  },
  staticRequires: { ... },
  provides:
    Object.getOwnPropertyDescriptors({
      toArray() { ... },
      get length() { ... },
      contains(eq, e) { ... },
    }),
  staticProvides: // ...,
});
```

### Querying protocol membership

An `implements` operator can be used to query protocol membership, by checking whether a class satisfies a protocol's requirements and includes its provided members.

```js
if (C implements P) {
  // reached iff C has all fields
  // required by P and all fields
  // provided by P
}
```

### String required fields

Committee feedback was that string-based fields are required for FCPs to be able to describe protocols already in the language, such as thenables.
This is possible by quoting the required member name in the protocol declaration:

```js
protocol P {
  "a";
  b(){ print('b'); }
}

class C {
  a() {}
  implements protocol P {}
}

C implements P; // true
(new C)[P.b](); // prints 'b'
```


## How can I play with it?

An outdated prototype using [sweet.js](https://www.sweetjs.org/) is available at
https://github.com/disnet/sweet-interfaces. It needs to be updated to use the
latest syntax. A polyfill for the runtime components is available at
https://github.com/michaelficarra/proposal-first-class-protocols-polyfill.


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
};

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

## History

* [July 2018 presentation to the committee](/July%202018%20Update_%20ECMAScript%20Proposal_%20First-Class%20Protocols.pdf)
* [Initial proposal at the September 2017 TC39 meeting](https://github.com/tc39/agendas/blob/master/2017/09.md)
