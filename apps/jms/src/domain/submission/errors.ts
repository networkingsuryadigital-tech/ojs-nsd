export class SubmissionDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmissionDomainError";
  }
}

export class ForbiddenTransitionError extends SubmissionDomainError {
  constructor(reason: string) {
    super(reason);
    this.name = "ForbiddenTransitionError";
  }
}

export class SubmissionAuthorizationError extends SubmissionDomainError {
  constructor(message = "Not authorized for this submission.") {
    super(message);
    this.name = "SubmissionAuthorizationError";
  }
}

export class SimilarityGateBlockedError extends SubmissionDomainError {
  constructor(message: string) {
    super(message);
    this.name = "SimilarityGateBlockedError";
  }
}
