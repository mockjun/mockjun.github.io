export class MockHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <header>
        <nav class="container">
          <a href="/" class="logo">
            <span aria-hidden="true">🐱</span>
            <strong>Mock</strong>Jun
          </a>
          <div class="user-menu">
            <a href="/profile.html" class="user-profile">
              <span aria-hidden="true">👤</span>
              <span>@guest</span>
            </a>
            <button type="button">
              <span aria-hidden="true">🚪</span>
              <span>로그아웃</span>
            </button>
          </div>
        </nav>
      </header>
    `;
  }
}
