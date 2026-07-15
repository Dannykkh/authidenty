"use client";

import { useState, type FormEvent } from "react";

type FailureCode =
  | "DEVICE_LOST"
  | "PASSKEY_NOT_FOUND"
  | "PROMPT_CANCELLED"
  | "USER_VERIFICATION_FAILED"
  | "RECOVERY_FACTOR_UNAVAILABLE";

type RecoveryAction =
  | "retry_passkey"
  | "use_another_device"
  | "use_recovery_factor"
  | "contact_support";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type RecoveryResponse = {
  diagnosis: string;
  guidance: string;
  actions: RecoveryAction[];
  model: "gpt-5.6";
  boundary: string;
};

type ApiErrorBody = {
  message?: string;
};

type RecoveryAgentProps = {
  onBack: () => void;
};

const failureOptions: Array<{
  code: FailureCode;
  label: string;
}> = [
  { code: "DEVICE_LOST", label: "Device lost" },
  { code: "PASSKEY_NOT_FOUND", label: "Passkey missing" },
  { code: "PROMPT_CANCELLED", label: "Prompt closed" },
  { code: "USER_VERIFICATION_FAILED", label: "Device check failed" },
  { code: "RECOVERY_FACTOR_UNAVAILABLE", label: "No recovery factor" },
];

const actionLabels: Record<RecoveryAction, string> = {
  retry_passkey: "Retry the passkey prompt",
  use_another_device: "Check another trusted device",
  use_recovery_factor: "Use an independent recovery factor",
  contact_support: "Continue with policy-based support",
};

function isRecoveryResponse(value: unknown): value is RecoveryResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<RecoveryResponse>;
  return (
    typeof response.diagnosis === "string" &&
    typeof response.guidance === "string" &&
    Array.isArray(response.actions) &&
    response.actions.every(
      (action) => typeof action === "string" && action in actionLabels,
    )
  );
}

async function readRecoveryResponse(response: Response) {
  const body = (await response.json()) as unknown;

  if (!response.ok) {
    const error = body as ApiErrorBody;
    throw new Error(error.message ?? "Recovery guidance could not be loaded.");
  }

  if (!isRecoveryResponse(body)) {
    throw new Error("Recovery guidance returned an unexpected response.");
  }

  return body;
}

export function RecoveryAgent({ onBack }: RecoveryAgentProps) {
  const [failureCode, setFailureCode] = useState<FailureCode>("DEVICE_LOST");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [boundary, setBoundary] = useState(
    "Guidance only. Security policy still controls re-enrollment.",
  );
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get("message") ?? "").trim();

    if (!message || isSending) {
      return;
    }

    const userMessage: ConversationMessage = { role: "user", content: message };
    setMessages((current) => [...current, userMessage]);
    setActions([]);
    setErrorMessage("");
    setIsSending(true);
    form.reset();

    try {
      const response = await fetch("/api/recovery/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          failureCode,
          message,
          history: messages.slice(-6).map((item) => ({
            ...item,
            content: item.content.slice(0, 500),
          })),
        }),
      });
      const result = await readRecoveryResponse(response);
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: `${result.diagnosis}\n\n${result.guidance}`,
      };

      setMessages((current) => [...current, assistantMessage]);
      setActions(result.actions);
      setBoundary(result.boundary);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recovery guidance could not be loaded.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function changeFailure(code: FailureCode) {
    setFailureCode(code);
    setMessages([]);
    setActions([]);
    setErrorMessage("");
  }

  return (
    <aside className="registration-panel reveal relative self-end border-l border-ink/20 pl-6 sm:pl-8 lg:mb-2">
      <div className="absolute top-0 -left-px h-20 w-px bg-signal" aria-hidden="true" />
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-signal">
          GPT-5.6 recovery guide
        </p>
        <button
          className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink/50 underline decoration-ink/25 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
          type="button"
          onClick={onBack}
        >
          Back to passkey
        </button>
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Find a safe way back in</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">
        Describe the failure, not your secrets. The agent explains options but cannot approve access.
      </p>

      <fieldset className="mt-6">
        <legend className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink/45">
          What happened?
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {failureOptions.map((option) => {
            const isSelected = option.code === failureCode;

            return (
              <button
                key={option.code}
                className={`border px-2.5 py-2 text-left font-mono text-[0.6rem] uppercase tracking-[0.11em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                  isSelected
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-paper/70 text-ink/55 hover:border-ink/50 hover:text-ink"
                }`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => changeFailure(option.code)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div
        className="mt-6 max-h-64 space-y-4 overflow-y-auto border-y border-ink/15 py-5"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
            <p className="text-sm leading-6 text-ink/65">
              I will identify the likely failure and suggest only policy-approved next steps. I will
              not ask for an ID image, password, PIN, or recovery code.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <article
            className={
              message.role === "assistant"
                ? "border-l-2 border-signal pl-3"
                : "ml-7 border-l border-ink/20 pl-3"
            }
            key={`${message.role}-${index}`}
          >
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.13em] text-ink/40">
              {message.role === "assistant" ? "Recovery guide" : "You"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-ink/75">{message.content}</p>
          </article>
        ))}

        {isSending && (
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-signal">
            Diagnosing the failure
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.13em] text-ink/40">
            Approved next steps
          </p>
          <ol className="mt-2 space-y-1.5 text-sm text-ink/70">
            {actions.map((action, index) => (
              <li className="flex gap-2" key={action}>
                <span className="font-mono text-signal">0{index + 1}</span>
                <span>{actionLabels[action]}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <form className="mt-5" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="recovery-message">
          Describe the sign-in problem
        </label>
        <textarea
          className="min-h-24 w-full resize-y border border-ink/25 bg-paper/80 px-3 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-ink/35 focus:border-signal disabled:cursor-wait disabled:opacity-55"
          id="recovery-message"
          name="message"
          maxLength={500}
          placeholder="My old phone is gone, but I still have my laptop."
          required
          disabled={isSending}
        />
        <button
          className="mt-2 inline-flex min-h-11 w-full items-center justify-between border border-ink bg-ink px-4 py-3 font-mono text-[0.66rem] uppercase tracking-[0.15em] text-paper transition-transform active:translate-y-px disabled:cursor-wait disabled:opacity-55"
          type="submit"
          disabled={isSending}
        >
          <span>{isSending ? "GPT-5.6 is reasoning" : "Explain my options"}</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
            <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" />
          </svg>
        </button>
      </form>

      <div className="mt-4 min-h-10 border-t border-ink/15 pt-3" aria-live="polite">
        {errorMessage ? (
          <p className="text-sm leading-6 text-signal" role="alert">
            {errorMessage}
          </p>
        ) : (
          <p className="font-mono text-[0.58rem] leading-5 uppercase tracking-[0.11em] text-ink/40">
            {boundary}
          </p>
        )}
      </div>
    </aside>
  );
}
