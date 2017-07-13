protocol HasHashCode {
  hashCode;
}

class SetUsingHashCode extends Set {
  constructor(iterable) {
    super();
    this.#map = new Map;
    for (let x of iterable) {
      this.add(x);
    }
  }

  add(value) {
    this.#map.set(value[HasHashCode.hashCode](), value);
  }

  // ... others
}

class Identity implements HasHashCode {
  [HasHashCode.hashCode]() { return this.val; }
  constructor(val) { this.val = val; }
}

new SetUsingHashCode().add(new Identity(1)).has(new Identity(1)) // true
