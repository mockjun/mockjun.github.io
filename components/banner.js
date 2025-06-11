export const statusAttr = {
  name: 'status',
  value: {
    offline: 'offline',
    syncing: 'syncing',
    online: 'online'
  },
  content: {
    offline: {
      icon: '🔌',
      text: '오프라인 환경입니다. 수정 내용은 로컬에만 저장됩니다.'
    },
    syncing: {
      icon: '🔄',
      text: 'GitHub와 동기화 중입니다...'
    },
    online: {
      icon: '📡',
      text: '인터넷에 연결되었습니다. 수정 사항이 Github에 반영됩니다.'
    }
  }
}

export class MockBanner extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return [statusAttr.name];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const status = this.getAttribute(statusAttr.name);
    
    this.innerHTML = `
      <div role="alert" aria-live="polite" class="sync-banner">
        <span aria-hidden="true">${statusAttr.content[status].icon}</span>
        <span>${statusAttr.content[status].text}</span>
      </div>
    `;
  }
}
