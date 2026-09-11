"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { PRIVACY_POLICY_VERSION } from "@/lib/enquiry/constants";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_ENQUIRY_TURNSTILE_SITE_KEY;

interface FieldState {
  value: string;
  error?: string;
}

export function EnquiryForm({
  serviceOptions,
  preselectedService,
}: {
  serviceOptions: string[];
  preselectedService?: string;
}) {
  const initialService =
    preselectedService && serviceOptions.includes(preselectedService)
      ? preselectedService
      : "";

  const [name, setName] = useState<FieldState>({ value: "" });
  const [organisation, setOrganisation] = useState<FieldState>({ value: "" });
  const [email, setEmail] = useState<FieldState>({ value: "" });
  const [telephone, setTelephone] = useState<FieldState>({ value: "" });
  const [serviceInterest, setServiceInterest] = useState<FieldState>({
    value: initialService,
  });
  const [message, setMessage] = useState<FieldState>({ value: "" });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [reference, setReference] = useState<string | undefined>();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !turnstileRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
      });
    };

    if (window.turnstile) {
      render();
    } else {
      window.addEventListener("turnstile-ready", render);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("turnstile-ready", render);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  function applyErrors(fieldErrors?: Record<string, string[]>) {
    if (!fieldErrors) return;
    const first = (key: string) => fieldErrors[key]?.[0];
    setName((current) => ({ ...current, error: first("name") }));
    setOrganisation((current) => ({ ...current, error: first("organisation") }));
    setEmail((current) => ({ ...current, error: first("email") }));
    setTelephone((current) => ({ ...current, error: first("telephone") }));
    setMessage((current) => ({ ...current, error: first("message") }));
    const serviceError = first("serviceInterest");
    setServiceInterest((current) => ({ ...current, error: serviceError }));
    setPrivacyError(first("privacyAccepted"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setFormError(undefined);
    setPrivacyError(undefined);

    let turnstileToken = "";
    if (TURNSTILE_SITE_KEY && window.turnstile) {
      turnstileToken =
        (window.turnstile as unknown as {
          getResponse?: (widgetId: string) => string;
        }).getResponse?.(widgetIdRef.current ?? "") ?? "";
    }

    const payload = {
      name: name.value,
      organisation: organisation.value,
      email: email.value,
      telephone: telephone.value,
      serviceInterest: serviceInterest.value || "General enquiry",
      message: message.value,
      privacyAccepted,
      privacyVersion: PRIVACY_POLICY_VERSION,
      idempotencyKey,
      companyWebsite: "",
      turnstileToken,
    };

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        ref?: string;
        error?: string;
        fieldErrors?: Record<string, string[]>;
      } | null;

      if (!response.ok || !result?.ok) {
        if (result?.fieldErrors) applyErrors(result.fieldErrors);
        setFormError(
          result?.error ??
            "Your enquiry could not be sent. Please try again, or call us directly.",
        );
        setStatus("idle");
        return;
      }

      setReference(result.ref);
      setStatus("done");
    } catch {
      setFormError(
        "Your enquiry could not be sent. Please check your connection and try again, or call us directly.",
      );
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-300 bg-green-50 p-8 text-center animate-fade-in"
      >
        <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-green-900">
          Thank you, your enquiry was sent.
        </p>
        <p className="mt-2 leading-7 text-green-800">
          Your reference is{" "}
          <span className="font-bold">{reference}</span>. We normally respond
          within one or two working days.
        </p>
        <p className="mt-4 text-sm text-green-800">
          Need help sooner? Call us on the number shown on this page.
        </p>
      </div>
    );
  }

  const inputClasses = (error?: string) =>
    `mt-1 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 ${
      error ? "border-red-400" : "border-ink-200"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => {
            window.dispatchEvent(new Event("turnstile-ready"));
          }}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="enquiry-name" className="text-sm font-bold text-ink-800">
            Full name <span className="text-red-700">*</span>
          </label>
          <input
            id="enquiry-name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            value={name.value}
            onChange={(event) => setName({ value: event.target.value })}
            className={inputClasses(name.error)}
            aria-invalid={Boolean(name.error)}
          />
          {name.error && (
            <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
              {name.error}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="enquiry-organisation" className="text-sm font-bold text-ink-800">
            Organisation (optional)
          </label>
          <input
            id="enquiry-organisation"
            name="organisation"
            autoComplete="organization"
            maxLength={160}
            value={organisation.value}
            onChange={(event) => setOrganisation({ value: event.target.value })}
            className={inputClasses(organisation.error)}
            aria-invalid={Boolean(organisation.error)}
          />
          {organisation.error && (
            <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
              {organisation.error}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="enquiry-email" className="text-sm font-bold text-ink-800">
            Email <span className="text-red-700">*</span>
          </label>
          <input
            id="enquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
            value={email.value}
            onChange={(event) => setEmail({ value: event.target.value })}
            className={inputClasses(email.error)}
            aria-invalid={Boolean(email.error)}
          />
          {email.error && (
            <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
              {email.error}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="enquiry-telephone" className="text-sm font-bold text-ink-800">
            Telephone (optional)
          </label>
          <input
            id="enquiry-telephone"
            name="telephone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={telephone.value}
            onChange={(event) => setTelephone({ value: event.target.value })}
            className={inputClasses(telephone.error)}
            aria-invalid={Boolean(telephone.error)}
          />
          {telephone.error && (
            <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
              {telephone.error}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="enquiry-service" className="text-sm font-bold text-ink-800">
            Service interest <span className="text-red-700">*</span>
          </label>
          <select
            id="enquiry-service"
            name="serviceInterest"
            required
            value={serviceInterest.value}
            onChange={(event) =>
              setServiceInterest({ value: event.target.value })
            }
            className={inputClasses(serviceInterest.error)}
            aria-invalid={Boolean(serviceInterest.error)}
          >
            <option value="">Choose a service...</option>
            <option value="General enquiry">General enquiry</option>
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {serviceInterest.error && (
            <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
              {serviceInterest.error}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="enquiry-message" className="text-sm font-bold text-ink-800">
            Message <span className="text-red-700">*</span>
          </label>
          <textarea
            id="enquiry-message"
            name="message"
            required
            rows={5}
            maxLength={3000}
            value={message.value}
            onChange={(event) => setMessage({ value: event.target.value })}
            className={inputClasses(message.error)}
            aria-invalid={Boolean(message.error)}
            placeholder="Tell us about your facility, equipment, or project, and what you need done."
          />
          {message.error && (
            <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
              {message.error}
            </p>
          )}
        </div>
      </div>

      {/* Honeypot: hidden from real users; bots that fill it are rejected. */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label htmlFor="enquiry-website">Website</label>
        <input
          id="enquiry-website"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-5 flex items-start gap-3">
        <input
          id="enquiry-privacy"
          type="checkbox"
          checked={privacyAccepted}
          onChange={(event) => {
            setPrivacyAccepted(event.target.checked);
            setPrivacyError(undefined);
          }}
          className="mt-1 accent-brand-700"
          aria-invalid={Boolean(privacyError)}
        />
        <label htmlFor="enquiry-privacy" className="text-sm leading-6 text-ink-700">
          I accept the{" "}
          <a href="/privacy" target="_blank" className="font-bold text-brand-700 underline hover:text-brand-600">
            privacy policy
          </a>{" "}
          and agree to be contacted about this enquiry.{" "}
          <span className="text-red-700">*</span>
        </label>
      </div>
      {privacyError && (
        <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
          {privacyError}
        </p>
      )}

      {TURNSTILE_SITE_KEY && (
        <div ref={turnstileRef} className="mt-5" aria-label="Spam protection check" />
      )}

      {formError && (
        <p
          role="alert"
          className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded-md bg-brand-700 px-6 py-3.5 text-sm font-bold text-white transition-soft hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Sending..." : "Send enquiry"}
      </button>
    </form>
  );
}
