class GithubAPIError extends Error {
  constructor(status, statusText, message) {
    super(message);
    this.name = 'GithubAPIError';
    this.status = status;
    this.statusText = statusText;
    this.responseMessage = message;
  }
}

export class GithubModule {
  constructor({ token, owner, repo, branch = 'main', isOrg = false }) {
    if (!token) throw new Error('GitHub token is required');
    if (!owner) throw new Error('Repository owner is required');
    if (!repo) throw new Error('Repository name is required');

    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.isOrg = isOrg;
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  _encodeToBase64(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    const binary = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }

  _decodeFromBase64(str) {
    const binary = atob(str.replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  _headers(extra = {}) {
    return {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github+json',
      ...extra
    };
  }

  async _request(path, options = {}, specificBaseUrl = null) {
    const url = specificBaseUrl ? `${specificBaseUrl}${path}` : `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: this._headers(options.headers || {})
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new GithubAPIError(res.status, res.statusText, msg);
    }

    const contentType = res.headers.get('content-type');
    return contentType?.includes('application/json') ? res.json() : res.text();
  }

  _validatePath(path) {
    if (!path || typeof path !== 'string') throw new Error('Path must be a non-empty string');
    if (path.includes('..')) throw new Error('Path must not contain directory traversal');
    return path.startsWith('/') ? path.slice(1) : path;
  }

  async getUser() {
    return this._request('/user', {}, 'https://api.github.com');
  }

  async getFile(path) {
    const validPath = this._validatePath(path);
    const data = await this._request(`/contents/${validPath}`);
    const content = this._decodeFromBase64(data.content);

    return { ...data, content };
  }

  async getExternalFile(path) {
    if (!path || typeof path !== 'string') throw new Error('External file path must be a non-empty string');

    const res = await fetch(path, {
      headers: this._headers()
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`GitHub API Error: ${res.status} ${res.statusText} - ${msg}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) throw new Error(`GitHub API Error: unexpected content type ${contentType}`);
    const data = await res.json();
    const content = this._decodeFromBase64(data.content);
    return { ...data, content };
  }

  async checkRepositoryExists() {
    try {
      await this._request('', {}, `https://api.github.com/repos/${this.owner}/${this.repo}`);
      return true;
    } catch (error) {
      if (error instanceof GithubAPIError && error.status === 404) {
        console.log(`Repository '${this.owner}/${this.repo}' does not exist.`);
        return false;
      }
      console.error(`Error checking repository existence: ${error.message}`);
      throw error;
    }
  }

  async createRepository(repoName, description = '', isPrivate = false, autoInit = true) {
    const createRepoApiUrl = this.isOrg ?
      `https://api.github.com/orgs/${this.owner}/repos` :
      `https://api.github.com/user/repos`;

    const body = {
      name: repoName,
      description,
      private: isPrivate,
      auto_init: autoInit,
    };

    console.log(`Attempting to create repository '${repoName}' under '${this.owner}' at ${createRepoApiUrl}`);
    try {
      return await this._request('', {
        method: 'POST',
        body: JSON.stringify(body)
      }, createRepoApiUrl);
    } catch (err) {
      console.error('Failed to create repository:', err);
      const message = err.message || err.responseMessage;
      if (message.includes('Resource not accessible by personal access token')) {
        throw new Error('Repository creation failed: forbidden');
      }
      throw new Error(`Repository creation failed: ${message}`);
    }
  }

  async putFile(path, content, message, sha = null) {
    const validPath = this._validatePath(path);
    if (!content) throw new Error('Content is required');
    if (!message) throw new Error('Commit message is required');

    const body = {
      message,
      content: this._encodeToBase64(content),
      branch: this.branch
    };
    if (sha) body.sha = sha;

    const repoExists = await this.checkRepositoryExists();
    if (!repoExists) {
      console.log(`Repository '${this.owner}/${this.repo}' does not exist. Creating it now.`);
      try {
        await this.createRepository(this.repo, `Auto-created by GithubModule for ${this.repo}`, false, true);
        console.log(`Repository '${this.owner}/${this.repo}' created successfully.`);
      } catch (createErr) {
        console.error('Failed to auto-create repository:', createErr);
        throw createErr;
      }
    }

    try {
      return await this._request(`/contents/${validPath}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.log('Error during putFile after repo check/creation:', err.name, err.status, err.message);

      if (err instanceof GithubAPIError && err.status === 409) {
        console.log('Conflict (409) detected. Attempting to get latest SHA and retry.');
        try {
          const latest = await this.getFile(validPath);
          body.sha = latest.sha;
          return await this._request(`/contents/${validPath}`, {
            method: 'PUT',
            body: JSON.stringify(body)
          });
        } catch (retryErr) {
          console.error('Failed to get latest SHA or retry putFile after 409:', retryErr);
          throw retryErr;
        }
      }

      if (err.responseMessage && err.responseMessage.includes('This repository is empty')) {
        console.log('Detected "This repository is empty" error. Assuming first commit to main branch.');
        body.branch = 'main';
        return this._request(`/contents/${validPath}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      }

      throw err;
    }
  }

  async deleteFile(path, message, sha) {
    const validPath = this._validatePath(path);
    if (!message) throw new Error('Commit message is required');
    if (!sha) throw new Error('File SHA is required for deletion');

    return this._request(`/contents/${validPath}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        sha,
        branch: this.branch
      })
    });
  }

  async listDirectory(path = '') {
    const validPath = path ? this._validatePath(path) : '';
    return this._request(`/contents/${validPath}`);
  }

  async getCommits(path, perPage = 10) {
    const validPath = this._validatePath(path);
    return this._request(`/commits?path=${validPath}&per_page=${perPage}`);
  }
}