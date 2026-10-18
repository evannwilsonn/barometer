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
      <a href="/" className="engraved rounded-sm bg-case px-3 py-1.5 text-[18px] text-case-ink">Barometer</a>
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[16px]" aria-label="Main">
        <SearchPalette inLogbook={saved} />
        <a href="/#accuracy" className="underline underline-offset-4">Calibration</a>
        {accountsOn() && (user
          ? <><a href="/logbook" className="underline underline-offset-4">Logbook{saved.length ? ` (${saved.length})` : ""}</a><UserMenu name={user.name} email={user.email} /></>
          : <><a href="/sign-in" className="underline underline-offset-4">Sign in</a><a href="/sign-up" className="rounded-sm bg-case px-3 py-1.5 text-case-ink">Keep a logbook</a></>)}
      </nav>
    </header>
  );
}
