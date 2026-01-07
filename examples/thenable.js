protocol Thenable {
  requires "then";

  get [Promise.then]() { return this.then; }

  [Promise.catch](f) {
    return new Promise(resolve => this.then(resolve)).catch(f);
  }

  [Promise.finally](f) {
    return new Promise(resolve => this.then(resolve)).finally(f);
  }
}
