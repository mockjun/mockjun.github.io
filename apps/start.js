import { Cookie } from '../modules/cookie.js';
import { UserRepository } from '../repositories/user-repository.js';
import { UserService } from '../services/user-service.js';
import { AppBase } from './app-base.js';

class StartApp extends AppBase {
  constructor() {
    super(false);
    this.githubTokenInput = null;
    this.saveTokenButton = null;
    this.statusArea = null;
    this.userRepository = new UserRepository();
  }

  async init() {
    try {
      console.log('Start app initialized');
    } catch (error) {
      console.error('Failed to initialize start app:', error);
    }
  }

  async build() {
    try {
      this.initializeUI();
      this.setupEventListeners();
      await this.checkSavedToken();
    } catch (error) {
      console.error('Failed to build start app:', error);
    }
  }

  initializeUI() {
    this.githubTokenInput = document.getElementById('github-token');
    this.saveTokenButton = document.getElementById('save-token-button');
    this.statusArea = document.querySelector('[role="status"]');
  }

  async checkSavedToken() {
    const savedToken = this.userRepository.getAccessToken();

    if (savedToken) {
      try {
        const userService = new UserService(new UserRepository(savedToken));
        await userService.fetchUserInfo();
        this.githubTokenInput.value = savedToken;
        this.showStatus('저장된 정보가 있습니다. "토큰 저장 및 시작" 버튼을 눌러 시작하세요.', true);
      } catch (error) {
        this.userRepository.clearAccessToken();
      }
    }
  }

  setupEventListeners() {
    this.saveTokenButton.addEventListener('click', () => this.handleSaveToken());
  }

  async handleSaveToken() {
    const token = this.githubTokenInput.value.trim();

    if (!token) {
      this.showStatus('GitHub 토큰을 입력해주세요.', false);
      return;
    }

    try {
      const userService = new UserService(new UserRepository(token));
      await userService.fetchUserInfo();

      Cookie.set('github-token', token, { maxAge: 31536000 });
      this.showStatus('프로필이 등록되었습니다. 시작합니다.', true);

      window.location.href = '/';
    } catch (error) {
      Cookie.remove('github-token');
      console.error('GitHub 토큰 유효성 검사 실패:', error);
      this.showStatus('유효하지 않은 GitHub 토큰입니다. 다시 확인해주세요.', false);
    }
  }

  showStatus(message, success) {
    if (!this.statusArea) return;
    
    this.statusArea.textContent = message;
    
    if (success) {
      this.statusArea.style.backgroundColor = 'var(--color-success-300)';
      this.statusArea.style.borderColor = 'var(--color-success-400)';
    } else {
      this.statusArea.style.backgroundColor = 'var(--color-danger-300)';
      this.statusArea.style.borderColor = 'var(--color-danger-400)';
    }
  }
}

new StartApp();
