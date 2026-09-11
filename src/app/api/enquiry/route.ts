/**
 * Public enquiry submission endpoint.
 *
 * Order of protection: honeypot first (silently dropped), then the
 * distributed IP rate limit, then the server verified bot challenge when
 * configured, then full server side validation, then the per-email limit.
 * The enquiry is stored before a success response is returned, and the
 * idempotency key prevents duplicate submissions on retries.
 */

import type { NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { assertSameOrigin, getClientIp, jsonError } from "@/lib/utils/http";
import { enforceLimit, hashIdentifier } from "@/lib/ratelimit";
import { AppError } from "@/lib/errors";
import { normaliseEmail } from "@/lib/utils/text";
import {
  createEnquiry,
  validateEnquiryPayload,
} from "@/lib/enquiry/service";
import { PRIVACY_POLICY_VERSION } from "@/lib/enquiry/constants";

export const runtime = "nodejs";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string,
): Promise<boolean> {
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    form.set("remoteip", ip);
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = getServerEnv();

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      throw new AppError("bad_request", "Please complete the form and try again.");
    }

    // Honeypot: real users never fill this hidden field. Bots that do are
    // dropped silently with a success response.
    if (
      typeof body.companyWebsite === "string" &&
      body.companyWebsite.length > 0
    ) {
      return Response.json({ ok: true, ref: null });
    }

    await assertSameOrigin();

    const ip = await getClientIp();
    await enforceLimit("enquiryIp", hashIdentifier("enquiryIp", `ip:${ip}`));

    if (env.turnstileSecret) {
      const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
      const valid = await verifyTurnstile(env.turnstileSecret, token, ip);
      if (!valid) {
        throw new AppError(
          "bad_request",
          "The security challenge failed. Refresh the page and try again.",
        );
      }
    }

    if (typeof body.privacyVersion !== "string" || body.privacyVersion !== PRIVACY_POLICY_VERSION) {
      throw new AppError(
        "bad_request",
        "The privacy notice was updated since you opened this page. Reload the page, review the notice, and try again.",
      );
    }

    const payload = await validateEnquiryPayload(body);

    await enforceLimit(
      "enquiryEmail",
      hashIdentifier("enquiryEmail", `email:${normaliseEmail(payload.email)}`),
    );

    const { row } = await createEnquiry({
      payload,
      privacyVersion: PRIVACY_POLICY_VERSION,
    });

    return Response.json({ ok: true, ref: row.publicRef }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
