export class UserService {
  constructor(userRepository) {
    this.repository = userRepository;
    this.currentUserInfo = null;
  }

  getAccessToken() {
    return this.repository.getAccessToken();
  }

  setAccessToken(token) {
    this.repository.setAccessToken(token);
  }

  clearAccessToken() {
    this.repository.clearAccessToken();
    this.currentUserInfo = null;
  }

  isAuthenticated() {
    return this.repository.isAuthenticated();
  }

  ensureAuthenticated() {
    if (!this.isAuthenticated()) {
      this.logout();
    }
  }

  async fetchUserInfo() {
    if (!this.currentUserInfo) {
      this.currentUserInfo = await this.repository.getUserInfo();
    }
    return this.currentUserInfo;
  }

  getUserInfo() {
    return this.currentUserInfo;
  }

  logout() {
    this.repository.logout();
    this.currentUserInfo = null;
  }
}