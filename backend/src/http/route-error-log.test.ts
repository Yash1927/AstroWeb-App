import { afterEach, describe, expect, it, vi } from "vitest";
import { logRouteError, sanitizedErrorDetails } from "./route-error-log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route error logging", () => {
  it("keeps the error class and useful message while redacting personal and secret values", () => {
    class DatabaseFailure extends Error {}
    const details = sanitizedErrorDetails(new DatabaseFailure(
      "Failed for person@example.com, +91 98765 43210, birthDate=1990-01-02, token=secret-value at postgresql://owner:password@example.test/db",
    ));

    expect(details.errorClass).toBe("DatabaseFailure");
    expect(details.message).toContain("Failed for")
    expect(details.message).not.toContain("person@example.com");
    expect(details.message).not.toContain("98765");
    expect(details.message).not.toContain("1990-01-02");
    expect(details.message).not.toContain("secret-value");
    expect(details.message).not.toContain("owner:password");
  });

  it("logs only a fixed context and sanitized error details", () => {
    const error = new TypeError("Database connection failed.");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logRouteError("blogs.delete-post", error);

    expect(consoleError).toHaveBeenCalledWith("Route service error", {
      context: "blogs.delete-post",
      errorClass: "TypeError",
      message: "Database connection failed.",
    });
  });
});
