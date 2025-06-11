import { Stores } from '../entity/stores.js';
import { statusAttr } from '../components/banner.js';
import { AppBase } from './app-base.js';
import { ProblemMeta } from '../entity/problem-meta.js';
import { ProblemData } from '../entity/problem-data.js';

class EditApp extends AppBase {
  constructor() {
    super();
    this.userService = null;
    this.banner = null;
    this.saveButton = null;
    this.saveStatus = null;
    this.isSubmitting = false;
  }

  async init() {
    try {
      const problemId = new URLSearchParams(window.location.search).get('id');
      this.editMode = !!problemId;
      if (this.editMode) {
        const problemService = await this.getProblemService();
        this.problem = await problemService.getProblem(problemId);
      }
    } catch (error) {
      this.showStatusMessage('앱 구성에 실패했습니다: ' + error.message, 'error');
    }
  }

  async build() {
    try {
      this.initializeUI();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to build edit app:', error);
      this.showStatusMessage('앱 구성에 실패했습니다: ' + error.message, 'error');
    }
  }

  initializeUI() {
    this.banner = document.querySelector('mock-banner');
    this.saveButton = document.getElementById('save-button');
    this.saveStatus = document.getElementById('save-status');

    this.updateBannerStatus();

    if (!this.editMode) return;
    const setValue = (id, value) => document.getElementById(id).value = value;

    setValue('problem-title', this.problem.meta.title);
    setValue('problem-description', this.problem.meta.description);
    setValue('problem-code', this.problem.problemCode);
    setValue('answer-code', this.problem.answerCode);
    setValue('problem-difficulty', this.problem.meta.difficulty);
  }

  setupEventListeners() {
    this.saveButton.addEventListener('click', () => this.handleSave());

    window.addEventListener('online', () => this.updateBannerStatus());
    window.addEventListener('offline', () => this.updateBannerStatus());

    const fields = [
      'problem-title',
      'problem-description',
      'problem-code',
      'answer-code',
      'problem-source',
      'problem-difficulty'
    ];

    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      field.addEventListener('input', () => {
        this.validateForm();
      });
    });
  }

  updateBannerStatus() {
    if (!this.banner) return;

    const status = navigator.onLine ? statusAttr.value.online : statusAttr.value.offline;
    this.banner.setAttribute(statusAttr.name, status);
  }

  validateForm() {
    const valueOf = (id) => document.getElementById(id).value;
    const title = valueOf('problem-title').trim();
    const description = valueOf('problem-description').trim();
    const problemCode = valueOf('problem-code').trim();
    const answerCode = valueOf('answer-code').trim();
    const source = valueOf('problem-source').trim();
    const difficulty = valueOf('problem-difficulty');

    if (!title) {
      this.showStatusMessage('제목은 필수입니다', 'error');
      return false;
    }
    if (title.length > 50) {
      this.showStatusMessage('제목은 50자를 초과할 수 없습니다', 'error');
      return false;
    }

    if (!description) {
      this.showStatusMessage('설명은 필수입니다', 'error');
      return false;
    }
    if (description.length > 1000) {
      this.showStatusMessage('설명은 1000자를 초과할 수 없습니다', 'error');
      return false;
    }

    if (!problemCode) {
      this.showStatusMessage('문제 코드는 필수입니다', 'error');
      return false;
    }
    if (problemCode.length > 10000) {
      this.showStatusMessage('문제 코드는 10000자를 초과할 수 없습니다', 'error');
      return false;
    }

    if (answerCode && answerCode.length > 10000) {
      this.showStatusMessage('정답 코드는 10000자를 초과할 수 없습니다', 'error');
      return false;
    }

    if (source && source.length > 200) {
      this.showStatusMessage('출처는 200자를 초과할 수 없습니다', 'error');
      return false;
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      this.showStatusMessage('유효하지 않은 난이도입니다', 'error');
      return false;
    }

    this.showStatusMessage('', '');
    this.saveButton.disabled = this.isSubmitting;
    return true;
  }

  async handleSave() {
    if (this.isSubmitting || !this.validateForm()) return;

    this.isSubmitting = true;
    this.saveButton.disabled = true;
    this.showStatusMessage('문제를 저장하는 중...', 'loading');

    if (navigator.onLine && this.banner) {
      this.banner.setAttribute(statusAttr.name, statusAttr.value.syncing);
    }

    try {
      const formData = this.getFormData();

      const problemService = await this.getProblemService();
      await problemService.createProblem(formData);

      this.showStatusMessage('문제가 성공적으로 저장되었습니다! 문제 목록으로 이동합니다.', 'success');

      setTimeout(() => {
        this.resetForm();
        window.location.href = '/list.html';
      }, 1500);

    } catch (error) {
      console.error('Failed to save problem:', error);

      const isRepoNotFoundError = (
        error.message.includes('GitHub 저장소를 찾을 수 없습니다') ||
        (error.message.toLowerCase().includes('repository') && 
         error.message.toLowerCase().includes('exist') && 
         error.message.includes('404'))
      );

      if (isRepoNotFoundError) {
        this.showRepoNotFoundMessage();
      } else if (error.message.includes('이미 존재하는 문제입니다')) {
        this.showStatusMessage('이미 존재하는 문제입니다. 다른 제목을 사용해주세요.', 'error');
      } else {
        this.showStatusMessage('문제 저장에 실패했습니다: ' + error.message, 'error');
      }
    } finally {
      this.isSubmitting = false;
      this.saveButton.disabled = false;

      setTimeout(() => {
        this.updateBannerStatus();
      }, 2000);
    }
  }

  getFormData() {
    return {
      title: document.getElementById('problem-title').value.trim(),
      description: document.getElementById('problem-description').value.trim(),
      problemCode: document.getElementById('problem-code').value.trim(),
      answerCode: document.getElementById('answer-code').value.trim(),
      source: document.getElementById('problem-source').value.trim(),
      difficulty: document.getElementById('problem-difficulty').value,
      solved: false
    };
  }

  resetForm() {
    document.getElementById('problem-title').value = '';
    document.getElementById('problem-description').value = '';
    document.getElementById('problem-code').value = '';
    document.getElementById('answer-code').value = '';
    document.getElementById('problem-source').value = '';
    document.getElementById('problem-difficulty').value = 'medium';
    this.showStatusMessage('', '');
  }


  showStatusMessage(message, type) {
    if (!this.saveStatus) return;

    this.saveStatus.textContent = message;
    this.saveStatus.className = `status-message ${type}`;

    const icons = {
      loading: '🔄',
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    if (icons[type]) {
      this.saveStatus.innerHTML = `<span aria-hidden="true">${icons[type]}</span> ${message}`;
    }
  }

  showRepoNotFoundMessage() {
    if (!this.saveStatus) return;
    
    this.saveStatus.className = 'status-message error';
    this.saveStatus.innerHTML = `
      <span aria-hidden="true">❌</span> 
      <span>저장소를 찾을 수 없습니다. GitHub에 'mockjun-problems' 레포지토리를 생성해주세요.</span>
      <button id="save-locally-btn" class="btn btn-secondary mt-2">로컬에만 저장하기</button>
    `;
    
    const saveLocallyBtn = document.getElementById('save-locally-btn');
    if (saveLocallyBtn) {
      saveLocallyBtn.addEventListener('click', () => this.saveLocally());
    }
  }
  
  async saveLocally() {
    if (this.isSubmitting || !this.validateForm()) return;
    
    this.isSubmitting = true;
    this.showStatusMessage('문제를 로컬에 저장하는 중...', 'loading');

    const problemService = await this.getProblemService();
    
    try {
      const formData = this.getFormData();
      
      const id = formData.title;
      
      const existing = await problemService.repository.db.get(Stores.PROBLEMS, id);
      if (existing) {
        throw new Error(`이미 존재하는 문제입니다: ${formData.title}`);
      }
      
      const currentUser = await this.userService.fetchUserInfo();
      if (!currentUser) {
        throw new Error('로그인된 사용자 정보를 가져올 수 없습니다.');
      }
      
      const meta = new ProblemMeta({
        title: formData.title,
        description: formData.description,
        source: formData.source,
        difficulty: formData.difficulty,
        solved: formData.solved,
        owner: currentUser.login
      });
      
      const problem = new ProblemData({
        id,
        path,
        meta,
        problemCode: formData.problemCode,
        answerCode: formData.answerCode
      });

      await problemService.repository.db.put(Stores.PROBLEMS, problem);
      
      this.showStatusMessage('문제가 로컬에 저장되었습니다. GitHub 저장소가 생성되면 자동으로 동기화됩니다.', 'success');
      
      setTimeout(() => {
        this.resetForm();
        window.location.href = '/list.html';
      }, 2000);
      
    } catch (error) {
      console.error('Failed to save problem locally:', error);
      this.showStatusMessage('로컬 저장에 실패했습니다: ' + error.message, 'error');
    } finally {
      this.isSubmitting = false;
    }
  }


  onHide() {
    console.log('EditApp is now hidden');
  }

  onShow() {
    console.log('EditApp is now visible');
    if (this.banner) {
      this.updateBannerStatus();
    }
  }

  dispose(event) {
    console.log('EditApp is being disposed');
    if (this.isSubmitting) {
      event.preventDefault();
      event.returnValue = '문제 저장이 진행 중입니다. 정말로 나가시겠습니까?';
      return event.returnValue;
    }
  }
}

new EditApp();