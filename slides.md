# Slide outline for Mar 2026 TC39 meeting (WIP)

## History

- 2017: Stage 1
- 2018: Update
- 2019-2024: 🦗🦗🦗
- Nov 2025: Renewed interest
- Jan 2026: New co-champions
- Mar 2026: Big update!

## Today

- Reminders: getting back up to speed with the proposal
- Changes since 2018 and current status
- Unresolved design challenges
- Open discussion and committee feedback

## Motivation

- Describe well-known interfaces
- Encourage Symbol-based interfaces
- Don't require coordination between producer and consumer
- Don't require coordination across multiple producers
- All the fun and convenience of monkey-patching built-ins, none of the downsides
- Gives us a standard way to model and refer to existing built-in protocols like iteration
- More principled duck typing

## Motivation continued: real-world use cases

- Reify existing built-in protocols (both symbol-based and string-based)
  - iteration
  - generator
  - to string (`toString`) and Object.prototype.toString (`toStringTag`)
  - to primitive (`valueOf`)
  - to JSON (`toJSON`)
  - thenables
  - concat spreadable
  - unscopeable
  - regular expression stuff
  - species 😱
  - ...

- New built-in protocols:
  - mathematical properties of structures
    - algebraic structures: groups, lattices, rings, algebras, etc.
    - category theoretic structures
  - Ord, Eq, PartialEq, FromIterator, etc.
  - Symbol-based alternatives of existing string-based protocols
  - implementations of these for JS built-ins
  - New protocols for operator overloading?!

- Web components
  - FormAssociated, WithStyles, WithStates, etc.

## Brief High-level Overview of Design circa 2018

- Protocol declarations/expressions
- Distinct required/provided members
- `Protocol.implement()`
- `implements` operator
- Integration with class heads
- Inline, grouped implementations in protocol/class bodies
- `new Protocol({ ... })` constructor

## What has changed

### Framing *objects*, not *constructors*

- We want to be able to check `implements P` on both constructors and *instances*!
- Dropped `static` in favor of sub-protocols
- Class syntax (`class C implements P`) is now just sugar for `Protocol.implement(C.prototype, P)`

### Declaring a protocol

- Previously: bare property names were required, method & accessor ClassElements were provided
- Now: `requires` context-dependent keyword, everything else is provided
- Now: Data properties can also be provided

- Unchanged: bare property names generate symbols
- Previously: Strings were literal, no way to require or provide external symbols
- Now: ComputedPropertyName syntax for providing explicit member names, whether strings or symbols
- Unknown: string-named properties: ban? same as bare?

### Implementing a protocol on an object

- `Protocol.implement(obj, P)`
- `class C implements P { /* ... */ }` (on `C.prototype`)
- Dropped: Inline implementations for existing classes (`implemented by`)
- Dropped: New ClassElement for declaring protocol implementation (`implements protocol P { /* ... */ }`)

### Protocol composition

- Protocol inheritance (`extends`) — but specifics are TBD
- Removed: `static` members
- Added: Sub-protocols
- `Protocol.union` / variadic `Protocol.implement` / `new Protocol({ extends: [...], })`

### Immutability & introspection

- Protocols are immutable
- `Protocol.describe(P)` + `new Protocol()` can be used to create new protocols based on existing ones
- Object literal shape TBD

## Remaining Design Work

### Are `"foo"` and `foo` distinct members? ([#59](https://github.com/tc39/proposal-first-class-protocols/issues/59))

```js
protocol P {
	foo() {}
	["foo"]() {}
}

Protocol.describe(P);
// => {
//   foo: ???
// }
```

- Object literal shape needs to work as both `Protocol.describe()` output and `new Protocol()` input
- `foo` and `["foo"]` are technically distinct: `foo` creates a `P.foo` symbol, `["foo"]` is a literal string
- But that complicates the object literal shape
- If we disallow both on the same protocol, we can use a simple object literal

### How does inheritance work? ([#23](https://github.com/tc39/proposal-first-class-protocols/issues/23))

- `extends`, `implements`, both?
- Does `extends` use the prototype chain?
- How are parent symbols accessed?

```js
protocol P {
	requires foo() {}
}
protocol Q extends P {
	requires bar() {}
}
class C implements Q {
	[Q.bar]() {}
	// [Q.foo] or [P.foo]?
}
```

### Do sub-protocols create symbols on the parent? ([#81](https://github.com/tc39/proposal-first-class-protocols/issues/81))

```js
protocol P {
	requires constructor implements protocol {
		// Does this create a P.foo?
		requires foo;
	}
}
```

`Protocol.describe(P).members.constructor.implements.foo` is *extremely* unwieldy. But if sub-protocols do create symbols on the parent, then what about:

```js
protocol P {
	requires foo;

	requires constructor implements protocol {
		requires foo;
	}
}
```

```js
protocol P {
	requires foo implements Q;
}
```

### Should `constructor` and `prototype` be equivalent to `["constructor"]` and `["prototype"]`? ([#84](https://github.com/tc39/proposal-first-class-protocols/issues/84))

- We don’t want `P.constructor` and `P.prototype` symbols
- Frequently needed: now the only way to provide/require static members
- Why create an error condition when we can just handle it?
- But would that complicate the mental model too much?

### What does `super.prop` resolve to, if anything? ([#88](https://github.com/tc39/proposal-first-class-protocols/issues/88))

1. Parent protocol? (if we do `extends`)
2. `Object.getPrototypeOf(this).foo`? Infinite loop in common cases!
3. Something more elaborate?

```js
let superBase = Object.getPrototypeOf(this);
while (superBase[propertyKey] === protocolMember) {
  superBase = Object.getPrototypeOf(superBase);
}
return superBase[propertyKey];
```

Resolves as expected in most cases, but possibly too weird?

### Precedence ([#76](https://github.com/tc39/proposal-first-class-protocols/issues/76))

(Note from MF: I don't think we should include this topic)

- Implementing object overrides protocol members ✅
- But how do we resolve protocol vs base class?

```js
class C {
	foo() {}
}
protocol P {
	["foo"]() {}
}
class D extends C implements P {
	// Which foo()?
}
```

### Auto-generated string aliases ([#47](https://github.com/tc39/proposal-first-class-protocols/issues/47))

- Name/framing?
- Extension to implementation syntax vs factory
