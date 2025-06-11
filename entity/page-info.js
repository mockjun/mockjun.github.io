export class PageInfo {
  /**
   * @param {Object} params
   * @param {number} params.page - 현재 페이지 번호 (0부터 시작)
   * @param {number} params.pageSize - 페이지 크기
   */
  constructor({ page, pageSize }) {
    this.page = page;
    this.pageSize = pageSize;
  }
}
