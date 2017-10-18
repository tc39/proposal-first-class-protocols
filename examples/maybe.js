'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';

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
}

class Nothing extends Maybe implements Monad {
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

Nothing.INSTANCE = new Nothing;
