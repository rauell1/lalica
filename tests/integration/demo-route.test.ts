/**
 * The demo sign-in route must be completely inert outside clearly
 * labelled local demo environments. This test drives the route handler
 * directly with a production NODE_ENV and with demo mode disabled.
 */

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/demo-signin/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/demo-signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "administrator" }),
  });
}

describe("demo sign-in route", () => {
  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(request());
    expect(response.status).toBe(404);
  });

  it("returns 404 when demo mode is disabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_DEMO_MODE_ENABLED", "");
    const response = await POST(request());
    expect(response.status).toBe(404);
  });

  // The positive path (demo sign-in creates a real session with an
  // HttpOnly SameSite=Lax cookie) is verified live against the running
  // dev server; see docs/acceptance-report.md.
});
