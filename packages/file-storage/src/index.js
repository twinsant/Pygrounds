export class BrowserFileStorage {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  getItem(path) {
    return this.storage.getItem(path);
  }

  setItem(path, content) {
    this.storage.setItem(path, content);
  }

  removeItem(path) {
    this.storage.removeItem(path);
  }

  keys() {
    return Object.keys(this.storage);
  }
}

export class TauriFileStorage {
  constructor() {
    this.storage = null;
  }

  getItem() {
    throw new Error('TauriFileStorage is not wired yet');
  }

  setItem() {
    throw new Error('TauriFileStorage is not wired yet');
  }

  removeItem() {
    throw new Error('TauriFileStorage is not wired yet');
  }

  keys() {
    throw new Error('TauriFileStorage is not wired yet');
  }
}
