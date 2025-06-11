import { AppBase } from "./app-base.js";
import { DBModule } from '../modules/db-module.js';
import { Stores } from '../entity/stores.js';
import { statusAttr } from '../components/banner.js';
import { Utils } from '../modules/utils.js';

export class ProfileApp extends AppBase {
  constructor() {
    super();
    this.userService = null;
    this.problemService = null;
    this.submissionService = null;
    this.banner = null;
    this.userInfo = null;
    this.deleting = false;
    this.problems = [];
    this.submissions = [];
    this.elements = {};
    this.settings = {
      theme: localStorage.getItem('theme') || 'dark',
      language: localStorage.getItem('language') || 'ko',
      autoSave: localStorage.getItem('autoSave') !== 'false',
    };
  }

  async init() {
    this.elements = {
      profileImage: document.getElementById('profile-image'),
      username: document.getElementById('username'),
      userBio: document.getElementById('user-bio'),
      submissionsList: document.getElementById('submissions-list'),
      viewMoreBtn: document.getElementById('view-more'),
      exportBtn: document.getElementById('export'),
      clearCacheBtn: document.getElementById('clear-cache'),
      refreshTokenBtn: document.getElementById('refresh-token'),
      accountSettingsBtn: document.getElementById('account-settings'),
      settingsModal: document.getElementById('settings-modal'),
      saveSettingsBtn: document.getElementById('save-settings'),
      cancelSettingsBtn: document.getElementById('cancel-settings')
    };

    this.userService = await this.getUserService();
    this.problemService = await this.getProblemService();
    this.submissionService = await this.getSubmissionService();

    this.userInfo = await this.userService.getUserInfo();

    this.setupEventListeners();
    this.loadSettings();
  }

  async build() {
    try {
      await this.loadProblems();
      await this.loadSubmissions();
      
      this.updateUserProfile();
      this.updateProblemStats();
      this.updateRecentSubmissions();
      this.updateSystemInfo();
      await this.updateAccountSettings();
      
      this.setupEventListeners();
      this.loadSettings();
    } catch (error) {
      console.error('앱 빌드 오류:', error);
    }
  }

  async loadProblems() {
    try {
      const { problems } = await this.problemService.getProblems();
      this.problems = problems;
    } catch (error) {
      console.error('문제 로드 오류:', error);
    }
  }

  async loadSubmissions() {
    try {
      if (this.userInfo) {
        this.submissions = await this.submissionService.getSubmissionsByUser(this.userInfo.login);
      }
    } catch (error) {
      console.error('제출 로드 오류:', error);
    }
  }

  updateUserProfile() {
    if (!this.userInfo) return;
    
    const elements = {
      profileImage: document.getElementById('profile-image'),
      username: document.getElementById('username'),
      userBio: document.getElementById('user-bio'),
      joinDate: document.getElementById('join-date'),
      userEmail: document.getElementById('user-email'),
      offlineCount: document.getElementById('offline-count'),
      githubCount: document.getElementById('github-count')
    };

    elements.profileImage.src = this.userInfo.avatar_url;
    elements.profileImage.alt = `${this.userInfo.login}의 프로필 이미지`;
    
    elements.username.textContent = this.userInfo.name || this.userInfo.login;
    
    elements.userBio.textContent = this.userInfo.bio || 'GitHub 사용자';
    
    const createdAt = new Date(this.userInfo.created_at);
    elements.joinDate.textContent = `since ${Utils.formatDate(createdAt)}`;
    
    const hasEmail = !!this.userInfo.email;
    const emailAddress = this.userInfo.email || `${this.userInfo.login}@github.com`;
    elements.userEmail.textContent = emailAddress;
    elements.userEmail.href = hasEmail ? `mailto:${emailAddress}` : this.userInfo.html_url;
    
    const localProblems = this.problems.filter(p => !p.meta.synced);
    elements.offlineCount.textContent = `${localProblems.length}건`;
    
    const syncedProblems = this.problems.filter(p => p.meta.synced);
    elements.githubCount.textContent = `${syncedProblems.length}건`;
  }

  updateProblemStats() {
    const elements = {
      totalSolved: document.getElementById('total-solved'),
      totalSolvedPercent: document.getElementById('total-solved-percent'),
      recentSolved: document.getElementById('recent-solved'),
      recentSolvedDiff: document.getElementById('recent-solved-diff'),
      successRate: document.getElementById('success-rate'),
      mostLanguage: document.getElementById('most-language'),
      languagePercent: document.getElementById('language-percent')
    };

    if (elements.totalSolved) {
      const solvedProblems = this.problems.filter(p => p.meta.solved);
      elements.totalSolved.textContent = solvedProblems.length;
      
      if (elements.totalSolvedPercent && this.problems.length > 0) {
        const percent = Math.round((solvedProblems.length / this.problems.length) * 100);
        elements.totalSolvedPercent.textContent = `전체 문제의 ${percent}%`;
      }
    }
    
    if (elements.recentSolved) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const last30DaysSubmissions = this.submissions.filter(s => 
        new Date(s.submittedAt) >= thirtyDaysAgo && s.status === 'success'
      );
      
      const previous30DaysSubmissions = this.submissions.filter(s => 
        new Date(s.submittedAt) >= sixtyDaysAgo && 
        new Date(s.submittedAt) < thirtyDaysAgo && 
        s.status === 'success'
      );
      
      elements.recentSolved.textContent = last30DaysSubmissions.length;
      
      if (elements.recentSolvedDiff) {
        const diff = last30DaysSubmissions.length - previous30DaysSubmissions.length;
        const diffText = diff >= 0 ? `↑ ${diff}` : `↓ ${Math.abs(diff)}`;
        const className = diff >= 0 ? 'success' : 'error';
        
        elements.recentSolvedDiff.textContent = `${diffText} 지난달 대비`;
        elements.recentSolvedDiff.className = `small ${className}`;
      }
    }
    
    if (elements.successRate) {
      const recentSubmissions = [...this.submissions]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 20);
      
      const successCount = recentSubmissions.filter(s => s.status === 'success').length;
      const successRate = recentSubmissions.length > 0 
        ? Math.round((successCount / recentSubmissions.length) * 100) 
        : 0;
      
      elements.successRate.textContent = `성공률 ${successRate}%`;
    }
    
    if (elements.mostLanguage) {
      const languageStats = this.calculateLanguageStats();
      const mostUsed = Object.entries(languageStats)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostUsed) {
        elements.mostLanguage.textContent = mostUsed[0];
        if (elements.languagePercent) {
          const percent = Math.round((mostUsed[1] / this.submissions.length) * 100);
          elements.languagePercent.textContent = `전체 풀이의 ${percent}%`;
        }
      }
    }
  }

  calculateLanguageStats() {
    const stats = {};
    this.submissions.forEach(submission => {
      const lang = submission.language || 'JavaScript';
      stats[lang] = (stats[lang] || 0) + 1;
    });
    return stats;
  }

  updateRecentSubmissions() {
    const submissionsList = document.getElementById('submissions-list');
    if (!submissionsList || this.submissions.length === 0) return;
    
    submissionsList.innerHTML = '';
    
    const recentSubmissions = [...this.submissions]
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5);
    
    recentSubmissions.forEach(submission => {
      const problem = this.problems.find(p => p.id === submission.problemId);
      if (!problem) return;
      
      const li = document.createElement('li');
      li.innerHTML = `
        <span aria-hidden="true">${submission.status === 'success' ? '✓' : '✕'}</span>
        <div class="description">
          <h3>${problem.meta.title}</h3>
          <p><small>문제 ID: ${problem.id} • ${Utils.formatDate(submission.submittedAt)}</small></p>
        </div>
        <span class="difficulty ${problem.meta.difficulty || 'medium'}">
          ${problem.meta.difficulty === 'easy' ? '쉬움' : 
            problem.meta.difficulty === 'hard' ? '어려움' : '보통'}
        </span>
      `;
      
      li.addEventListener('click', () => {
        window.location.href = `/problem.html?id=${problem.id}`;
      });
      
      submissionsList.appendChild(li);
    });
  }

  updateSystemInfo() {
    const elements = {
      localStorageCount: document.getElementById('local-storage-count'),
      lastSyncTime: document.getElementById('last-sync-time'),
      syncTimeAgo: document.getElementById('sync-time-ago')
    };

    if (elements.localStorageCount) {
      elements.localStorageCount.textContent = `${this.problems.length} 문제`;
    }
    
    if (elements.lastSyncTime) {
      const now = new Date();
      const syncTime = new Date(now.getTime() - Math.random() * 5 * 60 * 60 * 1000);
      
      elements.lastSyncTime.textContent = Utils.formatDate(syncTime) + ' ' + 
        syncTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      
      if (elements.syncTimeAgo) {
        const diffMs = now - syncTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        elements.syncTimeAgo.textContent = `${diffHours}시간 ${diffMinutes}분 전`;
      }
    }
  }

  async updateAccountSettings() {
    const elements = {
      tokenInfo: document.getElementById('token-info'),
      tokenCheckTime: document.getElementById('token-check-time')
    };

    if (elements.tokenInfo && this.userService.getAccessToken()) {
      const token = this.userService.getAccessToken();
      const maskedToken = token.substring(0, 2) + '*'.repeat(token.length - 6) + token.substring(token.length - 4);
      elements.tokenInfo.textContent = `연결됨 (${maskedToken})`;
    }
    
    if (elements.tokenCheckTime) {
      elements.tokenCheckTime.textContent = '마지막 확인: 오늘';
    }
  }

  setupEventListeners() {
    const elements = {
      exportBtn: document.getElementById('export-btn'),
      clearCacheBtn: document.getElementById('clear-cache-btn'),
      refreshTokenBtn: document.getElementById('refresh-token-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      viewMoreBtn: document.getElementById('view-more-btn'),
      settingsModal: document.getElementById('settings-modal'),
      saveSettings: document.getElementById('save-settings'),
      cancelSettings: document.getElementById('cancel-settings')
    };

    if (elements.exportBtn) {
      elements.exportBtn.addEventListener('click', this.handleExport.bind(this));
    }
    
    if (elements.clearCacheBtn) {
      elements.clearCacheBtn.addEventListener('click', this.handleClearCache.bind(this));
    }
    
    if (elements.refreshTokenBtn) {
      elements.refreshTokenBtn.addEventListener('click', this.handleRefreshToken.bind(this));
    }
    
    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener('click', this.handleAccountSettings.bind(this));
    }
    
    if (elements.viewMoreBtn) {
      elements.viewMoreBtn.addEventListener('click', this.handleViewMore.bind(this));
    }

    if (elements.saveSettings) {
      elements.saveSettings.addEventListener('click', this.saveSettings.bind(this));
    }

    if (elements.cancelSettings) {
      elements.cancelSettings.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
      });
    }
  }

  loadSettings() {
    const elements = {
      themeToggle: document.getElementById('theme-toggle'),
      autoSaveToggle: document.getElementById('auto-save-toggle'),
      languageSelect: document.getElementById('language-select')
    };

    elements.themeToggle.checked = this.settings.theme === 'dark';
    elements.autoSaveToggle.checked = this.settings.autoSave;
    elements.languageSelect.value = this.settings.language;
  }

  async handleExport() {
    try {
      const exportData = {
        problems: this.problems,
        submissions: this.submissions,
        userInfo: this.userInfo,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mockjun-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('백업 내보내기 오류:', error);
      alert('백업 내보내기에 실패했습니다.');
    }
  }

  async handleClearCache() {
    if (this.deleting) return;
    this.deleting = true;
    const result = confirm('로컬 캐시를 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (result) {
      try {
        const db = new DBModule(Stores.NAME, Stores.VALUES);
        await db.init();
        
        for (const store of Stores.VALUES) {
          await db.clear(store);
        }
        
        db.close();
        localStorage.clear();
        localStorage.setItem('theme', 'dark');
        
        alert('캐시가 성공적으로 지워졌습니다. 페이지를 새로고침합니다.');
        window.location.reload();
      } catch (error) {
        console.error('캐시 지우기 오류:', error);
        alert('캐시 지우기에 실패했습니다.');
      } finally {
        this.deleting = false;
      }
    }
  }

  handleRefreshToken() {
    window.location.href = '/start.html';
  }

  handleAccountSettings() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'flex';
    }
  }

  saveSettings() {
    const elements = {
      themeToggle: document.getElementById('theme-toggle'),
      autoSaveToggle: document.getElementById('auto-save-toggle'),
      languageSelect: document.getElementById('language-select'),
      settingsModal: document.getElementById('settings-modal')
    };

    this.settings = {
      theme: elements.themeToggle.checked ? 'dark' : 'light',
      autoSave: elements.autoSaveToggle.checked,
      language: elements.languageSelect.value
    };

    localStorage.setItem('theme', this.settings.theme);
    localStorage.setItem('autoSave', this.settings.autoSave);
    localStorage.setItem('language', this.settings.language);

    document.body.className = this.settings.theme;
    elements.settingsModal.style.display = 'none';
  }

  async handleViewMore() {
    try {
      const submissionsList = document.getElementById('submissions-list');
      const viewMoreBtn = document.getElementById('view-more-btn');
      
      if (!submissionsList) return;
      
      submissionsList.innerHTML = '';
      
      for (const submission of this.submissions) {
        const problem = this.problems.find(p => p.id === submission.problemId);
        if (!problem) continue;
        
        const li = document.createElement('li');
        li.innerHTML = `
          <span aria-hidden="true">${submission.status === 'success' ? '✓' : '✕'}</span>
          <div class="description">
            <h3>${problem.meta.title}</h3>
            <p><small>문제 ID: ${problem.id} • ${Utils.formatDate(submission.submittedAt)}</small></p>
          </div>
          <span class="difficulty ${problem.meta.difficulty || 'medium'}">
            ${problem.meta.difficulty === 'easy' ? '쉬움' : 
              problem.meta.difficulty === 'hard' ? '어려움' : '보통'}
          </span>
        `;
        
        li.addEventListener('click', () => {
          window.location.href = `/problem.html?id=${problem.id}`;
        });
        
        submissionsList.appendChild(li);
      }
      
      if (viewMoreBtn) {
        viewMoreBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('제출 목록 로드 오류:', error);
      alert('제출 목록을 불러오는데 실패했습니다.');
    }
  }

  onShow() {
    if (this.banner && navigator.onLine) {
      this.banner.setAttribute('status', statusAttr.value.online);
    }
  }
}

new ProfileApp();