/** The foot of every page: data sources with the credit each provider asks for, and the legal page. */
export function Footer() {
  const a = "underline underline-offset-4";
  return (
    <footer className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-rule pt-6 text-[14px] text-faint sm:grid-cols-2">
      <p>
        Data provided by <a href="https://twelvedata.com" className={a}>Twelve Data</a>. Headlines from <a href="https://finnhub.io" className={a}>Finnhub</a>, charts and market widgets by <a href="https://www.tradingview.com" className={a}>TradingView</a>; prices may be delayed. Notes written by a language model on Groq from the numbers shown, with a check that drops any advice.
      </p>
      <p>
        Barometer is a free, non-commercial student project (project 11 of Evan Wilson&apos;s AI project run). It is not investment advice, and nothing on it is a recommendation to buy, sell or hold any security. <a href="/legal" className={a}>Terms and privacy</a> · <a href="https://github.com/evannwilsonn/barometer" className={a}>Source on GitHub</a>.
      </p>
    </footer>
  );
}
