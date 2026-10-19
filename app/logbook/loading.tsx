/** Shown straight away while the logbook's readings load, so signing in never looks stuck. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-7" aria-busy="true">
      <div className="h-[88px]" />
      <div className="border-t border-rule pt-12">
        <p className="label">Your logbook</p>
        <h1 className="display mt-2 text-[44px] leading-none sm:text-[56px]">The week ahead</h1>
      </div>
      <section className="mt-10 rounded-md border border-hair bg-panel p-8 sm:p-12">
        <p role="status" className="engraved text-[22px] text-soft">Taking this week&apos;s readings…</p>
        <div className="mt-6 space-y-3" aria-hidden>
          {[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-sm bg-rule/60" />)}
        </div>
      </section>
    </main>
  );
}
