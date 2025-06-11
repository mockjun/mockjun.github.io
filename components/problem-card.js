import { Utils } from '../modules/utils.js';

export class ProblemCard extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['mode', 'title', 'description', 'difficulty', 'updated-at', 'problem-id', 'solved'];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const mode = this.getAttribute('mode') || 'list';
    const title = this.getAttribute('title') || '제목 없음';
    const description = this.getAttribute('description') || '';
    const difficulty = this.getAttribute('difficulty') || 'medium';
    const updatedAt = this.getAttribute('updated-at') || new Date().toISOString();
    const problemId = this.getAttribute('problem-id') || '';
    const solved = this.getAttribute('solved') === 'true';
    
    if (mode === 'recent') {
      this.renderRecentMode({
        title,
        updatedAt,
        problemId,
        solved,
        Utils
      });
    } else {
      this.renderListMode({
        title,
        description,
        difficulty,
        updatedAt,
        problemId,
        Utils
      });
    }

    this.addEventListeners(problemId);
  }

  renderRecentMode({ title, updatedAt, problemId, solved, Utils }) {
    const timeAgo = Utils ? Utils.getTimeAgo(new Date(updatedAt)) : updatedAt;
    const statusText = solved ? '완료' : '진행 중';
    const buttonText = solved ? '다시 풀기' : '이어서 풀기';
    const buttonIcon = solved ? '🔄' : '▶️';

    this.className = 'problem-card';
    this.setAttribute('data-problem-id', problemId);
    
    this.innerHTML = `
    <article>
      <header>
        <h3>${title}</h3>
        <time datetime="${updatedAt}">${timeAgo}</time>
      </header>
      <div>
        <span class="progress-badge">${statusText}</span>
        <button type="button" class="continue-button" data-problem-id="${problemId}">
          <span aria-hidden="true">${buttonIcon}</span>
          <span>${buttonText}</span>
        </button>
      </div>
    </article>
    `;
  }

  renderListMode({ title, description, difficulty, updatedAt, problemId, Utils }) {
    const difficultyClass = difficulty || 'medium';
    const difficultyText = {
      easy: '쉬움',
      medium: '중간',
      hard: '어려움'
    }[difficultyClass] || '중간';
    
    const formattedDate = Utils ? Utils.formatDate(new Date(updatedAt)) : updatedAt;
    
    this.className = 'problem-card';
    this.setAttribute('role', 'listitem');
    this.setAttribute('data-problem-id', problemId);
    
    this.innerHTML = `
    <article>
      <h2><a href="/problem.html?id=${problemId}">${title}</a></h2>
      <p>${description}</p>
      <div class="problem-meta">
        <span class="difficulty ${difficultyClass}">${difficultyText}</span>
        <span>${formattedDate}</span>
      </div>
      <div class="card-actions">
        <button class="edit-button" aria-label="문제 수정">✏️</button>
        <button class="delete-button" aria-label="문제 삭제">🗑️</button>
      </div>
    </article>
    `;
  }

  addEventListeners(problemId) {
    const solveButton = this.querySelector('.solve-button');
    if (solveButton) {
      solveButton.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/problem.html?id=${problemId}`;
      });
    }

    const continueButton = this.querySelector('.continue-button');
    if (continueButton) {
      continueButton.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/problem.html?id=${problemId}`;
      });
    }

    const editButton = this.querySelector('.edit-button');
    if (editButton) {
      editButton.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/edit.html?id=${problemId}`;
      });
    }

    const deleteButton = this.querySelector('.delete-button');
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.ondelete?.();
      });
    }
  }
}