export class MockFooter extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <footer>
        <p>© 2024 MockJun. GitHub Pages 호스팅 중.</p>
        <nav class="footer-nav">
          <a href="https://github.com/mockjun" target="_blank" rel="noopener">
            <span aria-hidden="true">📦</span>
            <span>GitHub</span>
          </a>
          <a href="#" target="_blank" rel="noopener">
            <span aria-hidden="true">💬</span>
            <span>피드백</span>
          </a>
          <a href="#" target="_blank" rel="noopener">
            <span aria-hidden="true">⚖️</span>
            <span>개인정보처리방침</span>
          </a>
        </nav>
      </footer>
    `;
  }
}
