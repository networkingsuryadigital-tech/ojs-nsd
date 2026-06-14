export class BillingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingDomainError";
  }
}

export class BillingAuthorizationError extends BillingDomainError {
  constructor(message = "Not authorized for this billing action.") {
    super(message);
    this.name = "BillingAuthorizationError";
  }
}

export class BillingValidationError extends BillingDomainError {
  constructor(message: string) {
    super(message);
    this.name = "BillingValidationError";
  }
}
