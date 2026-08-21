import type { ReviewApplicationError, ReviewApplicationErrorCode } from "./types";

export function reviewApplicationError(
  code: ReviewApplicationErrorCode
): ReviewApplicationError {
  return { code };
}
