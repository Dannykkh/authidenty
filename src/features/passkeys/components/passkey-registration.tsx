"use client";

import {
  browserSupportsWebAuthn,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { RecoveryAgent } from "@/features/recovery/components/recovery-agent";

type Phase =
  | "checking"
  | "ready"
  | "requesting"
  | "verifying"
  | "success"
  | "unsupported"
  | "error";

type ApiErrorBody = {
  code?: string;
  message?: string;
};

class ApiResponseError extends Error {}

function subscribeToWebAuthnCapability() {
  return () => undefined;
}

function getWebAuthnCapability() {
  return browserSupportsWebAuthn();
}

function getServerWebAuthnCapability() {
  return undefined;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiErrorBody;

  if (!response.ok) {
    throw new ApiResponseError(body.message ?? "The request could not be completed.");
  }

  return body;
}

function explainRegistrationError(error: unknown) {
  if (error instanceof ApiResponseError) {
    return error.message;
  }

  if (error instanceof WebAuthnError) {
    if (error.name === "InvalidStateError") {
      return "This passkey is already registered on the account.";
    }

    if (error.name === "NotAllowedError") {
      return "The device prompt was closed or timed out. You can try again.";
    }
  }

  return "Passkey setup stopped before it finished. Try again from this device.";
}

export function PasskeyRegistration() {
  const [showRecovery, setShowRecovery] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [errorMessage, setErrorMessage] = useState("");
  const [registeredUsername, setRegisteredUsername] = useState("");
  const webauthnCapability = useSyncExternalStore<boolean | undefined>(
    subscribeToWebAuthnCapability,
    getWebAuthnCapability,
    getServerWebAuthnCapability,
  );
  const displayPhase =
    webauthnCapability === undefined
      ? "checking"
      : webauthnCapability
        ? phase
        : "unsupported";

  const isBusy = phase === "requesting" || phase === "verifying";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setPhase("requesting");

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const displayName = String(formData.get("displayName") ?? "");

    try {
      const optionsResponse = await fetch("/api/passkeys/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName }),
      });
      const options = await readJson<PublicKeyCredentialCreationOptionsJSON>(optionsResponse);
      const registration = await startRegistration({ optionsJSON: options });

      setPhase("verifying");
      const verificationResponse = await fetch("/api/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registration),
      });
      const verification = await readJson<{ verified: true; username: string }>(
        verificationResponse,
      );

      setRegisteredUsername(verification.username);
      setPhase("success");
    } catch (error) {
      setErrorMessage(explainRegistrationError(error));
      setPhase("error");
    }
  }

  if (showRecovery) {
    return <RecoveryAgent onBack={() => setShowRecovery(false)} />;
  }

  if (phase === "success") {
    return (
      <aside className="registration-panel reveal reveal-late relative self-end border-l border-ink/20 pl-6 sm:pl-8 lg:mb-2">
        <div className="absolute top-0 -left-px h-20 w-px bg-signal" aria-hidden="true" />
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-signal">
          Passkey registered
        </p>
        <div className="mt-8 border-y border-ink/15 py-8">
          <span className="brand-mark mb-6" aria-hidden="true">
            <span />
          </span>
          <h2 className="text-2xl font-semibold">This device is ready.</h2>
          <p className="mt-3 break-all text-sm leading-6 text-ink/60">{registeredUsername}</p>
        </div>
        <p className="mt-7 font-mono text-[0.64rem] leading-5 uppercase tracking-[0.13em] text-ink/45">
          Stored: public key, credential ID, device metadata. No document or biometric image.
        </p>
      </aside>
    );
  }

  return (
    <aside className="registration-panel reveal reveal-late relative self-end border-l border-ink/20 pl-6 sm:pl-8 lg:mb-2">
      <div className="absolute top-0 -left-px h-20 w-px bg-signal" aria-hidden="true" />
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/50">
        Try the passkey ceremony
      </p>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Create your first passkey</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">
        Your device keeps the private key. Authidenty stores the public half needed to recognize it.
      </p>

      <form className="passkey-form mt-8" onSubmit={handleSubmit}>
        <div className="registration-fields">
          <label className="grid gap-2 text-sm font-medium" htmlFor="displayName">
            Display name
            <input
              className="border border-ink/25 bg-paper/80 px-3 py-3 text-base outline-none transition-colors focus:border-signal disabled:cursor-not-allowed disabled:opacity-55"
              id="displayName"
              name="displayName"
              autoComplete="name"
              maxLength={80}
              placeholder="Casey"
              required
              disabled={isBusy || displayPhase === "unsupported" || displayPhase === "checking"}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium" htmlFor="username">
            Email
            <input
              className="border border-ink/25 bg-paper/80 px-3 py-3 text-base outline-none transition-colors focus:border-signal disabled:cursor-not-allowed disabled:opacity-55"
              id="username"
              name="username"
              type="email"
              autoComplete="username webauthn"
              maxLength={254}
              placeholder="casey@example.com"
              required
              disabled={isBusy || displayPhase === "unsupported" || displayPhase === "checking"}
            />
          </label>
        </div>

        <button
          className="mt-5 inline-flex min-h-12 w-full items-center justify-between border border-ink bg-ink px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-paper transition-transform active:translate-y-px disabled:cursor-wait disabled:opacity-55"
          type="submit"
          disabled={isBusy || displayPhase === "unsupported" || displayPhase === "checking"}
        >
          <span>
            {displayPhase === "checking" && "Checking this browser"}
            {(displayPhase === "ready" || displayPhase === "error") && "Create passkey"}
            {displayPhase === "requesting" && "Waiting for your device"}
            {displayPhase === "verifying" && "Verifying public key"}
            {displayPhase === "unsupported" && "WebAuthn unavailable"}
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current">
            <circle cx="7" cy="10" r="3.25" strokeWidth="1.5" />
            <path d="M10.25 10H18m-2.5 0v2.5M13 10v2" strokeWidth="1.5" />
          </svg>
        </button>
      </form>

      <div className="mt-5 min-h-12 border-t border-ink/15 pt-4" aria-live="polite">
        {displayPhase === "unsupported" && (
          <p className="text-sm leading-6 text-ink/65">
            This browser cannot create a passkey. Open Authidenty in a current browser on a device
            with a screen lock.
          </p>
        )}
        {displayPhase === "error" && (
          <p className="text-sm leading-6 text-signal" role="alert">
            {errorMessage}
          </p>
        )}
        {(displayPhase === "ready" || isBusy || displayPhase === "checking") && (
          <p className="font-mono text-[0.64rem] leading-5 uppercase tracking-[0.13em] text-ink/45">
            {isBusy ? "Keep this page open while the device responds." : "No password. No ID upload."}
          </p>
        )}
      </div>

      <button
        className="mt-2 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-ink/55 underline decoration-ink/25 underline-offset-4 transition-colors hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
        type="button"
        onClick={() => setShowRecovery(true)}
      >
        Lost a device or cannot sign in?
      </button>
    </aside>
  );
}
