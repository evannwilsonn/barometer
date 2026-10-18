import { Suspense } from "react";
import { redirect } from "next/navigation";
import { accountsOn, currentUser, PROFILE } from "@/lib/auth";
import { AuthForm } from "./AuthForm";
import { Masthead } from "./Masthead";

/** Sign-in and sign-up share one page: the form on the left, what a logbook gives you on the right. */
export async function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  if (!accountsOn()) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-7">
        <Masthead />
        <p className="mt-12 max-w-[60ch] text-[18px] text-soft">Accounts are switched off on this deployment: it has no database. The README explains how to add one.</p>
      </main>
    );
  }
  if (await currentUser()) redirect("/logbook");
  const up = mode === "sign-up";
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-7">
      <Masthead />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 border-t border-rule pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div className="max-w-[480px]">
          <h1 className="engraved text-[40px] leading-[1.05] sm:text-[52px]">{up ? "Keep a logbook" : "Welcome back"}</h1>
          <p className="mt-3 mb-8 text-[18px] text-soft">{up ? "Save the stocks you follow and get their readings each weekday morning." : "Sign in to see the stocks in your logbook."}</p>
          <Suspense><AuthForm mode={mode} options={up ? PROFILE : undefined} /></Suspense>
        </div>
        <aside className="self-start rounded-md border-[6px] border-double border-case bg-porcelain p-6 sm:p-9" aria-label="What a logbook gives you">
          <p className="label">With a logbook</p>
          <ol className="mt-4 divide-y divide-rule">
            {[
              ["Your stocks, one page", "Every stock you save, with this week's reading: the forecast, last month for comparison, and where the price is likely to close."],
              ["A morning dispatch", "Each weekday before the open, an email with your readings, any stock whose weather has changed since the last one, and a short summary of its news."],
              ["A note to start", "Your answers to the sign-up questions shape a short welcome note. They're never used to tell you what to buy or sell; Barometer doesn't do that."],
            ].map(([h, p], i) => (
              <li key={h} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 py-4">
                <span className="engraved text-[22px] text-merlot">{i + 1}</span>
                <div><p className="engraved text-[17px]">{h}</p><p className="mt-1 text-[16px] leading-relaxed text-soft">{p}</p></div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}
