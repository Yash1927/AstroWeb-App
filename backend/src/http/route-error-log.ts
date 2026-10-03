const MAX_MESSAGE_LENGTH = 500;

function safeClassName(error: Error) {
  const name = error.constructor.name || error.name || "Error";
  return /^[A-Za-z][A-Za-z0-9_-]{0,79}$/u.test(name) ? name : "Error";
}

export function sanitizedErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      errorClass: "NonErrorThrown",
      message: "A non-Error value was thrown.",
    };
  }

  const message = (error.message || "No error message.")
    .replace(/[\r\n\t]+/gu, " ")
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/giu, "[redacted URL]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[redacted email]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, "[redacted token]")
    .replace(/\+?\d[\d ()-]{8,}\d/gu, "[redacted phone]")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/gu, "[redacted date]")
    .replace(/\b(password|token|secret|credential|cookie|authorization)\s*[:=]\s*\S+/giu, "$1=[redacted]")
    .replace(/\b(birth(?:date|time|place)?|phone|email)\s*[=:]\s*[^,;)]*/giu, "$1=[redacted]")
    .slice(0, MAX_MESSAGE_LENGTH);

  return {
    errorClass: safeClassName(error),
    message,
  };
}

export function logRouteError(context: string, error: unknown) {
  console.error("Route service error", {
    context,
    ...sanitizedErrorDetails(error),
  });
}
