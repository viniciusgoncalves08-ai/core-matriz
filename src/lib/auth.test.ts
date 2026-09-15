import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { AuthConfigurationError, createSession, validateAuthConfiguration } from "./auth";
import { cookies } from "next/headers";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("rejects absent configuration before writing a session", async () => {
  vi.stubEnv("AUTH_SECRET", "");
  await expect(createSession("test-user")).rejects.toBeInstanceOf(AuthConfigurationError);
  expect(cookies).not.toHaveBeenCalled();
});
it("rejects whitespace-only configuration", () => {
  vi.stubEnv("AUTH_SECRET", "  ");
  expect(validateAuthConfiguration).toThrow(AuthConfigurationError);
});
it("accepts a configured signing secret", () => {
  vi.stubEnv("AUTH_SECRET", "unit-test-only-secret");
  expect(validateAuthConfiguration).not.toThrow();
});
