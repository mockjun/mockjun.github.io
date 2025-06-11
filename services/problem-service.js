import { ProblemData } from '../entity/problem-data.js';
import { ProblemMeta } from '../entity/problem-meta.js';
import { Stores } from '../entity/stores.js';
import { UserService } from './user-service.js';

export class ProblemService {
  /**
   * @param {import('../repositories/problem-repository.js').ProblemRepository} problemRepository
   * @param {UserService} userService
   */
  constructor(problemRepository, userService) {
    this.repository = problemRepository;
    this.userService = userService;
  }

  async initialize() {
    try {
      await this.repository.init();
      await this.repository.syncAll();
    } catch (error) {
      throw new Error(`초기화 실패: ${error.message}`);
    }
  }

  async importProblem(problemId) {
    try {
      const problem = await this.repository.importFromGithub(problemId);
      if (!problem) throw Error('문제를 찾을 수 없습니다.');
      await this.repository.db.put(Stores.PROBLEMS, problem);
      await this.repository.syncOne(problem.id);
    } catch (error) {
      throw Error(`문제 수입 오류: ${error.message}`);
    }
  }

  /**
   * @param {Object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.problemCode
   * @param {string} [params.answerCode]
   * @param {string} [params.source]
   * @param {string} [params.difficulty]
   * @param {boolean} [params.solved]
   * @returns {Promise<ProblemData>}
   */
  async createProblem(params) {
    const {
      title,
      description,
      problemCode,
      answerCode = '',
      source = '',
      difficulty = 'medium',
      solved = false
    } = params;

    if (!title?.trim()) throw new Error('제목은 필수입니다');
    if (title.length > 50) throw new Error('제목은 50자를 초과할 수 없습니다');
    if (!description?.trim()) throw new Error('설명은 필수입니다');
    if (description.length > 1000) throw new Error('설명은 1000자를 초과할 수 없습니다');
    if (!problemCode?.trim()) throw new Error('문제 코드는 필수입니다');
    if (problemCode.length > 10000) throw new Error('문제 코드는 10000자를 초과할 수 없습니다');
    if (answerCode.length > 10000) throw new Error('정답 코드는 10000자를 초과할 수 없습니다');
    if (source.length > 200) throw new Error('출처는 200자를 초과할 수 없습니다');

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      throw new Error('유효하지 않은 난이도입니다');
    }

    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const path = `problems/${id}`;

    try {
      const currentUser = await this.userService.fetchUserInfo();
      if (!currentUser) {
        throw new Error('로그인된 사용자 정보를 가져올 수 없습니다.');
      }

      const existing = await this.repository.db.get(Stores.PROBLEMS, path);
      if (existing) throw new Error(`이미 존재하는 문제입니다: ${title}`);

      const meta = new ProblemMeta({
        title,
        description,
        source,
        difficulty,
        solved,
        owner: currentUser.login,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const problem = new ProblemData({
        id,
        path,
        meta,
        problemCode,
        answerCode
      });

      await this.repository.db.put(Stores.PROBLEMS, problem);
      await this.repository.syncOne(id);
      return problem;
    } catch (error) {
      throw new Error(`문제 생성 실패: ${error.message}`);
    }
  }

  /**
   * @param {string} problemId
   * @returns {Promise<ProblemData>}
   */
  async getProblem(problemId) {
    if (!problemId?.trim()) throw new Error('문제 ID는 필수입니다');
    if (problemId.length > 50) throw new Error('유효하지 않은 문제 ID입니다');

    try {
      const problem = await this.repository.db.get(Stores.PROBLEMS, problemId);
      if (!problem) throw new Error(`문제를 찾을 수 없음: ${problemId}`);
      return problem;
    } catch (error) {
      throw new Error(`문제 조회 실패: ${error.message}`);
    }
  }

  /**
   * @param {string} problemId
   * @param {Object} updates
   * @param {string} [updates.title]
   * @param {string} [updates.description]
   * @param {string} [updates.problemCode]
   * @param {string} [updates.answerCode]
   * @param {string} [updates.source]
   * @param {string} [updates.difficulty]
   * @param {string[]} [updates.tags]
   * @param {boolean} [updates.solved]
   * @returns {Promise<ProblemData>}
   */
  async updateProblem(problemId, updates) {
    if (!problemId?.trim()) throw new Error('문제 ID는 필수입니다');
    if (problemId.length > 50) throw new Error('유효하지 않은 문제 ID입니다');

    if (updates.title && updates.title.length > 50) throw new Error('제목은 50자를 초과할 수 없습니다');
    if (updates.description && updates.description.length > 1000) throw new Error('설명은 1000자를 초과할 수 없습니다');
    if (updates.problemCode && updates.problemCode.length > 10000) throw new Error('문제 코드는 10000자를 초과할 수 없습니다');
    if (updates.answerCode && updates.answerCode.length > 10000) throw new Error('정답 코드는 10000자를 초과할 수 없습니다');
    if (updates.source && updates.source.length > 200) throw new Error('출처는 200자를 초과할 수 없습니다');

    if (updates.difficulty) {
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!validDifficulties.includes(updates.difficulty)) {
        throw new Error('유효하지 않은 난이도입니다');
      }
    }

    try {
      const problem = await this.repository.db.get(Stores.PROBLEMS, problemId);
      if (!problem) throw new Error(`문제를 찾을 수 없음: ${problemId}`);

      const currentUser = this.userService.getUserInfo();
      const owner = currentUser ? currentUser.login : problem.meta.owner;

      const updatedProblem = new ProblemData({
        ...problem,
        meta: new ProblemMeta({
          ...problem.meta,
          title: updates.title ?? problem.meta.title,
          description: updates.description ?? problem.meta.description,
          source: updates.source ?? problem.meta.source,
          difficulty: updates.difficulty ?? problem.meta.difficulty,
          owner: owner,
          updatedAt: new Date().toISOString(),
          solved: updates.solved ?? problem.meta.solved
        }),
        problemCode: updates.problemCode ?? problem.problemCode,
        answerCode: updates.answerCode ?? problem.answerCode
      });

      await this.repository.db.put(Stores.PROBLEMS, updatedProblem);
      await this.repository.syncOne(problemId);
      return updatedProblem;
    } catch (error) {
      throw new Error(`문제 수정 실패: ${error.message}`);
    }
  }

  /**
   * @param {string} problemId
   * @returns {Promise<void>}
   */
  async deleteProblem(problemId) {
    if (!problemId?.trim()) throw new Error('문제 ID는 필수입니다');
    if (problemId.length > 50) throw new Error('유효하지 않은 문제 ID입니다');

    try {
      await this.repository.deleteProblem(problemId);
    } catch (error) {
      throw new Error(`문제 삭제 실패: ${error.message}`);
    }
  }

  /**
   * @param {number} [page=0]
   * @returns {Promise<{problems: ProblemData[], pageInfo: PageInfo}>}
   */
  async getProblems(page = 0) {
    if (page < 0) throw new Error('유효하지 않은 페이지 번호입니다');
    
    try {
      return await this.repository.fetchByPage(page);
    } catch (error) {
      throw new Error(`문제 목록 조회 실패: ${error.message}`);
    }
  }
}