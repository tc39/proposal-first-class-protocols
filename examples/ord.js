class Ordering {}
Ordering.LT = new Ordering;
Ordering.EQ = new Ordering;
Ordering.GT = new Ordering;

protocol Ordered {
  // :: (this :: a, other :: a) -> Ordering
  compare;

  // :: (this :: a, other :: a) -> Boolean
  lessThan(other) {
    return this[Ordered.compare](other) === Ordering.LT;
  }
}

String.prototype[Ordered.compare] = function compare(other) {
  if (this < other) return Ordering.LT;
  if (other < this) return Ordering.GT;
  return Ordering.EQ;
};
Reflect.implement(String, Ordered);
