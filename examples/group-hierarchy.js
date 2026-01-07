protocol Semigroup {
  // :: (this :: a, other :: a) -> a
  requires append;
}

protocol Monoid extends Semigroup {
  // :: a
  requires static unit;
}

Array.prototype[Semigroup.append] = Array.prototype.concat;
Array[Monoid.unit] = [];
Reflect.implement(Array, Monoid);
