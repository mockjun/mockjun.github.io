import { ProblemMeta } from "./problem-meta.js";

export class ProblemData {
  /**
   * @param {Object} params
   * @param {string} params.id - 문제 식별자 (owner/id 또는 id)
   * @param {string} params.path - 문제 폴더 경로 (예: 'problems/001')
   * @param {ProblemMeta} params.meta
   * @param {string} params.problemCode - problem.js의 원본 코드
   * @param {string} [params.answerCode] - answer.js의 사용자 풀이 코드 (없을 수도 있음)
   */
  constructor({ id, path, meta, problemCode, answerCode = '' }) {
    this.id = id;
    this.path = path;
    this.meta = meta;
    this.problemCode = problemCode;
    this.answerCode = answerCode;
  }
}
