'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';

protocol Semigroup {
  // :: (this :: a, other :: a) -> a
  append;
}

protocol Monoid extends Semigroup {
  // :: a
  static unit;
}

Array.prototype[Semigroup.append] = Array.prototype.concat;
Array[Monoid.unit] = [];
Reflect.implement(Array, Monoid);
