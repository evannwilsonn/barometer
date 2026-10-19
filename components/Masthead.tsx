import { accountsOn, currentUser } from "@/lib/auth";
import { logbookSymbols } from "@/lib/actions";
import { SearchPalette } from "./SearchPalette";
import { UserMenu } from "./UserMenu";

/** The bar across every page: name plate, search, logbook and account. */
export async function Masthead() {
  const user = await currentUser();
  const saved = user ? (await logbookSymbols()) ?? [] : [];
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6">
      <a href="/" className="group inline-flex items-center gap-3 rounded-sm">
        <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
          <circle cx="16" cy="16" r="15.5" fill="var(--bezel)" />
          <circle cx="16" cy="16" r="14" fill="none" stroke="var(--bezel-edge)" strokeWidth="0.8" />
          <circle cx="16" cy="16" r="12.5" fill="var(--dial-face)" />
          <path d="M8.6 21.5 A9.5 9.5 0 1 1 23.4 21.5" fill="none" stroke="var(--dial-ink)" strokeWidth="1.6" strokeDasharray="0.6 1.6" />
          <path d="M10 10.6 A8 8 0 0 1 17 8" fill="none" stroke="var(--dial-red)" strokeOpacity=".35" strokeWidth="2.6" />
          <line x1="16" y1="16" x2="11" y2="11.5" stroke="var(--bezel)" strokeWidth="1.2" />
          <line x1="17.6" y1="19.6" x2="12.6" y2="8.4" stroke="var(--dial-ink)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2" fill="var(--bezel)" stroke="var(--dial-ink)" strokeWidth=".6" />
        </svg>
        <span className="display text-[26px] leading-none tracking-[-0.01em]">Barometer</span>
      </a>
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[16px]" aria-label="Main">
        <SearchPalette inLogbook={saved} />
        <a href="/#accuracy" className="underline underline-offset-4">Calibration</a>
        {accountsOn() && (user
          ? <><a href="/logbook" className="underline underline-offset-4">Logbook{saved.length ? ` (${saved.length})` : ""}</a><UserMenu name={user.name} email={user.email} /></>
          : <><a href="/sign-in" className="underline underline-offset-4">Sign in</a><a href="/sign-up" className="rounded-sm bg-btn px-3 py-1.5 font-mono text-[14px] tracking-[0.12em] text-btn-ink">Keep a logbook</a></>)}
      </nav>
    </header>
  );
}
