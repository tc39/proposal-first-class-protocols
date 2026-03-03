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

## Contents

1. [What does it look like?](#what-does-it-look-like)
   1. [Defining protocols](#defining-protocols)
   2. [Implementing protocols on objects](#implementing-protocols-on-objects)
   3. [Specifying and implementing protocols on constructors](#specifying-and-implementing-protocols-on-constructors)
   4. [Sub-protocols](#sub-protocols)
   5. [Inline implementations for existing classes](#inline-implementations-for-existing-classes)
   6. [Protocol composition](#protocol-composition)
   7. [Imperative protocol construction](#imperative-protocol-construction)
   8. [Protocol introspection](#protocol-introspection)
   9. [Querying protocol membership](#querying-protocol-membership)
   10. [Providing explicit member names](#providing-explicit-member-names)
2. [How can I play with it?](#how-can-i-play-with-it)
3. [What is it used for?](#what-is-it-used-for)
4. [Relationship to similar features](#relationship-to-similar-features)
   1. [Haskell type classes](#haskell-type-classes)
   2. [Rust traits](#rust-traits)
   3. [Java 8+ interfaces](#java-8-interfaces)
   4. [Ruby mixins](#ruby-mixins)
   5. [ECMAScript `mixin(...)` pattern](#ecmascript-mixin-pattern)
5. [Links to previous related discussions/strawmen](#links-to-previous-related-discussionsstrawmen)
6. [History](#history)
7. [Changelog](#changelog)
   1. [Feb 24, 2026](#feb-24-2026)
   2. [From the 2018 update](#from-the-2018-update)


## What does it look like?

### Defining protocols

The syntax for declaring a protocol looks like this:

```js
protocol Foldable {
  requires foldr;

  // provided members
  toArray() {
    return this[Foldable.foldr]((m, a) => [a].concat(m), []);
  }
  get length() {
    return this[Foldable.foldr](m => m + 1, 0);
  }
}
```

> [!IMPORTANT]
> An alternative to the `requires` keyword is `abstract`. See issue [#50](https://github.com/tc39/proposal-first-class-protocols/issues/50).

Required members are defined by the `requires` keyword.
Any other member is _provided_.
Protocols can have only required members, only provided members, or both.

Despite the syntactic similarity to class elements, the names of protocol members are actually **symbols**, which ensures uniqueness and prevents name collisions.
E.g. in this example, the required member is not a `"foldr"` property, but a `Foldable.foldr` symbol,
and the two methods provided will not be added to classes as `"toArray"` or `"length"` properties, but as `Foldable.toArray` and `Foldable.length` symbols.

### Implementing protocols on objects

Once a protocol is declared, it can be _implemented_ on any object that satisfies the protocol's requirements through a `Protocol.implement()` method.

> [!IMPORTANT]
> Currently the only constraint is around property presence. See issue [#4](https://github.com/tc39/proposal-first-class-protocols/issues/4) for discussion on additional constraint types.

Implementing a protocol on an object is equivalent to copying the protocol's members to the object.

```js
let obj = {
  [Foldable.foldr](f, memo) {
    // implementation elided
  }
}
Protocol.implement(obj, Foldable);
//=> obj[Foldable.toArray] and obj[Foldable.length] are now available
```


### Specifying and implementing protocols on constructors

In addition to `Protocol.implement()`, which works for any object, constructors support declaratively implementing protocols on their prototype via the `implements` keyword:

```js
class C implements Foldable {
  [Foldable.foldr](f, memo) {
    // implementation elided
  }
}


//=> C.prototype[Foldable.toArray] and C.prototype[Foldable.length] are now available
//=> C.prototype implements Foldable === true
let c = new C();
//=> c implements Foldable === true
```

When protocols are implemented on constructors (via the `class C implements P` syntax), they are installed on the class `.prototype` object, i.e. they are equivalent to `Protocol.implement(C.prototype, P)`.

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

### Sub-protocols

A required member can also be required to implement one or more sub-protocols, specified inline or by reference.

This can be used to specify static members on protocols meant to be used on classes:

```js
protocol Foldable {
  requires foldr;

  // provided members
  toArray() {
    return this[Foldable.foldr]((m, a) => [a].concat(m), []);
  }
  get length() {
    return this[Foldable.foldr](m => m + 1, 0);
  }

  requires ["constructor"] implements protocol {
    from () { /* elided */ }
  }
}

class C implements Foldable {
  [Foldable.foldr](f, memo) {
    // implementation elided
  }
}

//=> C.prototype.constructor[Foldable.from] is now available
// Therefore, C[Foldable.from] is now available
```
> [!IMPORTANT]
> Actually, `Foldable.from` would *not* be available. This is an open design dilemma, see #81 for discussion.
>[!IMPORTANT]
> Should `constructor` and `prototype` be _always_ implicitly strings and not create symbols on the protocol object? See issue [#84](https://github.com/tc39/proposal-first-class-protocols/issues/84)

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

### Protocol composition

Once created, protocols are frozen and cannot be modified.
Instead, inheritance can be used to create new protocols from existing ones.
The syntax and semantics are similar to classes:

```js
protocol A { requires a; }
protocol B extends A { requires b; }

class C implements B {
  [B.a]() {}
  [B.b]() {}
}

// or

class C implements A, B {
  [A.a]() {}
  [B.b]() {}
}
```

> [!IMPORTANT]
> See issue [#23](https://github.com/tc39/proposal-first-class-protocols/issues/23) for discussion on the exact implementation and semantics of protocol composition.

### Imperative protocol construction

Protocols can also be constructed imperatively, via the `Protocol()` constructor.
All options are optional.

```js
const Foldable = new Protocol({
  name: 'Foldable',
  extends: [ ... ],
  members: {
    foldr: { required: true },
    toArray: {
      value: function () { ... },
    },
    length: {
      get: function () { ... },
      set: function (value) { ... },
    },
    contains: {
      value: function (eq, e) { ... },
    },
  }
});
```

### Protocol introspection

`Protocol.describe(p)` takes an existing protocol object and returns an object literal that could be passed to the constructor to create a new protocol.

```js
const P = Protocol.describe(Foldable);
// => {
//   name: 'Foldable',
//   members: {
//     foldr: { required: true },
//     toArray: {
//       value: function () { ... },
//     },
//     length: {
//       get: function () { ... },
//       set: function (value) { ... },
//     },
//     contains: {
//       value: function (eq, e) { ... },
//     },
//   }
// }
```

> [!IMPORTANT]
> The exact shape is TBD (see #82). One design decision that affects it is whether `"foo"` and `foo` are distinct members (see #59).
### Querying protocol membership

An `implements` operator can be used to query protocol membership, by checking whether an object satisfies a protocol's requirements and includes its provided members.

```js
if (obj implements P) {
  // reached iff obj has all fields
  // required by P and all fields
  // provided by P
}
```

### Providing explicit member names

By default, both provided and required member names actually define symbols on the protocol object, which is a key part of how protocols avoid conflicts.
It is possible to provide an explicit member name that will be used verbatim, by using [_ComputedPropertyName_](https://tc39.es/ecma262/#prod-ComputedPropertyName) syntax:

```js
protocol P {
  requires ["a"];
  b(){ print('b'); }
}

class C implements P {
  a() {}
}

C implements P; // true
(new C)[P.b](); // prints 'b'
```

This makes it possible to describe protocols already in the language which is necessary per committee feedback.
This includes protocols whose required members are strings, such as [thenables](examples/thenable.js),
as well as protocols whose required members are existing symbols, such as the [iteration protocol](examples/iterable.js):

```js
protocol Iterable {
  requires [Symbol.iterator];

  forEach(f) {
    for (let entry of this) {
      f.call(this, entry);
    }
  }

  // ...
}
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
  requires tag;

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
  requires map;
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
  requires compare;

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

## Changelog

### Feb 24, 2026

- Removed `static` members
- Added sub-protocols
- Edited constructor signature to represent current thinking
- Added `Protocol.describe()`

### From the 2018 update

- Removed the `implements` ClassElement syntax ([#56](https://github.com/tc39/proposal-first-class-protocols/issues/56#issuecomment-3717193577))
- Explicit member names now use ComputedPropertyName syntax ([#48](https://github.com/tc39/proposal-first-class-protocols/issues/48))
- Added explicit `requires` keyword ([#50](https://github.com/tc39/proposal-first-class-protocols/issues/50))
