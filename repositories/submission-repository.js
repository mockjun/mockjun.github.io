import { SubmissionData } from '../entity/submission-data.js';
import { Stores } from '../entity/stores.js';

export class SubmissionRepository {
  constructor({ db }) {
    this.db = db;
  }

  async init() {
    await this.db.init();
  }

  async createSubmission(params) {
    const { userId, problemId, code } = params;
    const id = `${userId}-${problemId}-${Date.now()}`;

    const submission = new SubmissionData({
      id,
      userId,
      problemId,
      code
    });

    await this.db.put(Stores.SUBMISSIONS, submission);
    return submission;
  }

  async getSubmission(submissionId) {
    const submission = await this.db.get(Stores.SUBMISSIONS, submissionId);
    if (!submission) throw new Error(`제출을 찾을 수 없음: ${submissionId}`);
    return submission;
  }

  async updateSubmission(submissionId, updates) {
    const submission = await this.db.get(Stores.SUBMISSIONS, submissionId);
    if (!submission) throw new Error(`제출을 찾을 수 없음: ${submissionId}`);

    const updatedSubmission = new SubmissionData({
      ...submission,
      ...updates
    });

    await this.db.put(Stores.SUBMISSIONS, updatedSubmission);
    return updatedSubmission;
  }

  async deleteSubmission(submissionId) {
    await this.db.delete(Stores.SUBMISSIONS, submissionId);
  }

  async getSubmissionsByProblem(problemId) {
    const allSubmissions = await this.db.getAll(Stores.SUBMISSIONS);
    return allSubmissions.filter(submission => submission.problemId === problemId);
  }

  async getSubmissionsByUser(userId) {
    const allSubmissions = await this.db.getAll(Stores.SUBMISSIONS);
    return allSubmissions.filter(submission => submission.userId === userId);
  }
}