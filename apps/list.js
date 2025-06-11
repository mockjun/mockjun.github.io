import { statusAttr } from '../components/banner.js';
import { AppBase } from './app-base.js';

class ListApp extends AppBase {
  constructor() {
    super();
    this.userService = null;
    this.problemService = null;
    this.banner = null;
    this.myProblemsGrid = null;
    this.importedProblemsGrid = null;
    this.myProblemsCount = null;
    this.importedProblemsCount = null;
    this.myProblemsEmptyState = null;
    this.importedProblemsEmptyState = null;
    this.isImporting = false;
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
      this.initializeUI();
      await this.loadProblems();
      this.setupEventListeners();
    } catch (error) {
      console.error('UI 구성 오류:', error);
    }
  }

  initializeUI() {
    this.myProblemsGrid = document.querySelector('section:nth-of-type(1) .problem-grid');
    this.importedProblemsGrid = document.querySelector('section:nth-of-type(2) .problem-grid');
    this.myProblemsCount = document.querySelector('section:nth-of-type(1) header p');
    this.importedProblemsCount = document.querySelector('section:nth-of-type(2) header p');
    this.myProblemsEmptyState = document.querySelector('section:nth-of-type(1) .empty-state');
    this.importedProblemsEmptyState = document.querySelector('section:nth-of-type(2) .empty-state');
  }

  async loadProblems() {
    try {
      const { problems } = await this.problemService.getProblems();
      const currentUser = await this.userService.fetchUserInfo();
      
      const myProblems = problems.filter(p => p.meta.owner === currentUser.login);
      const importedProblems = problems.filter(p => p.path.startsWith('forked/'));
      
      this.displayProblems(myProblems, this.myProblemsGrid, this.myProblemsEmptyState);
      this.displayProblems(importedProblems, this.importedProblemsGrid, this.importedProblemsEmptyState);
      
      this.myProblemsCount.textContent = `총 ${myProblems.length}개 문제`;
      this.importedProblemsCount.textContent = `총 ${importedProblems.length}개 문제`;
    } catch (error) {
      console.error('문제 로드 오류:', error);
    }
  }

  displayProblems(problems, gridElement, emptyStateElement) {
    gridElement.innerHTML = '';
    
    if (problems.length === 0) {
      gridElement.style.display = 'none';
      emptyStateElement.hidden = false;
      return;
    }
    
    gridElement.style.display = 'grid';
    emptyStateElement.hidden = true;
    
    problems.forEach(problem => {
      const card = document.createElement('problem-card');
      card.setAttribute('mode', 'list');
      card.setAttribute('title', problem.meta.title);
      card.setAttribute('difficulty', problem.meta.difficulty || 'medium');
      card.setAttribute('updated-at', problem.meta.updatedAt || new Date().toISOString());
      card.setAttribute('solved', problem.meta.solved ? 'true' : 'false');
      card.setAttribute('problem-id', problem.id);
      card.ondelete = () => this.deleteProblem(problem.id);

      gridElement.appendChild(card);
    });
  }

  setupEventListeners() {
    document.querySelectorAll('.settings-button').forEach(button => {
      button.addEventListener('click', (e) => {
        if (e.target.getAttribute('aria-label') === '새 문제 생성') {
          window.location.href = '/edit.html';
        } else if (e.target.getAttribute('aria-label') === '문제 가져오기') {
          this.importProblem();
        }
      });
    });
  }

  async deleteProblem(id) {
    if (!confirm(`정말로 "${id}" 문제를 삭제하시겠습니까?`)) return;
    
    try {
      await this.problemService.deleteProblem(id);
      await this.loadProblems();
      location.reload();
    } catch (error) {
      console.error('문제 삭제 오류:', error);
      alert(`문제 삭제 실패: ${error.message}`);
    }
  }

  async importProblem() {
    if (this.isImporting) return;
    const problemId = prompt('가져올 문제 ID를 입력하세요 (예: owner@problem-id)');
    if (!problemId) return;
    this.isImporting = true;
    try {
      await this.problemService.importProblem(problemId);
    } catch (error) {
      console.error('문제 수입 오류', error);
      alert(`문제 수입 실패: ${error.message}`);
    } finally {
      this.isImporting = false;
    }
  }

  async onShow() {
    if (this.banner) {
      this.banner.setAttribute('status', statusAttr.value.online);
    }
  }
}

new ListApp();