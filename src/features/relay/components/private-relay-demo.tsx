"use client";

import { useState, type FormEvent } from "react";
import {
  createPrivateApproval,
  setupDemoRelay,
  verifyPrivateApproval,
  type DemoRelaySetup,
  type PrivateApproval,
  type VerificationReceipt,
} from "../api/relay-api";

type Phase = "setup" | "request" | "challenge" | "receipt";
type BusyOperation = "setup" | "request" | "verify" | null;

const flowSteps: Array<{
  phase: Phase;
  index: string;
  label: string;
  detail: string;
}> = [
  {
    phase: "setup",
    index: "01",
    label: "Private route",
    detail: "Bind an opaque handle to an encrypted destination.",
  },
  {
    phase: "request",
    index: "02",
    label: "Classify action",
    detail: "GPT reads the action, never the person behind it.",
  },
  {
    phase: "challenge",
    index: "03",
    label: "Prove device control",
    detail: "A one-time code reaches the enrolled route.",
  },
  {
    phase: "receipt",
    index: "04",
    label: "Return less",
    detail: "The service receives a short-lived, minimal receipt.",
  },
];

const phaseRank: Record<Phase, number> = {
  setup: 0,
  request: 1,
  challenge: 2,
  receipt: 3,
};

function updateWithViewTransition(update: () => void) {
  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };

  if (transitionDocument.startViewTransition) {
    transitionDocument.startViewTransition(update);
    return;
  }

  update();
}

function shortIdentifier(identifier: string) {
  const [prefix] = identifier.split("_");
  return `${prefix}_...${identifier.slice(-6)}`;
}

function displayTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request stopped before it completed.";
}

export function PrivateRelayDemo() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [busyOperation, setBusyOperation] = useState<BusyOperation>(null);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<DemoRelaySetup | null>(null);
  const [approval, setApproval] = useState<PrivateApproval | null>(null);
  const [receipt, setReceipt] = useState<VerificationReceipt | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusyOperation("setup");

    const formData = new FormData(event.currentTarget);

    try {
      const result = await setupDemoRelay({
        displayName: String(formData.get("displayName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      });
      setSetup(result);
      updateWithViewTransition(() => setPhase("request"));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setBusyOperation(null);
    }
  }

  async function handleApprovalRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!setup) {
      return;
    }

    setError("");
    setBusyOperation("request");
    const formData = new FormData(event.currentTarget);

    try {
      const result = await createPrivateApproval({
        relayHandle: setup.relayHandle,
        serviceName: String(formData.get("serviceName") ?? ""),
        actionDescription: String(formData.get("actionDescription") ?? ""),
        declaredRisk: String(formData.get("declaredRisk") ?? "high") as
          | "low"
          | "medium"
          | "high",
      });
      setApproval(result);
      setVerificationCode(result.demoCode ?? "");
      updateWithViewTransition(() => setPhase("challenge"));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setBusyOperation(null);
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!approval) {
      return;
    }

    setError("");
    setBusyOperation("verify");

    try {
      const result = await verifyPrivateApproval(
        approval.requestId,
        verificationCode,
      );
      setReceipt(result);
      updateWithViewTransition(() => setPhase("receipt"));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setBusyOperation(null);
    }
  }

  function resetDemo() {
    setSetup(null);
    setApproval(null);
    setReceipt(null);
    setVerificationCode("");
    setError("");
    updateWithViewTransition(() => setPhase("setup"));
  }

  return (
    <section className="relay-lab" id="relay-demo" aria-labelledby="relay-demo-title">
      <div className="relay-lab-heading">
        <p className="eyebrow">Working prototype / simulated delivery</p>
        <h2 id="relay-demo-title">Trace one private approval.</h2>
        <p>
          This demo uses a reserved test number. It shows the boundary and the
          cryptographic flow; it does not send a real SMS or verify ownership at enrollment.
        </p>
      </div>

      <div className="relay-ceremony">
        <nav className="flow-rail" aria-label="Private approval progress">
          <p className="flow-rail-title">Approval trace</p>
          <ol>
            {flowSteps.map((step) => {
              const state =
                phaseRank[step.phase] < phaseRank[phase]
                  ? "complete"
                  : step.phase === phase
                    ? "active"
                    : "pending";

              return (
                <li data-state={state} key={step.phase} aria-current={state === "active" ? "step" : undefined}>
                  <span className="flow-index">{step.index}</span>
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="decision-rule">
            <span>Decision rule</span>
            <strong>GPT explains. The server verifies.</strong>
          </div>
        </nav>

        <article className="relay-stage" data-phase={phase}>
          <header className="relay-stage-header">
            <div>
              <p className="eyebrow">Current ceremony</p>
              <p className="stage-title">{flowSteps[phaseRank[phase]].label}</p>
            </div>
            <span className={`stage-state ${phase === "receipt" ? "is-verified" : ""}`}>
              {phase === "receipt" ? "Server verified" : "Not yet verified"}
            </span>
          </header>

          {phase === "setup" && (
            <form className="relay-form" onSubmit={handleSetup}>
              <fieldset disabled={busyOperation !== null}>
                <legend>Enroll a private route</legend>
                <p className="form-intro">
                  The phone number crosses into the encrypted vault once. Relying services
                  receive only the new relay handle.
                </p>

                <div className="form-grid">
                  <label>
                    Demo label
                    <input
                      name="displayName"
                      defaultValue="Build Week tester"
                      maxLength={40}
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label>
                    Reserved test number
                    <input
                      name="phone"
                      type="tel"
                      defaultValue="+12025550184"
                      pattern="\+[1-9][0-9]{7,14}"
                      autoComplete="off"
                      required
                    />
                  </label>
                </div>

                <p className="data-note">
                  Demo input only: +1 202-555-0184 belongs to the reserved fictional 555-01xx range.
                </p>

                <button className="primary-action" type="submit">
                  <span>{busyOperation === "setup" ? "Encrypting route" : "Create private route"}</span>
                  <span aria-hidden="true">01 / 04</span>
                </button>
              </fieldset>
            </form>
          )}

          {phase === "request" && setup && (
            <form className="relay-form" onSubmit={handleApprovalRequest}>
              <fieldset disabled={busyOperation !== null}>
                <legend>Describe the action, not the person</legend>
                <div className="route-receipt">
                  <span>Opaque route</span>
                  <code>{shortIdentifier(setup.relayHandle)}</code>
                  <span>Vault destination</span>
                  <code>{setup.destination}</code>
                </div>

                <div className="form-grid request-grid">
                  <label>
                    Requesting service
                    <input
                      name="serviceName"
                      defaultValue="OpenClaw"
                      maxLength={80}
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label>
                    Service-declared risk
                    <select name="declaredRisk" defaultValue="high">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="wide-field">
                    Action awaiting human approval
                    <textarea
                      name="actionDescription"
                      defaultValue="Approve a transfer of 120 USD to the saved supplier."
                      maxLength={500}
                      rows={4}
                      required
                    />
                  </label>
                </div>

                <p className="data-note">
                  Email addresses, phone numbers, and birth dates are rejected before GPT is called.
                </p>

                <button className="primary-action" type="submit">
                  <span>{busyOperation === "request" ? "Classifying action" : "Request private approval"}</span>
                  <span aria-hidden="true">02 / 04</span>
                </button>
              </fieldset>
            </form>
          )}

          {phase === "challenge" && approval && (
            <form className="relay-form" onSubmit={handleVerification}>
              <fieldset disabled={busyOperation !== null}>
                <legend>Confirm on the enrolled route</legend>

                <div className="classification-block">
                  <div>
                    <span>Model output</span>
                    <strong>{approval.summary}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Classifier</dt>
                      <dd>
                        {approval.classificationSource === "gpt-5.6"
                          ? "GPT-5.6"
                          : "Conservative fallback"}
                      </dd>
                    </div>
                    <div>
                      <dt>Final risk</dt>
                      <dd>{approval.finalRisk}</dd>
                    </div>
                    <div>
                      <dt>Routed to</dt>
                      <dd>{approval.destination}</dd>
                    </div>
                  </dl>
                </div>

                {approval.demoCode && (
                  <div className="demo-transport">
                    <span>Simulated device message</span>
                    <strong>{approval.demoCode}</strong>
                    <small>No SMS provider was contacted.</small>
                  </div>
                )}

                <label className="code-field">
                  Six-digit device code
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                  />
                </label>

                <button className="primary-action" type="submit">
                  <span>{busyOperation === "verify" ? "Verifying digest" : "Verify device control"}</span>
                  <span aria-hidden="true">03 / 04</span>
                </button>
              </fieldset>
            </form>
          )}

          {phase === "receipt" && receipt && (
            <div className="relay-form receipt-view">
              <div className="verified-rule">
                <span>Deterministic result</span>
                <strong>Device control verified.</strong>
                <p>The model did not make this decision.</p>
              </div>

              <dl className="receipt-grid">
                <div>
                  <dt>Receipt</dt>
                  <dd>{shortIdentifier(receipt.receiptId)}</dd>
                </div>
                <div>
                  <dt>Pseudonymous subject</dt>
                  <dd>{shortIdentifier(receipt.subject)}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{receipt.purpose.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{receipt.risk}</dd>
                </div>
                <div>
                  <dt>Factor</dt>
                  <dd>Simulated SMS OTP</dd>
                </div>
                <div>
                  <dt>Valid until</dt>
                  <dd>{displayTimestamp(receipt.expiresAt)}</dd>
                </div>
              </dl>

              <button className="secondary-action" type="button" onClick={resetDemo}>
                Run another approval
              </button>
            </div>
          )}

          <div className="relay-status" aria-live="polite">
            {error ? (
              <p role="alert">{error}</p>
            ) : (
              <p>
                {busyOperation
                  ? "Keep this page open while the local prototype responds."
                  : "Raw identity data is never returned by these relay APIs."}
              </p>
            )}
          </div>
        </article>
      </div>

      <div className="boundary-map" aria-label="Information boundaries">
        <div className="boundary-map-title">
          <p className="eyebrow">Information boundary</p>
          <h3>Each actor gets only what it needs.</h3>
        </div>
        <dl>
          <div>
            <dt>Service</dt>
            <dd>Opaque handle, action result, minimal receipt</dd>
          </div>
          <div>
            <dt>GPT-5.6</dt>
            <dd>Service name and action text only</dd>
          </div>
          <div>
            <dt>Encrypted vault</dt>
            <dd>Handle-to-device route, isolated at rest</dd>
          </div>
          <div>
            <dt>Human device</dt>
            <dd>Action summary and one-time challenge</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
