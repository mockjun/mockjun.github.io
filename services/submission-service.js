export class SubmissionService {
  constructor(submissionRepository) {
    this.repository = submissionRepository;
  }

  async initialize() {
    await this.repository.init();
  }

  async createSubmission(userId, problemId, code) {
    return this.repository.createSubmission({ userId, problemId, code });
  }

  async getSubmission(submissionId) {
    return this.repository.getSubmission(submissionId);
  }

  async updateSubmissionStatus(submissionId, status, testResults = []) {
    return this.repository.updateSubmission(submissionId, { status, testResults });
  }

  async deleteSubmission(submissionId) {
    return this.repository.deleteSubmission(submissionId);
  }

  async getSubmissionsForProblem(problemId) {
    return this.repository.getSubmissionsByProblem(problemId);
  }

  async getSubmissionsByUser(userId) {
    return this.repository.getSubmissionsByUser(userId);
  }
}