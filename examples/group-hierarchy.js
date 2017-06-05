interface Semigroup {
  // :: (this :: a, other :: a) -> a
  append;
}

interface Monoid extends Semigroup {
  // :: a
  static unit;
}

Array.prototype[Semigroup.append] = Array.prototype.concat;
Array[Monoid.unit] = [];
Array implements Monoid;
