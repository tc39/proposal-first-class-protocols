class Ordering {
  static LT = new Ordering;
  static EQ = new Ordering;
  static GT = new Ordering;
}

interface Ordered {
  // :: (this :: a, other :: a) -> Ordering
  compare;

  // :: (this :: a, other :: a) -> Boolean
  lessThan(other) {
    return this[Ordered.compare](other) === Ordering.LT;
  }
}

interface Functor {
  // :: (this :: f a, fn :: a -> b) -> f b
  map;

  // :: (this :: f a) -> f Unit
  void() {
    return this[Functor.map](x -> void 0);
  }
}

interface Apply extends Functor {
  // :: (this :: f a, fn :: f (a -> b)) -> f b
  apply;

  // :: (this :: f a, fn :: (this :: a -> other :: b -> c), other :: f b) -> f c
  lift2(fn, other) {
    return this[Apply.apply](this[Functor.map](fn), other);
  }
}

interface Applicative extends Apply {
  // :: (this :: f, v :: a) -> f a
  static pure;
}

interface Bind extends Apply {
  bind;

  join() {
    return this[Bind.bind](x -> x);
  }
}

interface Monad extends Applicative extends Bind {}

interface Semigroup {
  // :: (this :: a, other :: a) -> a
  append;
}

interface Monoid extends Semigroup {
  // :: a
  static unit;
}

interace MonadPlus extends Monad extends Monoid {}


Array.prototype[Functor.map] = Array.prototype.map;
Array.prototype[Apply.apply] = function apply(fs) {
  let result = [];
  let n = 0;
  for (let i = 0, l = fs.length; i < l; ++i) {
    for (let j = 0, k = this.length; j < k; ++j, ++n) {
      result[n] = fs[i](this[j]);
    }
  }
  return result;
};
Array[Applicative.pure] = x -> [x];
Array.prototype[Bind.bind] = function bind(f) {
  let result = [];
  for (let i = 0, l = this.length; i < l; ++i) {
    [].push.apply(result, f(this[i]));
  }
  return result;
};

Array.prototype[Semigroup.append] = Array.prototype.concat;
Array[Monoid.unit] = [];


class Maybe implements Monad {
  static [Applicative.pure](v) {
    return new Just(v);
  }
}

class Just extends Maybe {
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
}

class Nothing extends Maybe {
  static INSTANCE = new Nothing;

  constructor() {
    return Nothing.INSTANCE;
  }

  [Functor.map](fn) {
    return this;
  }

  [Apply.apply](fn) {
    return this;
  }

  [Bind.bind](fn) {
    return this;
  }
}
