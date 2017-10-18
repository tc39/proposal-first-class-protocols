'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';

protocol Functor {
  // :: (this :: f a, fn :: a -> b) -> f b
  map;

  // :: (this :: f a) -> f Unit
  void() {
    return this[Functor.map](x => void 0);
  }
}

protocol Apply extends Functor {
  // :: (this :: f a, fn :: f (a -> b)) -> f b
  apply;

  // :: (this :: f a, fn :: (this :: a -> other :: b -> c), other :: f b) -> f c
  lift2(fn, other) {
    return this[Apply.apply](this[Functor.map](fn), other);
  }
}

protocol Applicative extends Apply {
  // :: (this :: f, v :: a) -> f a
  static pure;
}

protocol Bind extends Apply {
  bind;

  join() {
    return this[Bind.bind](x => x);
  }
}

protocol Monad extends Applicative, Bind {}


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
Array[Applicative.pure] = Array.of;
Array.prototype[Bind.bind] = function bind(f) {
  let result = [];
  for (let i = 0, l = this.length; i < l; ++i) {
    [].push.apply(result, f(this[i]));
  }
  return result;
};

Reflect.implement(Array, Monad);
