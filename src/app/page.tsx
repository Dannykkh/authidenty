import { PrivateRelayDemo } from "@/features/relay/components/private-relay-demo";

export default function Home() {
  return (
    <main className="page-shell min-h-dvh overflow-hidden">
      <header className="mx-auto flex w-full max-w-[90rem] items-center justify-between border-b border-ink/15 px-5 py-5 sm:px-8 lg:px-12">
        <a className="flex items-center gap-3" href="#top" aria-label="Authidenty home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em]">Authidenty</span>
        </a>

        <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/60">
          <span className="h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
          Build Week prototype
        </p>
      </header>

      <section id="top" className="hero-shell">
        <div className="reveal hero-copy">
          <p className="mb-7 font-mono text-[0.68rem] font-medium uppercase tracking-[0.22em] text-signal">
            Private identity relay / GPT-classified human approval
          </p>

          <h1 className="font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.82] font-medium tracking-[-0.075em] text-balance">
            Approve the action.
            <br />
            <span className="font-normal italic text-signal">Not your identity.</span>
          </h1>

          <div className="hero-deck">
            <p className="max-w-xl text-base leading-7 text-ink/72 sm:text-lg sm:leading-8">
              Authidenty lets an AI service ask a real person for approval without learning
              their phone number, name, birth date, document, or biometric. GPT-5.6 explains
              the action; deterministic code decides whether the enrolled device answered.
            </p>
          </div>
        </div>

        <aside className="reveal reveal-late hero-proof" aria-label="Private relay summary">
          <p className="eyebrow">Return less</p>
          <div className="proof-line">
            <span>Service sends</span>
            <strong>Action + opaque handle</strong>
          </div>
          <div className="proof-line">
            <span>Person receives</span>
            <strong>Private device challenge</strong>
          </div>
          <div className="proof-line proof-line-result">
            <span>Service gets back</span>
            <strong>Purpose-bound receipt</strong>
          </div>
          <p className="proof-footnote">No raw identity data crosses back.</p>
        </aside>
      </section>

      <PrivateRelayDemo />

      <footer className="mx-auto flex w-full max-w-[90rem] justify-between border-t border-ink/15 px-5 py-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink/45 sm:px-8 lg:px-12">
        <span>Apps for Your Life / OpenAI Build Week</span>
        <span>Prototype boundaries shown honestly</span>
      </footer>
    </main>
  );
}
