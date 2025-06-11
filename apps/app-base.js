import { UserRepository } from '../repositories/user-repository.js';
import { UserService } from '../services/user-service.js';
import { ProblemRepository } from '../repositories/problem-repository.js';
import { ProblemService } from '../services/problem-service.js';
import { DBModule } from '../modules/db-module.js';
import { GithubModule } from '../modules/github-module.js';
import { Stores } from '../entity/stores.js';
import { statusAttr } from '../components/banner.js';
import { SubmissionService } from '../services/submission-service.js';
import { SubmissionRepository } from '../repositories/submission-repository.js';

export class AppBase {
  #userService = null;
  #problemService = null;
  #submissionService = null;
  #githubModule = null;
  #dbModule = null;

  constructor(guard = true) {
    this.#bindLifecycleEvents(guard);
  }

  async guard() {
    const userService = await this.getUserService();
    userService.ensureAuthenticated();
  }

  async getUserService() {
    if (!this.#userService) {
      const userRepository = new UserRepository();
      this.#userService = new UserService(userRepository);
    }
    return this.#userService;
  }

  async getProblemService() {
    if (!this.#problemService) {
      const userService = await this.getUserService();
      const githubModule = await this.getGithubModule();
      const dbModule = await this.getDBModule();

      const problemRepository = new ProblemRepository({ 
        github: githubModule,
        db: dbModule
      });
      
      this.#problemService = new ProblemService(
        problemRepository, 
        userService
      );
      await this.#problemService.initialize();
    }
    return this.#problemService;
  }

  async getSubmissionService() {
    if (!this.#submissionService) {
      const dbModule = await this.getDBModule();
      const submissionRepository = new SubmissionRepository({ db: dbModule });
      this.#submissionService = new SubmissionService(submissionRepository);
      await this.#submissionService.initialize();
    }
    return this.#submissionService;
  }

  async getGithubModule() {
    if (!this.#githubModule) {
      const userService = await this.getUserService();
      const userInfo = await userService.fetchUserInfo();
      const token = userService.getAccessToken();
      
      this.#githubModule = new GithubModule({
        token,
        owner: userInfo.login,
        repo: 'mockjun-problems'
      });
    }
    return this.#githubModule;
  }

  async getDBModule() {
    if (!this.#dbModule) {
      this.#dbModule = new DBModule(Stores.NAME, Stores.VALUES);
      await this.#dbModule.init();
    }
    return this.#dbModule;
  }

  async #bindLifecycleEvents(guard) {
    if (guard) {
      await this.guard();
    }
    document.addEventListener('DOMContentLoaded', async () => {
      document.body.className = localStorage.getItem('theme');
      document.querySelector('mock-banner')?.setAttribute('status', navigator.onLine ? statusAttr.value.online : statusAttr.value.offline);

      if (guard) {
        const userService = await this.getUserService();
        const userInfo = await userService.fetchUserInfo();
        document.querySelector('.user-profile span:last-child').textContent = `@${userInfo.login}`;
      }

      await this.init?.();
      await this.build?.();

      document.body.classList.add('loaded');

      if (document.visibilityState === 'visible') {
        await this.onShow?.();
      }
    });

    window.addEventListener('beforeunload', async (e) => {
      await this.dispose?.(e);
    });

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        await this.onHide?.();
      } else {
        document.querySelector('mock-banner').setAttribute('status', navigator.onLine ? statusAttr.value.online : statusAttr.value.offline);
        await this.onShow?.();
      }
    });
  }
}