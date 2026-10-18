import { Footer } from "@/components/Footer";
import { Masthead } from "@/components/Masthead";
import { contactEmail } from "@/lib/mail";

export const metadata = { title: "Terms and privacy · Barometer" };

const UPDATED = "October 18, 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`h-${id}`} className="scroll-mt-6 border-t border-rule pt-8">
      <h2 id={`h-${id}`} className="engraved text-[28px] leading-tight sm:text-[34px]">{title}</h2>
      <div className="mt-4 max-w-[72ch] space-y-4 text-[17px] leading-relaxed text-soft">{children}</div>
    </section>
  );
}

const H = ({ children }: { children: React.ReactNode }) => <h3 className="engraved pt-2 text-[18px] text-ink">{children}</h3>;

export default async function Page({ searchParams }: { searchParams: Promise<{ unsubscribed?: string }> }) {
  const { unsubscribed } = await searchParams;
  const email = contactEmail();
  const contact = email ? <a href={`mailto:${email}`} className="text-merlot underline underline-offset-4">{email}</a> : "the contact address on the project's GitHub page";
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-7">
      <Masthead />
      <div className="border-t border-rule pt-12">
        <p className="label">Last updated {UPDATED}</p>
        <h1 className="engraved mt-2 text-[44px] leading-none sm:text-[56px]">Terms and privacy</h1>
        <p className="mt-4 max-w-[64ch] text-[18px] text-soft">Barometer is a free, non-commercial student project run by Evan Wilson. These pages say what it is and isn&apos;t, what it does with your information, and how to leave.</p>
        {unsubscribed === "1" && <p role="status" className="mt-6 rounded-sm border border-merlot bg-porcelain px-4 py-3 text-[17px]">You&apos;re unsubscribed from the morning dispatch. You can turn it back on from your logbook.</p>}
        {unsubscribed === "0" && <p role="alert" className="mt-6 rounded-sm border border-merlot bg-porcelain px-4 py-3 text-[17px]">That unsubscribe link didn&apos;t work. Sign in and switch the dispatch off from your logbook, or email {contact}.</p>}
      </div>

      <div className="mt-10 space-y-12">
        <Section id="terms" title="Terms of use">
          <H>Not investment advice</H>
          <p>Barometer publishes statistical estimates of how much US stocks may move over the next five trading days, the same for every reader. It is for education and general information only. It is not investment, financial, legal or tax advice, and nothing on the site or in its emails is a recommendation or offer to buy, sell or hold any security. Barometer is not a registered investment adviser or broker-dealer, and using it creates no advisory relationship.</p>
          <p>Forecasts are estimates from a statistical model and are often wrong. Past accuracy, including the results on the calibration certificate, doesn&apos;t guarantee future accuracy. The written notes and news summaries are produced by an AI language model and can contain mistakes. Make your own decisions, and talk to a licensed professional before acting on anything you read here.</p>
          <H>Data from others</H>
          <p>Prices come from Twelve Data, headlines from Finnhub, and charts and market widgets from TradingView. They may be delayed, incomplete or wrong, and Barometer can&apos;t correct them. Headlines and articles belong to their publishers. You may not copy, scrape or redistribute the data shown here.</p>
          <H>Accounts</H>
          <p>You must be 18 or older to create an account. Give a real email address you control, keep your password private, and don&apos;t create accounts for other people or in bulk. Barometer may suspend or delete accounts that abuse the service, and may change or shut down the service at any time, with or without notice.</p>
          <H>Acceptable use</H>
          <p>Don&apos;t use Barometer to break the law, to send automated requests to its pages or API, to try to access other readers&apos; data, or to interfere with the service or the providers it relies on.</p>
          <H>No warranty and limited liability</H>
          <p>Barometer is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, express or implied, including accuracy, availability and fitness for a particular purpose. To the fullest extent the law allows, Evan Wilson is not liable for any losses or damages of any kind arising from your use of Barometer or reliance on anything it shows, including trading or investment losses. The service is free, and in any case total liability won&apos;t exceed US$10.</p>
          <H>Changes and law</H>
          <p>These terms may change; the date above shows the latest version, and continuing to use Barometer after a change means you accept it. These terms are governed by the laws of the State of Florida, USA. Questions: {contact}.</p>
        </Section>

        <Section id="privacy" title="Privacy policy">
          <H>What Barometer collects</H>
          <p>Without an account, Barometer stores nothing about you. With an account it stores your name, email address, a securely hashed password (never the password itself), your country, the industry you follow if you chose one, when you accepted these terms, the stocks in your logbook, and whether the morning dispatch is on. Signing in sets one cookie that keeps your session; there are no advertising or analytics cookies. The hosting provider keeps short-lived server logs (such as IP address and browser type) for security and troubleshooting.</p>
          <H>How it&apos;s used</H>
          <p>Only to run Barometer for you: showing your logbook, and sending the emails you asked for (confirming your address, resetting a password, the welcome note and the morning dispatch). Barometer doesn&apos;t sell or rent your information, doesn&apos;t show ads, and doesn&apos;t use your information to profile you or to tailor forecasts, which are the same for everyone.</p>
          <H>Services that handle it</H>
          <p>Barometer runs on these providers, each under its own privacy policy:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><b className="text-ink">Vercel</b> hosts the site and keeps its server logs.</li>
            <li><b className="text-ink">MongoDB Atlas</b> stores accounts and logbooks.</li>
            <li><b className="text-ink">Inngest</b> runs the email jobs, so it sees the name, email address and logbook stocks of the readers each job emails.</li>
            <li><b className="text-ink">Google (Gmail)</b> sends the emails.</li>
            <li><b className="text-ink">Groq</b> writes the notes and summaries. It receives forecast numbers, news headlines and, for the welcome note, the industry you picked. It never receives your name or email.</li>
            <li><b className="text-ink">Twelve Data</b> and <b className="text-ink">Finnhub</b> receive ticker symbols only.</li>
            <li><b className="text-ink">TradingView</b> widgets load from TradingView in your browser, which may set its own cookies.</li>
          </ul>
          <H>Keeping and deleting it</H>
          <p>Your information is kept until you delete your account. You can delete it from the Account section of your logbook, which removes your account, sessions and logbook at once. Backups and provider logs age out on their own schedules. To see, correct or delete your information another way, email {contact}; requests are answered within 30 days, wherever you live.</p>
          <H>Do Not Track</H>
          <p>Barometer doesn&apos;t track you across other sites and has no tracking to switch off, so it treats every visit the same whether or not your browser sends a Do Not Track or Global Privacy Control signal.</p>
          <H>Children</H>
          <p>Barometer isn&apos;t for anyone under 18. If you believe a child has made an account, email {contact} and it will be deleted.</p>
          <H>Security and location</H>
          <p>Connections use HTTPS, passwords are hashed, and emailed links expire after an hour. No system is perfectly secure. Barometer and its providers operate in the United States, so your information is processed there.</p>
          <H>Changes</H>
          <p>If this policy changes, the date at the top changes too. Readers with accounts will be emailed about any significant change before it takes effect.</p>
        </Section>

        <Section id="dispatch" title="Emails and unsubscribing">
          <p>Barometer sends only the emails you set in motion: the link to confirm your address, password resets you request, one welcome note, and the morning dispatch for your logbook on weekdays. The dispatch carries no advertising.</p>
          <p>Every dispatch has a one-click unsubscribe link, and your mail app&apos;s unsubscribe button works too. You can also switch the dispatch off or back on from your logbook. Unsubscribing takes effect straight away.</p>
        </Section>
      </div>
      <Footer />
    </main>
  );
}
