import { ProblemData } from '../entity/problem-data.js';
import { ProblemMeta } from '../entity/problem-meta.js';
import { FileSHA } from '../entity/file-sha.js';
import { PageInfo } from '../entity/page-info.js';

import { GithubModule } from '../modules/github-module.js';
import { DBModule } from '../modules/db-module.js';
import { Stores } from '../entity/stores.js';

export class ProblemRepository {
  /**
   * @param {Object} params
   * @param {GithubModule} params.github - GitHub API 래퍼
   * @param {DBModule} params.db - IndexedDB 래퍼
   * @param {number} [params.pageSize=30] - 페이지당 문제 수
   */
  constructor({ github, db, pageSize = 30 }) {
    this.github = github;
    this.db = db;
    this.pageSize = pageSize;
    this.isInitialized = false;
    this.syncInProgress = false;
    this.fileSHAs = new Map();

    window.addEventListener('beforeunload', () => this._saveState());
  }

  async _saveState() {
    try {
      await this.db.put(Stores.APP_STATE, {
        id: 'sha_cache',
        data: Array.from(this.fileSHAs.entries()),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('상태 저장 실패:', error);
    }
  }

  async _loadState() {
    try {
      const state = await this.db.get(Stores.APP_STATE, 'sha_cache');
      if (state) this.fileSHAs = new Map(state.data);
    } catch (error) {
      console.error('상태 복원 실패:', error);
    }
  }

  async init() {
    if (this.isInitialized) return;

    await this.db.init();
    await this._loadState();
    this._setupOnlineHandler();
    this.isInitialized = true;
  }

  _setupOnlineHandler() {
    window.addEventListener('online', () => this.onOnline());
  }

  async onOnline() {
    if (this.syncInProgress) return;

    try {
      console.log('온라인 상태 감지: 자동 동기화 시작');
      await this.syncAll();
    } catch (error) {
      console.error('자동 동기화 실패:', error);
    }
  }

  async syncAll() {
    if (this.syncInProgress) {
      console.log('이미 동기화 진행 중');
      return;
    }

    this.syncInProgress = true;
    try {
      const [githubProblems, localProblems] = await Promise.allSettled([
        this.fetchFromGithub(),
        this.fetchFromDB()
      ]);

      for (const localProblem of localProblems.value) {
        const githubProblem = githubProblems.value.find(p => p.path === localProblem.path);
        if (!githubProblem) {
          console.log(`새 문제 업로드: ${localProblem.path}`);
          await this._uploadProblemToGithub(localProblem);
        } else if (new Date(localProblem.meta.updatedAt) > new Date(githubProblem.meta.updatedAt)) {
          console.log(`문제 업데이트: ${localProblem.path}`);
          await this._uploadProblemToGithub(localProblem);
        }
      }

      for (const githubProblem of githubProblems.value) {
        const localProblem = localProblems.value.find(p => p.path === githubProblem.path);
        if (!localProblem) {
          console.log(`새 문제 다운로드: ${githubProblem.path}`);
          await this.db.put(Stores.PROBLEMS, githubProblem);
        }
      }

      await this._updateSHACache();

      console.log('동기화 완료');
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncOne(problemId) {
    let path;
    try {
      const localProblem = await this.db.get(Stores.PROBLEMS, problemId);


      if (!localProblem) {
        throw new Error(`문제를 찾을 수 없음: ${path}`);
      }

      let githubProblem = null;
      try {
        githubProblem = await this._getProblemFromGithub(path);
      } catch (error) {
        if (error.message.includes('GitHub 저장소를 찾을 수 없습니다')) {
          throw error;
        }
        console.log(`GitHub에서 문제를 가져오는 중 에러 발생, 계속 진행: ${error.message}`);
      }

      if (!githubProblem) {
        console.log(`새 문제 업로드: ${path}`);
        await this._uploadProblemToGithub(localProblem);
      } else if (new Date(localProblem.meta.updatedAt) > new Date(githubProblem.meta.updatedAt)) {
        console.log(`문제 업데이트: ${path}`);
        await this._uploadProblemToGithub(localProblem);
      }

      await this._updateSHACache(path);
    } catch (error) {
      console.error(`문제 동기화 실패: ${path}`, error);
      throw error;
    }
  }

  /**
   * @returns {Promise<ProblemData[]>}
   */
  async fetchFromGithub() {
    try {
      const contents = await this.github.listDirectory('problems');
      
      const problemPromises = contents
        .filter(item => item.type === 'dir')
        .map(item => this._getProblemFromGithub(item.path));
      
      const problems = await Promise.all(problemPromises);
      return problems.filter(Boolean);
    } catch (error) {
      console.error('GitHub에서 문제 목록을 가져오는데 실패했습니다:', error);
      throw new Error('GitHub에서 문제 목록을 가져오는데 실패했습니다');
    }
  }

  async importFromGithub(problemId) {
    const [username, id] = problemId.split('@');
    if (!username || !id) throw Error('유효하지 않은 형식입니다.');
    
    return await this._getExternalProblemFromGithub(username, id);
  }

  async _getExternalProblemFromGithub(username, id) {
    try {
      const path = `https://api.github.com/repos/${username}/mockjun-problems/contents/problems/${id}`;
      const [metaFile, problemFile, answerFile] = await Promise.allSettled([
        this.github.getExternalFile(`${path}/metadata.json`),
        this.github.getExternalFile(`${path}/problem.js`),
        this.github.getExternalFile(`${path}/answer.js`).catch(e => null)
      ]);

      const meta = new ProblemMeta(JSON.parse(metaFile.value.content));
      const problemId = `${meta.owner}@${id}`;
      meta.title = problemId;
      const savePath = `forked/${problemId}`;

      return new ProblemData({
        id: problemId,
        path: savePath,
        meta,
        problemCode: problemFile.value.content,
        answerCode: answerFile?.value?.content || ''
      });
    } catch (error) {
      console.error(`GitHub에서 문제 로드 실패: ${username}@${id}`, error);

      if (error.message.includes('404') &&
        (error.message.toLowerCase().includes('repository') && error.message.toLowerCase().includes('exist'))) {
        throw new Error(`GitHub 저장소를 찾을 수 없습니다: ${error.message}`);
      }

      if (error.message.includes('404') || error.message.toLowerCase().includes('not found')) {
        return null;
      }

      return null;
    }
  }

  /**
   * @param {string} path - 문제 경로
   * @returns {Promise<ProblemData|null>}
   */
  async _getProblemFromGithub(path) {
    try {
      const [metaFile, problemFile, answerFile] = await Promise.allSettled([
        this.github.getFile(`${path}/metadata.json`),
        this.github.getFile(`${path}/problem.js`),
        this.github.getFile(`${path}/answer.js`).catch(e => null)
      ]);

      this.fileSHAs.set(`${path}/metadata.json`, new FileSHA({ path: `${path}/metadata.json`, sha: metaFile.value.sha }));
      this.fileSHAs.set(`${path}/problem.js`, new FileSHA({ path: `${path}/problem.js`, sha: problemFile.value.sha }));
      if (answerFile?.value) {
        this.fileSHAs.set(`${path}/answer.js`, new FileSHA({ path: `${path}/answer.js`, sha: answerFile.value.sha }));
      }

      const meta = new ProblemMeta(JSON.parse(metaFile.value.content));
      const pathParts = path.split('/');
      const id = pathParts[pathParts.length - 1];
      const isForked = path.startsWith('forked/');
      const problemId = isForked ? `${meta.owner}/${id}` : id;

      return new ProblemData({
        id: problemId,
        path,
        meta,
        problemCode: problemFile.value.content,
        answerCode: answerFile?.value?.content || ''
      });
    } catch (error) {
      console.error(`GitHub에서 문제 로드 실패: ${path}`, error);

      if (error.message.includes('404') &&
        (error.message.toLowerCase().includes('repository') && error.message.toLowerCase().includes('exist'))) {
        throw new Error(`GitHub 저장소를 찾을 수 없습니다: ${error.message}`);
      }

      return null;
    }
  }

  /**
   * 로컬 DB에서 전체 문제 로드
   * @returns {Promise<ProblemData[]>}
   */
  async fetchFromDB() {
    return this.db.getAll(Stores.PROBLEMS);
  }

  /**
   * @returns {Promise<{problems: ProblemData[], pageInfo: PageInfo}>}
   */
  async fetchByPage(page = 0) {
    const problems = await this.db.getByPage(Stores.PROBLEMS, page + 1, this.pageSize);

    return {
      problems,
      pageInfo: new PageInfo({
        page,
        pageSize: this.pageSize
      })
    };
  }

  /**
   * @param {ProblemData} problem - 업로드할 문제 데이터
   */
  async _uploadProblemToGithub(problem) {
    const { path, meta, problemCode, answerCode } = problem;

    const metaPath = `${path}/metadata.json`;
    const metaSHA = this.fileSHAs.get(metaPath)?.sha;
    const metaRes = await this.github.putFile(
      metaPath,
      JSON.stringify(meta, null, 2),
      `Update ${metaPath}`,
      metaSHA
    );
    this.fileSHAs.set(metaPath, new FileSHA({ path: metaPath, sha: metaRes.content.sha }));

    const problemPath = `${path}/problem.js`;
    const problemSHA = this.fileSHAs.get(problemPath)?.sha;
    const problemRes = await this.github.putFile(
      problemPath,
      problemCode,
      `Update ${problemPath}`,
      problemSHA
    );
    this.fileSHAs.set(problemPath, new FileSHA({ path: problemPath, sha: problemRes.content.sha }));

    if (answerCode) {
      const answerPath = `${path}/answer.js`;
      const answerSHA = this.fileSHAs.get(answerPath)?.sha;
      const answerRes = await this.github.putFile(
        answerPath,
        answerCode,
        `Update ${answerPath}`,
        answerSHA
      );
      this.fileSHAs.set(answerPath, new FileSHA({ path: answerPath, sha: answerRes.content.sha }));
    }
  }

  /**
   * @param {string} [path] - 특정 경로만 업데이트
   */
  async _updateSHACache(path) {
    if (path) {
      const files = await this.github.listDirectory(path);
      for (const file of files) {
        this.fileSHAs.set(file.path, new FileSHA({ path: file.path, sha: file.sha }));
      }
    } else {
      const contents = await this.github.listDirectory('problems');
      for (const item of contents) {
        if (item.type === 'dir') {
          const files = await this.github.listDirectory(item.path);
          for (const file of files) {
            this.fileSHAs.set(file.path, new FileSHA({ path: file.path, sha: file.sha }));
          }
        }
      }
    }
  }

  async deleteProblem(problemId) {
    const folder = problemId.includes('@') ? 'forked' : 'problems';
    const path = `${folder}/${problemId}`;
    const problem = await this.db.get(Stores.PROBLEMS, problemId);

    if (!problem) {
      throw new Error(`문제를 찾을 수 없음: ${path}`);
    }

    try {
      const files = ['metadata.json', 'problem.js', 'answer.js'];
      for (const file of files) {
        const filePath = `${path}/${file}`;
        const sha = this.fileSHAs.get(filePath)?.sha;
        if (sha) {
          await this.github.deleteFile(
            filePath,
            `Delete ${filePath}`,
            sha
          );
          this.fileSHAs.delete(filePath);
        }
      }

      await this.db.delete(Stores.PROBLEMS, problemId);
    } catch (error) {
      console.error(`문제 삭제 실패: ${path}`, error);
      throw error;
    }
  }
}
