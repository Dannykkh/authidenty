import { PasskeyRegistration } from "@/features/passkeys/components/passkey-registration";

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

      <section
        id="top"
        className="mx-auto grid w-full max-w-[90rem] gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)] lg:gap-20 lg:px-12 lg:py-24"
      >
        <div className="reveal flex max-w-5xl flex-col items-start">
          <p className="mb-7 font-mono text-[0.68rem] font-medium uppercase tracking-[0.22em] text-signal">
            Passkey-first identity / Recovery without ID uploads
          </p>

          <h1 className="font-display text-[clamp(4rem,10vw,9rem)] leading-[0.82] font-medium tracking-[-0.075em] text-balance">
            Sign in.
            <br />
            <span className="font-normal italic text-signal">Stay human.</span>
          </h1>

          <div className="mt-10 grid max-w-3xl gap-7 border-t border-ink/20 pt-7 sm:grid-cols-[1fr_auto] sm:items-end">
            <p className="max-w-xl text-base leading-7 text-ink/72 sm:text-lg sm:leading-8">
              Authidenty replaces code typing with device-bound passkeys. When a device
              disappears, a GPT-5.6 recovery agent explains what failed and guides a secure
              way back in.
            </p>
            <span className="inline-flex w-fit items-center gap-2 border border-ink bg-ink px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-paper">
              Passkey registration is live
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" />
              </svg>
            </span>
          </div>
        </div>

        <PasskeyRegistration />
      </section>

      <footer className="mx-auto flex w-full max-w-[90rem] justify-between border-t border-ink/15 px-5 py-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink/45 sm:px-8 lg:px-12">
        <span>Apps for everyday life</span>
        <span>OpenAI Build Week</span>
      </footer>
    </main>
  );
}
