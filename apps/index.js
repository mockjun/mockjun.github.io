import { statusAttr } from '../components/banner.js';
import { AppBase } from './app-base.js';

class IndexApp extends AppBase {
  constructor() {
    super();
    this.userService = null;
    this.problemService = null;
    this.banner = null;
  }

  async init() {
    try {
      this.userService = await this.getUserService();
      this.problemService = await this.getProblemService();

      this.banner = document.querySelector('mock-banner');
      this.banner.setAttribute('status', statusAttr.value.online);
    } catch (error) {
      console.error('앱 초기화 오류:', error);
      if (this.banner) {
        this.banner.setAttribute('status', statusAttr.value.error);
      }
    }
  }

  async build() {
    try {
      await this.loadProblems();
      this.setupEventListeners();
    } catch (error) {
      console.error('앱 빌드 오류:', error);
    }
  }

  async loadProblems() {
    try {
      const { problems } = await this.problemService.getProblems();
      
      this.displayAllProblems(problems);
      
      const recentProblems = [...problems]
        .sort((a, b) => new Date(b.meta.updatedAt) - new Date(a.meta.updatedAt))
        .slice(0, 3);
      
      this.displayRecentProblems(recentProblems);
    } catch (error) {
      console.error('문제 로드 오류:', error);
    }
  }

  displayAllProblems(problems) {
    const problemGrid = document.querySelector('.problem-grid');
    if (!problemGrid) return;
    
    problemGrid.innerHTML = '';
    
    if (problems.length === 0) {
      problemGrid.innerHTML = '<p>문제가 없습니다. 새 문제를 추가해보세요.</p>';
      return;
    }
    
    problems.forEach(problem => {
      const card = document.createElement('problem-card');
      card.setAttribute('mode', 'list');
      card.setAttribute('title', problem.meta.title);
      card.setAttribute('description', problem.meta.description || '');
      card.setAttribute('difficulty', problem.meta.difficulty || 'medium');
      card.setAttribute('updated-at', problem.meta.updatedAt || new Date().toISOString());
      card.setAttribute('problem-id', problem.id);
      card.ondelete = async () => {
        const accept = confirm(`${problem.id}를 삭제하시겠습니까?`);
        if (!accept) return;
        await this.problemService.deleteProblem(problem.id);
        location.reload();
      }
      
      problemGrid.appendChild(card);
    });
  }

  displayRecentProblems(problems) {
    const recentProblemsContainer = document.querySelector('.carousel.mask');
    if (!recentProblemsContainer) return;
    
    recentProblemsContainer.innerHTML = '';
    
    if (problems.length === 0) {
      recentProblemsContainer.innerHTML = '<p>최근 접근한 문제가 없습니다.</p>';
      return;
    }
    
    problems.forEach(problem => {
      const card = document.createElement('problem-card');
      card.setAttribute('mode', 'recent');
      card.setAttribute('title', problem.meta.title);
      card.setAttribute('updated-at', problem.meta.updatedAt || new Date().toISOString());
      card.setAttribute('problem-id', problem.id);
      card.setAttribute('solved', problem.meta.solved ? 'true' : 'false');
      
      recentProblemsContainer.appendChild(card);
    });
  }

  setupEventListeners() {
    const logoutButton = document.querySelector('.user-menu button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        this.userService.logout();
        window.location.href = '/start.html';
      });
    }
  }

  onHide() {
    console.log('IndexApp is now hidden');
  }

  onShow() {
    console.log('IndexApp is now visible');
    if (this.banner && navigator.onLine) {
      this.banner.setAttribute('status', statusAttr.value.online);
    }
  }

  dispose(event) {
    console.log('IndexApp is being disposed');
  }
}

new IndexApp();