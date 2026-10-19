# Design notes

The page is an aneroid barometer, the instrument the project is named after. A barometer doesn't say where the weather is going, only how settled or stormy it's likely to be, which is exactly what a volatility forecast does for a stock. So the forecast is read off a dial, the price range off a vernier scale, the backtest off a barograph, the note is a log entry, and the accuracy results are a calibration certificate.

## The dial

- **Face:** a cream face (`#f0e6cf`) in a brass bezel (`#c39a4c`) with a darker brass edge ring, as on the project thumbnail. The instrument is the same object in both themes.
- **Scale:** 0% to 100% annualised volatility over 270°. It is square-root spaced, so the crowded low end, where most stocks sit, gets room. It is ruled every 1%, with longer marks at 5s and 10s, and numbered in Libre Baskerville.
- **Words:** in place of a weather barometer's Stormy, Rain, Change, Fair, Very Dry, it reads **Settled, Fair, Change, Rough, Stormy**, letterspaced in Arsenal SC to fit each zone. The boundaries (19%, 28%, 45%, 90%) are the 10th, 50th, 90th and 99th percentiles of forecasts in the test years. The current zone is washed in translucent red (`#9e2b25` at 26%) and its word is set in red.
- **Needle:** a blacked needle shows the forecast, and swings to a new reading when the ticker changes (no motion under reduced-motion).
- **Set hand:** a brass hand marks last month's volatility. On a real barometer the set hand is turned by hand to the last reading, so you can see which way the needle has moved since. That is the same comparison here.

## Layout

- **Nameplate:** a small brass-bezelled dial beside the name in Libre Baskerville, then a letterspaced brass line, the headline "How rough will next week be?" in italic and a short brass rule, as on the thumbnail.
- **The reading:** the dial on the left. On the right are the zone word in large engraved capitals, the three readings (needle, set hand, EWMA reference) with matching swatches, and the vernier. The vernier is a ruled strip with the darker ±1σ band, the lighter ±2σ band, and a pointer at the last close.
- **Log:** a ruled entry with the date on the left and the note in italic on the right, with its byline.
- **Barograph:** past forecasts as a red trace over monthly drum lines, with what each week turned out to be as grey dots.
- **Certificate of calibration:** a double-ruled card that states the instrument, test set, reference standard, result and range check. It ends with what isn't certified, which is direction. The QLIKE table sits beside it.

Below 1024px the dial sits above the readings. The barograph keeps a 560px minimum width and scrolls sideways on phones rather than shrinking its labels.

## Color

Dark is the thumbnail itself: a navy ground with faint engine-turned brass rings. Light is the same instrument on cream paper, inked in navy.

| Token | Light | Dark |
|---|---|---|
| Wall (page, with rings) | `#ebe1c9` | `#14233a` |
| Panel | `#f7f0df` | `#1b2d48` (brass hairline edge) |
| Case (logbook band) | `#14233a` | `#0d1828` |
| Ink | `#14233a` | `#f0e6cf` |
| Storm (current zone, alerts) | `#9e2b25` | `#e8907f` |
| Brass (labels) | `#7a581c` | `#c9a258` |
| Bezel, set hand, rules | `#c39a4c` | `#c39a4c` |
| Range bands | `#e6cbbb` / `#f1e2d3` | `#5a3240` / `#2f3550` |

Text colours were checked for AA contrast on the wall and panel in each theme. The barograph has a single coloured series, the forecast trace in storm red; the realised weeks are neutral dots.

## Type

- **Libre Baskerville:** headings, running text, the dial numbers and the italic log entry and headline.
- **Arsenal SC:** the dial words, labels, buttons, tickers and figures, letterspaced like the lettering engraved on an instrument.

## Accounts, logbook and email

The pages added for accounts use the same instrument vocabulary rather than an app-dashboard look:

- **Masthead:** the name plate, a "Find a stock ⌘K" field on the panel, and the account initials in a brass disc, like a maker's mark.
- **Search:** a panel card over a dimmed wall. Tickers are set in Arsenal SC, names in Libre Baskerville; the active row takes the light range-band colour.
- **Sign-up:** the form on the left; on the right, a panel with the certificate's double red border, listing what a logbook gives you. No testimonials or stock photos. Profile answers are chips: the chosen one gets the dark range band and a red edge.
- **Logbook:** a ledger table under the heading "The week ahead". Each row has its dial word in red over a five-segment scale that shows where the reading sits between Settled and Stormy.
- **Email:** a 600 px cream card under a navy top rule edged in brass, Baskerville (falling back to Georgia) for text and Courier for figures (email clients don't load web fonts), and a footer with the no-direction, no-advice line. A change of weather is set in a range-band box above the table.
- **TradingView chart:** the widget gets the panel background and rule colour as its grid, so it sits inside the panel rather than on a black slab.
- **Weather map:** the tutorial's dashboard widgets sit in panel panels under engraved titles (Pressure map, Indices and sectors, The wire, Quotes board), each with one line on what it shows. They load transparent and in TradingView's light or dark theme to match the page; the year chart's line and fill use the barograph's forecast colour. The heatmap keeps TradingView's red-to-green scale, because there colour carries the day's move.
- **Logbook panel:** a case-coloured band, the one large dark surface on the page, like the instrument's case. Its sample dispatch card uses the reading already on the page, so it never shows invented numbers.
