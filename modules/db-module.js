export class DBModule {
  constructor(dbName, storeNames = []) {
    this.dbName = dbName;
    this.storeNames = storeNames;
    /** @type {IDBDatabase} */
    this.db = null;
  }

  async init() {
    if (this.db) return;
    this.db = await this._openDB();
  }

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.storeNames.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * @template {import('../entity/stores').StoreNames} T
   * @param {T} storeName
   * @param {'readonly' | 'readwrite'} mode
   * @param {(store: IDBObjectStore) => IDBRequest} callback
   * @returns {Promise<*>}
   */
  _withStore(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      try {
        this.init().then(() => {
          const tx = this.db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          let request;
          try {
            request = callback(store);
          } catch (err) {
            tx.abort();
            throw err;
          }

          if (request instanceof IDBRequest) {
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
          }
          tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
          tx.onerror = () => reject(tx.error || new Error('Transaction error'));
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * @template {import('../entity/stores').StoreNames} T
   * @param {T} storeName
   * @param {string} key
   * @returns {Promise<*>}
   */
  async get(storeName, key) {
    return this._withStore(storeName, 'readonly', store => store.get(key));
  }

  /**
   * @template {import('../entity/store-names').StoreNames} T
   * @param {T} storeName
   * @param {*} value
   * @returns {Promise<void>}
   */
  async put(storeName, value) {
    return this._withStore(storeName, 'readwrite', store => store.put(value));
  }

  /**
   * @template {import('../entity/store-names').StoreNames} T
   * @param {T} storeName
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    return this._withStore(storeName, 'readwrite', store => store.delete(key));
  }

  clear(storeName) {
    return this._withStore(storeName, 'readwrite', store => store.clear());
  }

  close() {
    if (this.db) this.db.close();
  }

  /**
   * @template {import('../entity/store-names').StoreNames} T
   * @param {T} storeName
   * @returns {Promise<Array<*>>}
   */
  async getAll(storeName) {
    return this._withStore(storeName, 'readonly', store => store.getAll());
  }

  getByPage(storeName, page = 1, pageSize = 30) {
    return new Promise((resolve, reject) => {
      this.init().then(() => {
        try {
          const tx = this.db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const items = [];
          let cursorRequest = store.openCursor();

          let count = 0;
          cursorRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (!cursor) return resolve(items);
            const start = (page - 1) * pageSize;
            if (count >= start && items.length < pageSize) {
              items.push(cursor.value);
            }
            count++;
            if (items.length >= pageSize) return resolve(items);
            cursor.continue();
          };
          cursorRequest.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
