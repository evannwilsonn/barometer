# Barometer

How rough will next week be? Barometer forecasts how much a US stock is likely to move over the next five trading days, turns that into a likely price range, and has a language model explain it in plain words. It's a Next.js app in TypeScript. The forecasting model is fitted from scratch in TypeScript too, and evaluated on twenty years of S&P 500 prices.

Readers can also keep a **logbook** of the stocks they follow and get a morning email with each one's reading and news (accounts, search, charts and email jobs added after JavaScript Mastery's stock-app tutorial; see [7. Deployment](#7-deployment)).

It forecasts the **size** of moves, not their direction. Whether a stock goes up or down next week is close to a coin flip, and nothing here claims otherwise. Nothing here is investment advice.

[![pipeline](https://github.com/evannwilsonn/barometer/actions/workflows/pipeline.yml/badge.svg)](https://github.com/evannwilsonn/barometer/actions/workflows/pipeline.yml)

**Live app:** [barometer-three.vercel.app](https://barometer-three.vercel.app), on Vercel. **Saved page:** [evannwilsonn.github.io/barometer](https://evannwilsonn.github.io/barometer/) is a frozen AAPL forecast with the accuracy results.

## 1. Problem

How much a stock moves matters for things like sizing a position, setting a stop, or pricing an option. Unlike direction, it's partly predictable: rough weeks cluster together and calm ones do too. The task is to forecast a stock's realised volatility over the next 5 trading days from its daily prices, closely enough to beat the methods people already use, and to show it as something a non-specialist can read: a reading on a barometer dial, a price range and a short note.

The target is the annualised standard deviation of the next five daily log returns. A forecast of 20% means a typical day moves about 1.3%.

## 2. Data

- **Model data:** daily open, high, low and close for current S&P 500 stocks ([jwigginton/timeseries-daily-sp500](https://huggingface.co/datasets/jwigginton/timeseries-daily-sp500) on Hugging Face). That's 4.0 million rows, using adjusted closes for returns. 403 stocks trade continuously from January 2005 to March 2024.
- **Splits by time, never by stock:** train 2005–2016, tune 2017–2019, test 2020 to March 2024. A forecast whose target week crosses a boundary is dropped. That leaves 1.24 million train, 302,000 tune and 423,000 test forecasts.
- **A second, fresh check:** 2025 prices for all 503 S&P 500 stocks from a different source ([mospira/sp500-daily-candles-2025](https://huggingface.co/datasets/mospira/sp500-daily-candles-2025)), used once at the end. That's 110,000 forecasts from February to December 2025. Its closes aren't split-adjusted, so one-day moves over 40% are dropped.
- **Live:** [Twelve Data](https://twelvedata.com) daily candles, the last 300 days per request.

The stock list is today's S&P 500, so stocks that failed or were dropped are missing (survivorship bias). That flatters any method a little, but it does so equally for the baselines and the model.

## 3. Baseline

There are two standard forecasts that need no fitting:

- **Last 20 days:** realised volatility over the past month, carried forward.
- **EWMA:** RiskMetrics' exponentially weighted variance, λ = 0.94. This is the industry default, and the one to beat.

Scores use **QLIKE**, the usual loss for volatility forecasts, where lower is better. It is robust to how noisy a single week's realised volatility is, and it punishes under-forecasting a rough week more than over-forecasting a calm one. Log RMSE is reported alongside.

## 4. Model

The model is **HAR** (Corsi, 2009): next week's log variance is a linear function of the log variance over the last day, week and month. It is fitted by least squares over all stocks together, with a streaming solver that keeps only X'X and X'y (`lib/ols.ts`), so 1.5 million rows never sit in memory as a matrix. The fit is on log variance, so the forecast adds half the residual variance before converting back. That turns a median into a mean.

## 5. Evaluation

On the tune split, everything fitted on train:

| Forecast | QLIKE | log RMSE |
|---|---|---|
| Last 20 days | 0.752 | 0.574 |
| EWMA | 0.642 | 0.560 |
| HAR | 0.606 | 0.603 |

Plain HAR beats both baselines on QLIKE, but it's worse on log RMSE. It gets the rough weeks right and is noisier on calm ones, because one day's squared return is a very noisy input.

## 6. Improvement

Three additions were tried, every combination, on the tune split:

| Addition | What it is | QLIKE | log RMSE |
|---|---|---|---|
| none (HAR) | | 0.606 | 0.603 |
| + market | the market's variance over the last week | 0.612 | 0.578 |
| + down days | the size of today's move if it was a fall (the leverage effect) | 0.603 | 0.601 |
| + range | Parkinson's estimator, (ln high/low)² / 4 ln 2, in place of squared returns | 0.557 | 0.560 |
| **+ range + down days** | | **0.556** | **0.560** |
| + range + down days + market | | 0.562 | 0.548 |

Using each day's high-low range instead of only its close is the big gain. The range sees the whole day's movement, so it's a far less noisy input. Down days help a little. The market term improves log RMSE but worsens QLIKE, so on the chosen metric it's left out. **HAR + range + down days** was refitted on 2005–2019 and scored once on the test years:

| Forecast | 2020–24 QLIKE | log RMSE | 2025 QLIKE |
|---|---|---|---|
| Last 20 days | 0.639 | 0.537 | 0.799 |
| EWMA (baseline) | 0.567 | 0.527 | 0.715 |
| HAR | 0.528 | 0.534 | 0.662 |
| **HAR + range + down days** | **0.494** | **0.501** | **0.599** |

- **Against EWMA:** the chosen model scores 0.073 better on QLIKE, about 13%. The 95% interval runs from 0.051 to 0.114, from a moving-block bootstrap over trading days, because forecasts on the same day aren't independent.
- **Every year:** it beats EWMA in each test year, including 2020.
- **The 2025 data:** from a different source, the gain grows to 0.117 (interval 0.076 to 0.174).
- **Calibration:** across forecast deciles it tracks realised volatility. It runs 5–9% high in the middle deciles and is on target at both ends.
- **The price range:** the ±1σ band the app shows caught 71% of weeks in 2020–24 and 74% in 2025, against 68% for a perfect normal forecast. The ±2σ band caught 94%, against 95%. Weekly returns have fatter tails than a normal distribution, so the bands are slightly wide in calm weeks and occasionally beaten in wild ones.

Final coefficients, on log variance: intercept −0.946, last day 0.126, last week 0.231, last month 0.542, down day 0.260. Most of the weight is on the past month, which is why the forecast moves smoothly.

## 7. Deployment

The app is Next.js 16 with Tailwind and runs on Vercel.

- `GET /api/forecast/[symbol]` fetches daily candles from Twelve Data, applies the model from `model/model.json`, and asks Groq for a note. Responses are cached for 15 minutes.
- **The note:** the model is given only the computed numbers. It is told to describe the size of moves and the price range, not direction, and never to give advice. A filter then drops any sentence that mentions buying, selling, hedging or recommending.
- **Without a Groq key:** the page writes the note from the same numbers in code.
- **Without a Twelve Data key:** it falls back to the public demo key, which covers AAPL and a few others.

```sh
npm install
cp .env.example .env.local    # add TWELVE_DATA_API_KEY and GROQ_API_KEY (both free)
npm run dev                   # http://localhost:3000
```

**On Vercel:** import the repo and add the same two variables under Settings → Environment Variables. The keys stay on the server and never reach the browser.

### Accounts, the logbook and the morning dispatch

The second half of the app follows JavaScript Mastery's tutorial [*Build a Stock Market App*](https://youtu.be/gu4pafNCXng) (Signalist): sign-in with Better Auth and MongoDB, a ⌘K stock search, TradingView charts, company news, and Inngest jobs that send email through Nodemailer. Those parts are rebuilt here around the forecast rather than copied:

- **Accounts:** email and password through Better Auth, with users and sessions in MongoDB. An address must be confirmed before the account can sign in, so the site never emails someone who didn't sign up. Readers can reset a forgotten password and delete their account (which deletes their logbook). The tutorial also asked for investment goals and risk tolerance; Barometer asks only for country and, optionally, an industry (see Legal below).
- **Search:** ⌘K / Ctrl-K opens a search over Finnhub's US listings. Picking a stock takes its reading.
- **Logbook:** the tutorial left the watchlist as homework (its button only toggled local state, and there was no page). Here a reading has an *Add to your logbook* button, and `/logbook` lists every saved stock with this week's reading, last month, the likely close and recent headlines. Every logbook action checks the session on the server, and a reader only touches their own entries. `proxy.ts` (Next 16's renamed middleware) sends signed-out visitors to sign in.
- **Today's weather map:** the home page carries the tutorial's four market widgets from TradingView, dressed in the instrument's colours: an S&P 500 heatmap by sector ("Pressure map"), a year of the main indices and three sectors, the market wire, and a quotes board. They show what the market has done; the dial shows how rough one stock's next week is likely to be. Below them, a panel shows what an account adds, using the real reading on the page for its sample dispatch.
- **Chart and news:** a TradingView advanced chart in the instrument's colours and the stock's last five days of Finnhub headlines sit under the barograph. Headlines are shown as published; the forecast doesn't use them.
- **Welcome email:** when a reader confirms their email, Better Auth's `afterEmailVerification` hook sends an `app/user.verified` event to Inngest. Inngest asks Groq for two sentences on using the readings for the industry they picked (Groq sees only the industry, never the name or email), runs them through the same advice filter as the forecast note, and emails them. Without a Groq key or an industry, the note is written in code.
- **Morning dispatch:** an Inngest cron at 8:30 New York time on weekdays (`TZ=America/New_York 30 8 * * 1-5`), and a button on the logbook page that queues one for the signed-in reader only. Each stock gets one reading however many readers follow it, pausing after every eight for Twelve Data's free rate limit. Each reader's email has their readings, a line for any stock whose dial word changed since the last dispatch (Fair to Change, say), and Groq's summary of up to six headlines with the links. Every number in the email comes from code, and only the news paragraphs are written by the model. Everything in the email is HTML-escaped, including the model's text.

The tutorial uses Gemini for the AI parts and keeps the Finnhub key in a `NEXT_PUBLIC_` variable, which ships it to the browser. Here Groq stays the one model provider, and every key stays on the server. The tutorial's middleware also sat in `middleware/index.ts`, where Next.js never loads it.

**Setting it up.** Each service has a free tier, and you create the accounts and paste the keys into `.env.local` yourself:

| Variable | From |
|---|---|
| `MONGODB_URI` | a free MongoDB Atlas cluster (Database → Connect → Drivers) |
| `BETTER_AUTH_SECRET` | any long random string: `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | the site's address, `http://localhost:3000` locally |
| `FINNHUB_API_KEY` | finnhub.io, free plan |
| `NODEMAILER_EMAIL`, `NODEMAILER_PASSWORD` | a Gmail address and a Gmail *app password* (needs 2-step verification on; paste the 16 letters without spaces) |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | the Inngest dashboard, for production only |

Without `MONGODB_URI` the accounts and logbook are switched off and the forecast pages work as before. Without a Finnhub key, search covers ten popular stocks and the news is hidden. Without Gmail settings, emails go to `SMTP_URL` if it's set, or are only logged.

Locally:

```sh
npm run dev                                                     # the app
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest # the job runner, with INNGEST_DEV=1 in .env.local
```

**Tested here** without any real accounts, using containers: MongoDB 8 (standalone, so `MONGODB_TRANSACTIONS=false`; Atlas doesn't need it), the Inngest dev server, and Mailpit as the mail server (`SMTP_URL=smtp://localhost:1025`). A browser script signs up, adds AAPL from its reading, opens the logbook, and requests a dispatch. Both the welcome email and the dispatch arrive, with no console errors and no sideways scrolling at 390 px. `lib/dispatch.test.ts` checks the weather-change lines and that every name, headline, URL and model sentence is escaped in the email. On Vercel, the live app uses the MongoDB Atlas and Inngest marketplace integrations: each creates a free account and adds its variables (`MONGODB_URI`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) to the project. The other keys are added by hand under Settings → Environment Variables.

The page shows:

- **Dial:** a barometer face. The needle is the forecast and a brass set hand marks last month, the way a real barometer's set hand marks the previous reading. Its words run Settled, Fair, Change, Rough, Stormy, with boundaries at 19%, 28%, 45% and 90%: the 10th, 50th, 90th and 99th percentiles of forecasts in the test years, rounded.
- **Numbers:** the forecast next to last month's volatility and EWMA.
- **Price range:** a bar for the likely closing price a week out.
- **Note:** the written explanation.
- **Backtest:** the model's past forecasts for that stock against what each following week turned out to be.

### Pipeline and containers

Every push runs [`.github/workflows/pipeline.yml`](.github/workflows/pipeline.yml):

- **check:** typecheck, unit tests, production build.
- **e2e:** starts the built app with MongoDB, Mailpit (a mail catcher) and the Inngest dev server, then [`scripts/e2e.ts`](scripts/e2e.ts) drives a real browser through every account flow: sign-up and the emailed confirmation, the welcome email from Inngest, adding a stock, the dispatch and its one-click unsubscribe headers, a forged unsubscribe link, sign-in timing, password reset, and account deletion, then checks five pages fit a phone. 20 checks.
- **image:** builds the Dockerfile, starts the container and checks it serves, then on `main` publishes `ghcr.io/evannwilsonn/barometer:latest` and `:<short sha>`.

Vercel deploys `main` to the live site on its own. The Docker image is the same app for any other host.

The whole stack also runs on one machine:

```sh
docker compose up -d --build                                    # app :3000, inbox :8025, Inngest :8288
docker compose -f compose.yml -f compose.dev.yml watch           # next dev with live sync of your edits
docker compose -f compose.yml -f compose.prod.yml up -d          # the published image instead of a build
npm run e2e                                                      # the browser test against whichever is running
```

Compose wires the database, email and jobs to its own containers, so nothing it sends reaches a real inbox; API keys come from `.env` if there is one. The image is Next's standalone server on Alpine as a non-root user. Because a container only learns its settings when it starts, the account pages wait for a request before deciding whether accounts are on, rather than being pre-rendered at build time.

## Legal

Barometer is public, has accounts and sends email, so these were checked. This is a summary of what was done, not legal advice.

- **Not an investment adviser.** US law excludes publishers of impersonal, disinterested, generally available content from the definition of an investment adviser (*Lowe v. SEC*, 1985; applied to an online platform's filters and alerts in the 2024 *Seeking Alpha* decision). Barometer stays inside that: every reader sees the same forecast for a stock, the logbook and dispatch only filter that content by the stocks a reader picks, nothing recommends buying or selling, and the language model's text passes an advice filter. For that reason sign-up no longer asks about investment goals or risk tolerance, and nothing is tailored to a reader's finances. Every page and email says it isn't investment advice.
- **Terms and privacy** at `/legal`: no-advice and AI-accuracy disclaimers, no warranty, limited liability, 18+ accounts, Florida law, and a privacy policy with what California's CalOPPA asks for (what's collected, who receives it, how to change or delete it, how Do Not Track is handled, how changes are announced, the effective date). Sign-up needs a box ticked agreeing to both, and the time is stored.
- **Email (CAN-SPAM).** The dispatch has no advertising, but every one carries a signed one-click unsubscribe link and `List-Unsubscribe` / `List-Unsubscribe-Post` headers, and the logbook has an on/off switch. Only confirmed addresses get mail.
- **Your data.** Readers can delete their account, logbook and sessions themselves. No analytics or ad cookies; one session cookie. Groq never receives names or emails; the data APIs receive only ticker symbols.
- **Data licenses.** Twelve Data asks for "Data provided by Twelve Data" near publicly shown data, and that credit is under every reading and in the footer; Finnhub and TradingView are credited too, and TradingView's widget branding is left as TradingView ships it. Their free plans are for non-commercial use, and Barometer is free, non-commercial and ad-free. Twelve Data's terms say public display needs to be authorised by your plan, so for a portfolio site that stays up it's worth asking them in writing.
- **The tutorial's code** has no open-source license, so none of it is copied here; Barometer's versions were written from scratch, following the tutorial's feature list.

Set `CONTACT_EMAIL` to the address the legal page should show; without it the sending address is used.

## Reproducing the numbers

```sh
mkdir -p data/raw
curl -L -o data/raw/sp500.parquet https://huggingface.co/datasets/jwigginton/timeseries-daily-sp500/resolve/main/data/train-00000-of-00001.parquet
curl -L -o data/raw/sp500-2025.csv https://huggingface.co/datasets/mospira/sp500-daily-candles-2025/resolve/main/sp500-daily-tickers-2025.csv
npm run evaluate     # about 15 s; writes results/eval.json and model/model.json
npm test
npm run build && npm start      # then, in another terminal:
SNAPSHOT_URL=http://localhost:3000 npm run snapshot   # docs/index.html
```

## Layout

```
lib/vol.ts          returns, Parkinson range, HAR features, forecasts, losses
lib/ols.ts          streaming least squares with a Cholesky solve
lib/forecast.ts     a stock's candles → forecast, range, dial reading, backtest
lib/sources.ts      Twelve Data and Groq clients, the advice filter, the fallback note
lib/station.ts      one request end to end, and the bare reading for the logbook
lib/auth.ts         Better Auth: email and password, profile fields, the sign-up hook
lib/db.ts           the MongoDB connection and the logbook collection
lib/finnhub.ts      search, company names and news
lib/actions.ts      server actions: search, logbook, request a dispatch
lib/writer.ts       Groq for the welcome note and the news summary, with fallbacks
lib/mail.ts         Nodemailer and the email frame
lib/inngest/        the welcome and morning-dispatch jobs
proxy.ts            sends signed-out visitors from /logbook to sign in
scripts/evaluate.ts fitting, tuning and scoring
scripts/snapshot.ts saves the rendered page for GitHub Pages
app/                the pages (reading, sign-in, sign-up, logbook) and API routes
components/         masthead, search, logbook controls, chart, news
```

The page design is described in [DESIGN.md](DESIGN.md).

## Limits

- **US stocks only:** the model was fitted on large US stocks. It will produce numbers for anything with daily prices, but small caps, crypto and currencies behave differently.
- **Predictable events:** earnings days are predictably wild, and the model doesn't know when they are. A calendar of earnings dates is the obvious next feature.
- **News isn't in the forecast:** headlines are shown next to the reading and summarised in the dispatch, but the model doesn't use them, and the note under each forecast is told not to guess at events.
- **Email at scale:** the dispatch sends one email at a time through one Gmail account, which suits a portfolio project, not thousands of readers. A transactional mail service would replace Gmail there.
