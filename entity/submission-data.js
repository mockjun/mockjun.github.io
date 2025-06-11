export class SubmissionData {
  constructor({ id, userId, problemId, code, submittedAt = new Date().toISOString(), status = 'pending', testResults = [] }) {
    this.id = id;
    this.userId = userId;
    this.problemId = problemId;
    this.code = code;
    this.submittedAt = submittedAt;
    this.status = status;
    this.testResults = testResults;
  }
}