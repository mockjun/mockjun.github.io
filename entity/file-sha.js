export class FileSHA {
  /**
   * @param {Object} params
   * @param {string} params.path
   * @param {string} params.sha
   */
  constructor({ path, sha }) {
    this.path = path;
    this.sha = sha;
  }
}
