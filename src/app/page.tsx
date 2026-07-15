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
              Hello shell is live
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" />
              </svg>
            </span>
          </div>
        </div>

        <aside className="reveal reveal-late relative self-end border-l border-ink/20 pl-6 sm:pl-8 lg:mb-2">
          <div className="absolute top-0 -left-px h-20 w-px bg-signal" aria-hidden="true" />
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/50">
            Build sequence
          </p>

          <ol className="mt-8 divide-y divide-ink/15">
            <li className="grid grid-cols-[2.25rem_1fr] gap-3 py-5 first:pt-0">
              <span className="font-display text-2xl italic text-signal">01</span>
              <div>
                <p className="text-sm font-semibold">Running foundation</p>
                <p className="mt-1 text-sm leading-6 text-ink/55">Next.js, TypeScript, Tailwind</p>
              </div>
            </li>
            <li className="grid grid-cols-[2.25rem_1fr] gap-3 py-5">
              <span className="font-display text-2xl italic text-ink/35">02</span>
              <div>
                <p className="text-sm font-semibold">Passkey ceremony</p>
                <p className="mt-1 text-sm leading-6 text-ink/55">Registration and sign-in</p>
              </div>
            </li>
            <li className="grid grid-cols-[2.25rem_1fr] gap-3 py-5">
              <span className="font-display text-2xl italic text-ink/35">03</span>
              <div>
                <p className="text-sm font-semibold">Recovery conversation</p>
                <p className="mt-1 text-sm leading-6 text-ink/55">Diagnosis and safe re-enrollment</p>
              </div>
            </li>
          </ol>

          <p className="mt-8 max-w-xs font-mono text-[0.64rem] leading-5 uppercase tracking-[0.13em] text-ink/45">
            Stores credentials, never raw identity documents or biometrics.
          </p>
        </aside>
      </section>

      <footer className="mx-auto flex w-full max-w-[90rem] justify-between border-t border-ink/15 px-5 py-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink/45 sm:px-8 lg:px-12">
        <span>Apps for everyday life</span>
        <span>OpenAI Build Week</span>
      </footer>
    </main>
  );
}
