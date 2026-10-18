# Barometer

How rough will next week be? Barometer forecasts how much a US stock is likely to move over the next five trading days, turns that into a likely price range, and has a language model explain it in plain words. It's a Next.js app in TypeScript. The forecasting model is fitted from scratch in TypeScript too, and evaluated on twenty years of S&P 500 prices.

It forecasts the **size** of moves, not their direction. Whether a stock goes up or down next week is close to a coin flip, and nothing here claims otherwise. Nothing here is investment advice.

**Saved page:** [evannwilsonn.github.io/barometer](https://evannwilsonn.github.io/barometer/) is a frozen AAPL forecast with the accuracy results. The live app needs the server below.

## 1. Problem

How much a stock moves matters for things like sizing a position, setting a stop, or pricing an option. Unlike direction, it's partly predictable: rough weeks cluster together and calm ones do too. The task is to forecast a stock's realised volatility over the next 5 trading days from its daily prices, closely enough to beat the methods people already use, and to show it as something a non-specialist can read: a warning level, a price range and a short note.

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

The page shows:

- **Warning level:** after the US coastal warning flags. The thresholds (19%, 28%, 45% and 90%) are the 10th, 50th, 90th and 99th percentiles of forecasts in the test years, rounded.
- **Numbers:** the forecast next to last month's volatility and EWMA.
- **Price range:** a bar for the likely closing price a week out.
- **Note:** the written explanation.
- **Backtest:** the model's past forecasts for that stock against what each following week turned out to be.

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
lib/forecast.ts     a stock's candles → forecast, range, warning level, backtest
lib/sources.ts      Twelve Data and Groq clients, the advice filter, the fallback note
lib/station.ts      one request end to end
scripts/evaluate.ts fitting, tuning and scoring
scripts/snapshot.ts saves the rendered page for GitHub Pages
app/                the page and the API route
```

The page design is described in [DESIGN.md](DESIGN.md).

## Limits

- **US stocks only:** the model was fitted on large US stocks. It will produce numbers for anything with daily prices, but small caps, crypto and currencies behave differently.
- **Predictable events:** earnings days are predictably wild, and the model doesn't know when they are. A calendar of earnings dates is the obvious next feature.
- **No news:** the note explains numbers, not events. It doesn't read the news, and it's told not to guess.
