"use client";

import { useState, type FormEvent } from "react";
import {
  enrollConversationProfile,
  matchConversationProfile,
  verifyConversationChallenge,
  type ConversationChallenge,
  type ConversationEnrollment,
  type ConversationVerification,
} from "../api/conversation-api";

type Phase = "enroll" | "return" | "challenge" | "verified";
type BusyOperation = "enroll" | "match" | "verify" | null;

const enrollmentQuestions = [
  "When plans change at the last minute, how do you decide what to do next?",
  "How do you explain a technical problem to someone you trust?",
  "What does a good decision feel like to you?",
];

const returningQuestions = [
  "A friend gives you two imperfect options. How do you choose?",
  "You made a mistake in a shared project. What do you say first?",
  "Someone asks for a long explanation, but you are in a hurry. How do you answer?",
];

const enrollmentAnswers = [
  "honestly, i usually start with the smallest part because it keeps things clear.",
  "i'd check the details first, then explain the reason once the risk feels low.",
  "usually it is a short list, but i keep the final answer direct.",
];

const returningAnswers = [
  "honestly, i'd compare two options first because guessing wastes time.",
  "i usually say the mistake first, then explain the safe next step in one line.",
  "short answer first, details second. that keeps things clear.",
];

const flowSteps: Array<{
  phase: Phase;
  index: string;
  label: string;
  detail: string;
}> = [
  {
    phase: "enroll",
    index: "01",
    label: "Learn the pattern",
    detail: "Derive style metrics from three enrollment answers.",
  },
  {
    phase: "return",
    index: "02",
    label: "Ask different questions",
    detail: "Compare new answers without storing their text.",
  },
  {
    phase: "challenge",
    index: "03",
    label: "Reveal the candidate",
    detail: "Show a name and masked device only after a strong match.",
  },
  {
    phase: "verified",
    index: "04",
    label: "Prove device control",
    detail: "A one-time code makes the final verification decision.",
  },
];

const phaseRank: Record<Phase, number> = {
  enroll: 0,
  return: 1,
  challenge: 2,
  verified: 3,
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

function formAnswers(
  form: HTMLFormElement,
  questionCount: number,
) {
  const formData = new FormData(form);
  return Array.from({ length: questionCount }, (_, index) =>
    String(formData.get(`answer-${index}`) ?? ""),
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request stopped before it completed.";
}

function sourceLabel(
  source: ConversationChallenge["analysisSource"],
) {
  return source === "gpt-5.6"
    ? "GPT-5.6 Sol"
    : "Conservative fallback";
}

export function ConversationIdentityDemo() {
  const [phase, setPhase] = useState<Phase>("enroll");
  const [busyOperation, setBusyOperation] =
    useState<BusyOperation>(null);
  const [error, setError] = useState("");
  const [matchNote, setMatchNote] = useState("");
  const [enrollment, setEnrollment] =
    useState<ConversationEnrollment | null>(null);
  const [challenge, setChallenge] =
    useState<ConversationChallenge | null>(null);
  const [verification, setVerification] =
    useState<ConversationVerification | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  async function handleEnrollment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setMatchNote("");
    setBusyOperation("enroll");
    const formData = new FormData(event.currentTarget);

    try {
      const result = await enrollConversationProfile({
        displayName: String(formData.get("displayName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        answers: formAnswers(
          event.currentTarget,
          enrollmentQuestions.length,
        ),
      });
      setEnrollment(result);
      updateWithViewTransition(() => setPhase("return"));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setBusyOperation(null);
    }
  }

  async function handleMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMatchNote("");
    setBusyOperation("match");

    try {
      const result = await matchConversationProfile({
        answers: formAnswers(
          event.currentTarget,
          returningQuestions.length,
        ),
      });

      if (result.status === "no_match") {
        setMatchNote(result.explanation);
        return;
      }

      setChallenge(result);
      setVerificationCode(result.demoCode ?? "");
      updateWithViewTransition(() => setPhase("challenge"));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setBusyOperation(null);
    }
  }

  async function handleVerification(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!challenge) {
      return;
    }

    setError("");
    setBusyOperation("verify");

    try {
      const result = await verifyConversationChallenge(
        challenge.challengeId,
        verificationCode,
      );
      setVerification(result);
      updateWithViewTransition(() => setPhase("verified"));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setBusyOperation(null);
    }
  }

  function resetDemo() {
    setEnrollment(null);
    setChallenge(null);
    setVerification(null);
    setVerificationCode("");
    setError("");
    setMatchNote("");
    updateWithViewTransition(() => setPhase("enroll"));
  }

  const currentStep = flowSteps[phaseRank[phase]];

  return (
    <section
      className="relay-lab conversation-lab"
      id="conversation-demo"
      aria-labelledby="conversation-demo-title"
    >
      <div className="relay-lab-heading">
        <p className="eyebrow">
          Working prototype / simulated SMS delivery
        </p>
        <h2 id="conversation-demo-title">
          Ask me something else.
        </h2>
        <p>
          Enrollment and return questions are deliberately different.
          Authidenty stores a small numerical style profile, not the raw
          answers. A strong match selects a candidate; the enrolled
          device still makes the final decision.
        </p>
      </div>

      <div className="relay-ceremony conversation-ceremony">
        <nav
          className="flow-rail"
          aria-label="Conversational verification progress"
        >
          <p className="flow-rail-title">Recognition trace</p>
          <ol>
            {flowSteps.map((step) => {
              const state =
                phaseRank[step.phase] < phaseRank[phase]
                  ? "complete"
                  : step.phase === phase
                    ? "active"
                    : "pending";

              return (
                <li
                  data-state={state}
                  key={step.phase}
                  aria-current={
                    state === "active" ? "step" : undefined
                  }
                >
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
            <span>Trust boundary</span>
            <strong>
              Pattern selects. Device code verifies.
            </strong>
          </div>
        </nav>

        <article className="relay-stage" data-phase={phase}>
          <header className="relay-stage-header">
            <div>
              <p className="eyebrow">Current ceremony</p>
              <p className="stage-title">{currentStep.label}</p>
            </div>
            <span
              className={`stage-state ${
                phase === "verified" ? "is-verified" : ""
              }`}
            >
              {phase === "verified"
                ? "Device verified"
                : "Identity not verified"}
            </span>
          </header>

          {phase === "enroll" && (
            <form
              className="relay-form conversation-form"
              onSubmit={handleEnrollment}
            >
              <fieldset disabled={busyOperation !== null}>
                <legend>Let Authidenty learn how you answer</legend>
                <p className="form-intro">
                  These sample values make the demo reproducible. Change
                  the wording if you want to test your own pattern.
                </p>

                <div className="form-grid identity-fields">
                  <label>
                    Enrolled name
                    <input
                      name="displayName"
                      defaultValue="Danny Kim"
                      maxLength={80}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label>
                    Enrolled phone
                    <input
                      name="phone"
                      type="tel"
                      defaultValue="+12025550184"
                      pattern="\+[1-9][0-9]{7,14}"
                      autoComplete="tel"
                      required
                    />
                  </label>
                </div>

                <div className="question-stack">
                  {enrollmentQuestions.map((question, index) => (
                    <label
                      className="question-field"
                      key={question}
                    >
                      <span className="question-number">
                        Q{index + 1}
                      </span>
                      <span className="question-copy">{question}</span>
                      <textarea
                        name={`answer-${index}`}
                        defaultValue={enrollmentAnswers[index]}
                        maxLength={500}
                        minLength={10}
                        rows={3}
                        required
                      />
                    </label>
                  ))}
                </div>

                <p className="data-note">
                  Stored: derived style-v1 metrics and encrypted phone.
                  Not stored: these answer sentences.
                </p>

                <button className="primary-action" type="submit">
                  <span>
                    {busyOperation === "enroll"
                      ? "Deriving answer pattern"
                      : "Enroll this answer pattern"}
                  </span>
                  <span aria-hidden="true">01 / 04</span>
                </button>
              </fieldset>
            </form>
          )}

          {phase === "return" && enrollment && (
            <form
              className="relay-form conversation-form"
              onSubmit={handleMatch}
            >
              <fieldset disabled={busyOperation !== null}>
                <legend>Return without typing your identity</legend>
                <div className="enrollment-strip">
                  <div>
                    <span>Enrollment</span>
                    <strong>Ready</strong>
                  </div>
                  <div>
                    <span>Stored answers</span>
                    <strong>None</strong>
                  </div>
                  <div>
                    <span>Profile hidden</span>
                    <strong>Until match</strong>
                  </div>
                </div>

                <p className="form-intro">
                  No name or phone number is submitted in this step.
                  Answer three new questions in the same natural voice.
                </p>

                <div className="question-stack">
                  {returningQuestions.map((question, index) => (
                    <label
                      className="question-field"
                      key={question}
                    >
                      <span className="question-number">
                        Q{index + 1}
                      </span>
                      <span className="question-copy">{question}</span>
                      <textarea
                        name={`answer-${index}`}
                        defaultValue={returningAnswers[index]}
                        maxLength={500}
                        minLength={10}
                        rows={3}
                        required
                      />
                    </label>
                  ))}
                </div>

                <button className="primary-action" type="submit">
                  <span>
                    {busyOperation === "match"
                      ? "Comparing derived patterns"
                      : "Who do these answers resemble?"}
                  </span>
                  <span aria-hidden="true">02 / 04</span>
                </button>
              </fieldset>
            </form>
          )}

          {phase === "challenge" && challenge && (
            <form
              className="relay-form"
              onSubmit={handleVerification}
            >
              <fieldset disabled={busyOperation !== null}>
                <legend>Authidenty found a likely candidate</legend>

                <div className="identity-reveal">
                  <div className="identity-reveal-lead">
                    <span>Answer-pattern candidate</span>
                    <strong>
                      {challenge.candidate.displayName}
                    </strong>
                    <p>
                      Enrolled device{" "}
                      {challenge.candidate.destination}
                    </p>
                  </div>

                  <dl>
                    <div>
                      <dt>Combined match</dt>
                      <dd>{Math.round(challenge.score * 100)}%</dd>
                    </div>
                    <div>
                      <dt>Model pass</dt>
                      <dd>
                        {sourceLabel(challenge.analysisSource)}
                      </dd>
                    </div>
                    <div>
                      <dt>Decision authority</dt>
                      <dd>Not the model</dd>
                    </div>
                  </dl>
                </div>

                <blockquote className="pattern-explanation">
                  <span>Why this candidate</span>
                  <p>{challenge.explanation}</p>
                </blockquote>

                {challenge.demoCode && (
                  <div className="demo-transport">
                    <span>Simulated message to enrolled device</span>
                    <strong>{challenge.demoCode}</strong>
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
                      setVerificationCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      )
                    }
                    required
                  />
                </label>

                <button className="primary-action" type="submit">
                  <span>
                    {busyOperation === "verify"
                      ? "Checking one-time digest"
                      : "Verify enrolled device"}
                  </span>
                  <span aria-hidden="true">03 / 04</span>
                </button>
              </fieldset>
            </form>
          )}

          {phase === "verified" && verification && (
            <div className="relay-form receipt-view">
              <div className="verified-rule">
                <span>Final result</span>
                <strong>
                  {verification.displayName}, device verified.
                </strong>
                <p>
                  The answer pattern selected the candidate. The
                  one-time code proved control of{" "}
                  {verification.destination}.
                </p>
              </div>

              <dl className="receipt-grid">
                <div>
                  <dt>Recognized profile</dt>
                  <dd>{verification.displayName}</dd>
                </div>
                <div>
                  <dt>Enrolled route</dt>
                  <dd>{verification.destination}</dd>
                </div>
                <div>
                  <dt>Selection signal</dt>
                  <dd>Conversation pattern</dd>
                </div>
                <div>
                  <dt>Final factor</dt>
                  <dd>Simulated SMS OTP</dd>
                </div>
              </dl>

              <button
                className="secondary-action"
                type="button"
                onClick={resetDemo}
              >
                Run the identity demo again
              </button>
            </div>
          )}

          <div className="relay-status" aria-live="polite">
            {error ? (
              <p role="alert">{error}</p>
            ) : matchNote ? (
              <p role="status">{matchNote}</p>
            ) : (
              <p>
                {busyOperation
                  ? "Keep this page open while the local prototype responds."
                  : "Weak matches reveal no name, phone, or challenge."}
              </p>
            )}
          </div>
        </article>
      </div>

      <div className="boundary-map" aria-label="Information boundaries">
        <div className="boundary-map-title">
          <p className="eyebrow">Information boundary</p>
          <h3>Recognition is useful only when disclosure stays narrow.</h3>
        </div>
        <dl>
          <div>
            <dt>SQLite</dt>
            <dd>
              Derived style metrics, encrypted phone, code digest
            </dd>
          </div>
          <div>
            <dt>GPT-5.6</dt>
            <dd>
              Two numerical vectors and a hashed safety identifier
            </dd>
          </div>
          <div>
            <dt>Weak match</dt>
            <dd>No candidate name, phone suffix, or OTP route</dd>
          </div>
          <div>
            <dt>Strong match</dt>
            <dd>
              Candidate name and masked route, then device proof
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
