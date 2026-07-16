import { ConversationIdentityDemo } from "@/features/conversation/components/conversation-identity-demo";

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
            You Know Me? / Conversational continuity + device proof
          </p>

          <h1 className="font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.82] font-medium tracking-[-0.075em] text-balance">
            You know how
            <br />
            <span className="font-normal italic text-signal">I answer.</span>
          </h1>

          <div className="hero-deck">
            <p className="max-w-xl text-base leading-7 text-ink/72 sm:text-lg sm:leading-8">
              Authidenty asks different questions and compares the
              way you answer. GPT-5.6 helps select the likely enrolled
              profile without seeing raw identity data. A code sent to
              the masked enrolled device makes the final decision.
            </p>
          </div>
        </div>

        <aside className="reveal reveal-late hero-proof" aria-label="Conversational verification summary">
          <p className="eyebrow">Two signals, two jobs</p>
          <div className="proof-line">
            <span>Conversation says</span>
            <strong>This resembles Danny</strong>
          </div>
          <div className="proof-line">
            <span>Server reveals</span>
            <strong>Name + masked device</strong>
          </div>
          <div className="proof-line proof-line-result">
            <span>Device code proves</span>
            <strong>The enrolled route answered</strong>
          </div>
          <p className="proof-footnote">
            Pattern matching alone never completes authentication.
          </p>
        </aside>
      </section>

      <ConversationIdentityDemo />

      <footer className="mx-auto flex w-full max-w-[90rem] justify-between border-t border-ink/15 px-5 py-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink/45 sm:px-8 lg:px-12">
        <span>Apps for Your Life / OpenAI Build Week</span>
        <span>Candidate selection is not final authentication</span>
      </footer>
    </main>
  );
}
