export class ProblemMeta {
  /**
   * @param {Object} params
   * @param {string} params.title - 문제 제목
   * @param {string} params.description - 문제 설명 (Markdown 가능)
   * @param {string} params.source - 출처 (URL 또는 텍스트)
   * @param {string} params.owner - GitHub 사용자명
   * @param {string} params.difficulty - 난이도 (easy, medium, hard)
   * @param {string} params.updatedAt - ISO 형식 날짜 문자열 (수정 시간)
   * @param {boolean} params.solved - 해결 여부
   */
  constructor({ title, description, source, owner, difficulty, updatedAt = new Date().toISOString(), solved = false }) {
    this.title = title;
    this.description = description;
    this.source = source;
    this.owner = owner;
    this.difficulty = difficulty;
    this.updatedAt = updatedAt;
    this.solved = solved;
  }
}
