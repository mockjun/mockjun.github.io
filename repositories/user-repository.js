import { Cookie } from '../modules/cookie.js';

export class UserRepository {
  constructor(token) {
    this.tokenKey = 'github-token';
    this.userInfoKey = 'user-info';
    if (token) {
      this.setAccessToken(token);
    } else {
      this.setAccessToken(Cookie.get(this.tokenKey))
    }
    this.userInfo = JSON.parse(localStorage.getItem(this.userInfoKey));
  }

  getAccessToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setAccessToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  clearAccessToken() {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }

  async getUserInfo() {
    if (this.userInfo) return this.userInfo;
    const token = this.getAccessToken();
    if (!token) {
      this.logout();
      return;
    }
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.clearAccessToken();
      }
      const errorText = await res.text();
      throw new Error(`GitHub API Error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const userInfo = await res.json();
    localStorage.setItem(this.userInfoKey, JSON.stringify(userInfo));
    return userInfo;
  }

  logout() {
    this.clearAccessToken();
    localStorage.removeItem(this.userInfoKey);
    location.href = '/start.html';
  }
}