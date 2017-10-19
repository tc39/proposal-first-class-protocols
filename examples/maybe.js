class Maybe {
  static [Applicative.pure](v) {
    return new Just(v);
  }
}

class Just extends Maybe implements Monad {
  constructor(v) {
    this.value = v;
  }

  [Functor.map](fn) {
    return new Just(fn(this.value));
  }

  [Apply.apply](fn) {
    return fn instanceof Just
      ? this[Functor.map](fn.value)
      : fn;
  }

  [Bind.bind](fn) {
    return fn(this.value);
  }

  [Alt.alt](other) {
    return this;
  }

  [Semigroup.append](other) {
    return other instanceof Just
      ? new Just(this.value[Semigroup.append](other.value))
      : this;
  }
}

class _Nothing extends Maybe implements Monad {
  [Functor.map](fn) {
    return this;
  }

  [Apply.apply](fn) {
    return this;
  }

  [Bind.bind](fn) {
    return this;
  }

  [Alt.alt](other) {
    return other;
  }

  [Semigroup.append](other) {
    return other;
  }
}

const Nothing = new _Nothing;

Maybe[Monoid.empty] = Nothing;
