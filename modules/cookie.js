export class Cookie {
  static get(key) {
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith(key + '='));
    return value ? decodeURIComponent(value.split('=')[1]) : null;
  }

  /**
   * @param {string} key 
   * @param {string} value 
   * @param {Object} [options] 
   * @param {number} [options.maxAge]
   * @param {string} [options.path=/]
   */
  static set(key, value, options = {}) {
    const { maxAge, path = '/' } = options;
    let cookie = `${key}=${encodeURIComponent(value)}; path=${path}`;

    if (maxAge) {
      cookie += `; max-age=${maxAge}`;
    }

    document.cookie = cookie;
  }

  static remove(key, path = '/') {
    document.cookie = `${key}=; path=${path}; max-age=0`;
  }

  static getAll() {
    return document.cookie
      .split('; ')
      .reduce((acc, curr) => {
        if (curr) {
          const [key, value] = curr.split('=');
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      }, {});
  }

  static getByPrefix(prefix) {
    return Object.entries(this.getAll())
      .reduce((acc, [key, value]) => {
        if (key.startsWith(prefix)) {
          acc[key] = value;
        }
        return acc;
      }, {});
  }
}