'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';

protocol Foldable {
  foldr;

  get length() {
    return this[Foldable.foldr](memo => memo + 1, 0);
  }

  contains(e) {
    return this[Foldable.foldr](
      (memo, a) => memo || a[Eq.equal](e),
      false
    );
  }

  find(pred) {
    return this[Foldable.foldr](
      // Note: this would be more efficient if we used some sort of isJust test and didn't compute the RHS of alt
      (memo, a) => memo[Alt.alt](pred(a) ? new Just(a) : Nothing),
      Nothing
    );
  }

  // C must implement Applicative and Monoid
  foldInto(C) {
    if (!(C implements Applicative && C implements Monoid)) {
      throw new TypeError('Foldable.foldInto must be given a class which implements both Applicative and Monoid');
    }
    return this[Foldable.foldr](
      (memo, a) => C[Applicative.pure](a)[Semigroup.append](memo),
      C[Monoid.empty]
    );
  }

  toArray() {
    return this[Foldable.foldInto](Array);
  }
}
