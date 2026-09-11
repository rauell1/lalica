import { describe, expect, it } from "vitest";

import { verifyTicket } from "@/lib/media/service";
import { getServerEnv } from "@/lib/env";
import { createHmac } from "node:crypto";

function sign(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

const secret = getServerEnv().authSecret;

describe("media upload ticket verification", () => {
  it("accepts a correctly signed, unexpired ticket", () => {
    const ticket = sign(
      {
        purpose: "media-upload",
        userId: "u1",
        mimeType: "image/png",
        exp: Date.now() + 60_000,
      },
      secret,
    );
    expect(verifyTicket(ticket)).toMatchObject({ purpose: "media-upload" });
  });

  it("rejects a tampered signature", () => {
    const ticket = sign(
      {
        purpose: "media-upload",
        userId: "u1",
        mimeType: "image/png",
        exp: Date.now() + 60_000,
      },
      secret,
    );
    const [body] = ticket.split(".");
    const forged = `${body}.${"a".repeat(43)}`;
    expect(verifyTicket(forged)).toBeNull();
  });

  it("rejects a ticket signed with the wrong secret", () => {
    const ticket = sign(
      {
        purpose: "media-upload",
        userId: "u1",
        mimeType: "image/png",
        exp: Date.now() + 60_000,
      },
      "attacker-secret",
    );
    expect(verifyTicket(ticket)).toBeNull();
  });

  it("rejects an expired ticket", () => {
    const ticket = sign(
      {
        purpose: "media-upload",
        userId: "u1",
        mimeType: "image/png",
        exp: Date.now() - 1000,
      },
      secret,
    );
    expect(verifyTicket(ticket)).toBeNull();
  });

  it("rejects a ticket with the wrong purpose", () => {
    const ticket = sign(
      { purpose: "other", userId: "u1", exp: Date.now() + 60_000 },
      secret,
    );
    expect(verifyTicket(ticket)).toBeNull();
  });

  it("rejects malformed tickets", () => {
    expect(verifyTicket("not-a-ticket")).toBeNull();
    expect(verifyTicket("")).toBeNull();
    expect(verifyTicket("a.b.c")).toBeNull();
  });
});
