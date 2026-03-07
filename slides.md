# Slide outline for Mar 2026 TC39 meeting (WIP)

## History

- 2017: Stage 1
- 2018: Update
- 2019-2024: 🦗🦗🦗
- Nov 2025: Renewed interest
- Jan 2026: New co-champion
- Mar 2026: Big update!

## Today

- reminders: getting back up to speed with the proposal
- changes since 2018 and current status
- unresolved design challenges
- open discussion and committee feedback

## Motivation

- describe well-known interfaces
- encourage Symbol-based interfaces
- don't require coordination between producer and consumer
- don't require coordination across multiple producers
- all the fun and convenience of monkey-patching built-ins, none of the downsides
- gives us a standard way to model and refer to existing built-in protocols like iteration
- more principled duck typing

## Motivation continued: real-world use cases

- reify existing built-in protocols (both symbol-based and string-based)
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
- new built-in protocols:
  - mathematical properties of structures
    - algebraic structures: groups, lattices, rings, algebras, etc
    - catgory theoretic structures
  - Ord, Eq, PartialEq, FromIterator, etc.
  - Symbol-based alternatives of existing string-based protocols
  - implementations of these for JS built-ins
- web components

## Brief High-level Overview of Design circa 2018

- protocol declarations/expressions
- distinct required/provided members
- `Protocol.implement`
- `implements` operator
- integration with class heads
- ...

## What has changed

### Framing *objects*, not *constructors*

- We want to be able to check `implements P` on both constructors and *instances*!
- Dropped `static` in favor of sub-protocols
- Class syntax (`class C implements P`) is now just sugar for `Protocol.implement(C.prototype, P)`

### Declaring a protocol

- Previously: Required vs provided was based on member type
- Now: Explicit `requires`, all else is provided
- Now: Data properties can also be provided

- Unchanged: Identifiers generate symbols
- Previously: Strings were literal, no way to require or provide external symbols
- Now: ComputedPropertyName syntax for providing explicit member names, whether strings or symbols

### Implementing a protocol on an object

- `Protocol.implement(obj, P)`
- `class C implements P { /* ... */ }`
- Dropped: Inline implementations for existing classes  (`implemented by`)
- Dropped: New ClassElement for declaring protocol implementation (`implements protocol P { /* ... */ }`)

### Protocol composition

- Protocol inheritance (`extends`) — but specifics are TBD
- Sub-protocols have replaced `static` members

### Immutability & introspection

- Protocols are now immutable
- `Protocol.describe(P)` + `new Protocol()` can be used to create new protocols based on existing ones
- Object literal shape TBD

## Remaining Design Work

### Are `"foo"` and `foo` distinct members?

TBD

### How does inheritance work?

TBD

### Do sub-protocols create symbols on the parent?

TBD

### Should `constructor` and `prototype` be equivalent to `["constructor"]` and `["prototype"]`?

- We don’t want `P.constructor` and `P.prototype` symbols
- Frequently needed: now the only way to provide/require static members
- Why create an error condition when we can just handle it?
- But would that complicate the mental model too much?

### Precedence

- Implementing object overrides protocol members
- But how do we resolve protocol vs base class?

```js
class C {
	foo() {}
}

protocol P {
	foo() {}
}

class D extends C implements P {
	// Which foo()?
}
```

### Auto-generated string aliases

- Name/framing?
- Extension to implementation syntax vs factory
