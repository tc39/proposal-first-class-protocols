'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';

class Identity {
  constructor(val) { this.val = val; }
  unwrap() { return this.val; }
}

Promise.prototype[Functor.map] =
  function (f) {
    return this.then(function(x) {
      if (x instanceof Identity)
        x = x.unwrap();
      return new Identity(
        f.call(this, x));
    });
  };

Protocol.implement(Promise, Functor);
