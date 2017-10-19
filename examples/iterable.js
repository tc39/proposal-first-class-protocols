const Iterable = new Protocol({
  name: 'Iterable',
  requires: {
    iterator: Symbol.iterator,
  },
  provides: Object.getOwnPropertyDescriptors({
    forEach(f) {
      let i = 0;
      for (let entry of this) {
        f.call(this, entry, i, this);
        ++i;
      }
    },

    foldl(fn, memo) {
      this[Iterable.forEach](e => { memo = fn(memo, e); });
      return memo;
    },

    // C must implement Applicative and Monoid
    foldInto(C) {
      if (!(C implements Applicative && C implements Monoid)) {
        throw new TypeError('Iterable.foldInto must be given a class which implements both Applicative and Monoid');
      }
      return this[Iterable.foldl](
        (memo, a) => memo[Semigroup.append](C[Applicative.pure](a)),
        C[Monoid.empty]
      );
    },

    // ... basically everything in Foldable, except this is from the left
  }),
});

const IteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
function Iterator() {}
Iterator.prototype = IteratorPrototype;

IteratorPrototype[Functor.map] = function(fn) {
  let iter = this;
  // TODO: construct from @@species?
  return {
    __proto__: IteratorPrototype,
    next() {
      let r = iter.next();
      return r.done ? r : {
        value: fn(r.value),
        done: false,
      };
    },
  };
};

Protocol.implement(Iterator, Functor);
