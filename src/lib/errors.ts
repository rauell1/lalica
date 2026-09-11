/**
 * Application error type used across the service layer and route handlers.
 * Map each kind to an HTTP status so clients get consistent responses.
 */

export type AppErrorKind =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "service_unavailable"
  | "validation";

const STATUS_BY_KIND: Record<AppErrorKind, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  service_unavailable: 503,
  validation: 422,
};

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(
    kind: AppErrorKind,
    message: string,
    options?: {
      fieldErrors?: Record<string, string[]>;
      retryAfterSeconds?: number;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
    this.fieldErrors = options?.fieldErrors;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function statusForError(error: AppError): number {
  return STATUS_BY_KIND[error.kind];
}

/** True when the error message is safe to show to an end user. */
export function isUserFacingError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Convert an unknown thrown value into a safe message for logs. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
