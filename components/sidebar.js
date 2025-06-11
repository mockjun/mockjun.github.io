export class MockSidebar extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <aside>
        <nav>
          <h3>빠른 링크</h3>
          <ul>
            <li>
              <span aria-hidden="true">📌</span>
              <a href="/list.html">문제 목록</a>
            </li>
            <li>
              <span aria-hidden="true">📋</span>
              <a href="/profile.html#recent-submissions">최근 풀이 목록</a>
            </li>
            <li>
              <span aria-hidden="true">💾</span>
              <a href="/edit.html">새 문제</a>
            </li>
            <li>
              <span aria-hidden="true">📊</span>
              <a href="/profile.html#activity-summary">활동 요약</a>
            </li>
            <li>
              <span aria-hidden="true">⚙️</span>
              <a href="/profile.html#settings-btn">설정</a>
            </li>
          </ul>
        </nav>
      </aside>
    `;
  }
}
