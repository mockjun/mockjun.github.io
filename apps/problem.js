import { statusAttr } from '../components/banner.js';
import { AppBase } from './app-base.js';
import { Utils } from '../modules/utils.js';
import { ProblemData } from '../entity/problem-data.js';

class ProblemApp extends AppBase {
  constructor() {
    super();
    this.userService = null;
    this.problemService = null;
    this.submissionService = null;
    this.banner = null;
    this.problem = null;
    this.problemId = null;
    this.editor = null;
    this.preview = null;
    this.runButton = null;
    this.saveButton = null;
    this.shareButton = null;
    this.resetButton = null;
    this.saveStatus = null;
    this.resultOutput = null;
    this.resultPlaceholder = null;
    this.isSubmitting = false;
    this.autoSaveTimer = null;
  }

  async init() {
    try {
      this.userService = await this.getUserService();
      this.problemService = await this.getProblemService();
      this.submissionService = await this.getSubmissionService();

      this.autoSave = localStorage.getItem('auto-save') ?? true;

      this.banner = document.querySelector('mock-banner');
      this.banner.setAttribute('status', statusAttr.value.online);
      
      this.problemId = new URLSearchParams(window.location.search).get('id');
      if (!this.problemId) {
        this.showError('문제 ID가 지정되지 않았습니다.');
        return;
      }
    } catch (error) {
      console.error('앱 초기화 오류:', error);
      this.showError(`앱 초기화 오류: ${error.message}`);
      if (this.banner) {
        this.banner.setAttribute('status', statusAttr.value.error);
      }
    }
  }

  async build() {
    try {
      this.initializeUI();
      this.setupEventListeners();
      this.setupAutoSave();
      await this.loadProblem();
    } catch (error) {
      console.error('UI 구성 오류:', error);
      this.showError(`UI 구성 오류: ${error.message}`);
    }
  }

  initializeUI() {
    this.editor = document.getElementById('code-editor');
    this.preview = document.getElementById('highlight-preview');
    this.runButton = document.getElementById('run-button');
    this.saveButton = document.getElementById('save-button');
    this.shareButton = document.getElementById('share-button');
    this.resetButton = document.getElementById('reset-button');
    this.saveStatus = document.getElementById('save-status');
    this.resultOutput = document.getElementById('result-output');
    this.resultPlaceholder = document.getElementById('result-placeholder');
  }

  setupEventListeners() {
    this.runButton.addEventListener('click', () => this.execute());
    this.saveButton.addEventListener('click', () => this.saveCode());
    this.shareButton.addEventListener('click', () => this.shareProblem());
    this.resetButton.addEventListener('click', () => this.resetCode());
    
    this.editor.addEventListener('input', () => {
      this.updatePreview();
      this.resetAutoSaveTimer();
    });
  }

  setupAutoSave() {
    this.resetAutoSaveTimer();
  }

  resetAutoSaveTimer() {
    if (!this.autoSave) return;
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    if (this.isSubmitting) return;
    this.autoSaveTimer = setTimeout(() => {
      this.saveCode(true);
    }, 10000);
  }

  updatePreview() {
    const code = this.editor.value;
    this.preview.removeAttribute('data-highlighted');
    this.preview.textContent = code;
    hljs.highlightElement(this.preview);
  }

  async loadProblem() {
    try {
      this.problem = await this.problemService.getProblem(this.problemId);
      
      document.title = `MockJun - ${this.problem.meta.title}`;
      document.getElementById('problem-title').textContent = this.problem.meta.title;
      
      const difficultyElement = document.getElementById('problem-difficulty');
      difficultyElement.className = `difficulty ${this.problem.meta.difficulty}`;
      
      document.getElementById('problem-source').textContent = 
        this.problem.meta.source ? `출처: ${this.problem.meta.source}` : '';
      
      document.getElementById('problem-updated-at').innerText = `마지막 수정: ${Utils.formatDate(this.problem.meta.updatedAt)}`;

      document.querySelector('.description').innerHTML = this.problem.meta.description.replaceAll('\n', '<br/>');
      
      this.editor.value = this.problem.answerCode || '';
      this.updatePreview();
    } catch (error) {
      console.error('문제 로드 오류:', error);
      this.showError(`문제 로드 오류: ${error.message}`);
    }
  }

  async execute() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.runButton.disabled = true;
    const code = this.editor.value;
    if (!code.trim()) {
      this.showRunResult(false, '코드가 비어있습니다.');
      return;
    }
    await this.saveCode(true);
    
    const userId = this.userService.getUserInfo().login;
    
    await this.submissionService.createSubmission(
      userId,
      this.problemId,
      code
    );

    const executor = new Worker('../worker/executor.js');
    executor.onmessage = (event) => this.handleExecutor(event, executor);
    executor.onerror = (error) => {
      this.showError(error.message);
      setTimeout(() => location.reload(), 1000);
    }
    
    executor.postMessage({ problemCode: this.problem.problemCode, answerCode: code });
  }

  handleExecutor(event, executor) {
    if (!event.data || !event.data.type) return;
    const { type, payload } = event.data;
    if (type === 'start') {
      const resultOutput = document.getElementById('result-output');
      document.getElementById('result-placeholder').style.display = 'none';
      resultOutput.querySelector('tbody').innerHTML = '';
      resultOutput.style.display = 'block';
    } else if (type === 'add') {
      const { title, result } = payload;
      const table = document.querySelector('tbody');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><pre>${title}</pre></td>
        <td><strong class="difficulty ${result ? 'easy' : 'hard'}">${result ? '✓' : '✗'}</strong></td>
      `;
      table.appendChild(row);
    } else if (type === 'update') {
      document.querySelector('#result-meta span').innerText = JSON.stringify(payload);
    } else if (type === 'end') {
      const { elapsed, solved } = payload;
      const solvedStatus = document.querySelector('#result-meta span');
      solvedStatus.innerHTML = `<span aria-hidden="true">${solved ? '✅' : '❌'}</span> <span>${solved ? '성공' : '실패'}</span>`;
      solvedStatus.classList.remove('easy', 'hard');
      solvedStatus.classList.add(solved ? 'easy' : 'hard');
      document.querySelector('#result-meta small').innerText = `실행 시간: ${elapsed}초`;
      this.isSubmitting = false;
      this.runButton.disabled = false;
      executor.terminate();
    } else {
      this.showRunResult(false, `알 수 없는 동작: ${type}`);
    }
  }

  async saveCode(isAutoSave = false) {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    
    this.saveButton.disabled = true;
    this.updateSaveStatus('저장 중...');

    if (!isAutoSave && this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    try {
      const code = this.editor.value;
      await this.problemService.updateProblem(this.problemId, { answerCode: code });
      
      if (!isAutoSave) {
        this.updateSaveStatus('저장됨');
      } else {
        this.updateSaveStatus('자동 저장됨');
      }
    } catch (error) {
      console.error('코드 저장 오류:', error);
      this.updateSaveStatus('저장 실패', true);
    } finally {
      this.isSubmitting = false;
      this.saveButton.disabled = false;
    }
  }

  updateSaveStatus(message, isError = false) {
    if (!this.saveStatus) return;
    
    this.saveStatus.innerHTML = `
      <span aria-hidden="true">${isError ? '❌' : '✅'}</span>
      <span>${message}</span>
    `;
    
    this.saveStatus.className = isError ? 'error' : '';
  }

  shareProblem() {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('문제 링크가 클립보드에 복사되었습니다.');
      })
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
        alert('링크 복사에 실패했습니다: ' + err.message);
      });
  }

  resetCode() {
    if (confirm('작성한 코드를 초기화하시겠습니까?')) {
      this.editor.value = '';
      this.updatePreview();
      this.saveCode();
    }
  }

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    const main = document.querySelector('main');
    main.innerHTML = '';
    main.appendChild(errorElement);
  }

  async onShow() {
    if (this.banner) {
      this.banner.setAttribute('status', statusAttr.value.online);
    }
  }

  async onHide() {
    await this.saveCode(true);
  }

  async dispose(e) {
    if (this.editor && this.editor.value && !this.isSubmitting) {
      await this.saveCode(true);
    }
  }
}

new ProblemApp();