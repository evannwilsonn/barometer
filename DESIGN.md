# Design notes

The page is a coastal weather station for stocks. Volatility forecasts work like marine forecasts: they say how rough conditions will be, not where the boat is going. So the page borrows the US coastal warning flags (one red pennant for a small-craft advisory, two for a gale, a red square with a black centre for a storm, two of those for a hurricane) and hoists them on a mast next to the forecast.

## Layout

- **Header and headline:** "How rough will next week be?" beside a one-paragraph explanation that says up front the app forecasts the size of moves, not their direction.
- **Ticker form:** a single field and a Forecast button.
- **The board:** three panels separated by hairlines.
  - Left: the mast and warning level, with the forecast, last month and EWMA side by side in condensed numerals.
  - Right: the likely-close bar (dark band ±1σ, light band ±2σ, a tick at today's close) and the forecaster's note, with its byline saying who or what wrote it and that it isn't advice.
  - Across the bottom: the backtest chart of past forecasts against what each week turned out to be.
- **Accuracy:** the test results as a short argument and a four-row table, with 2020–24 and 2025 side by side.

On narrow screens the panels stack, and the backtest chart keeps a 560px minimum and scrolls sideways rather than shrinking its labels.

## Color

The palette is fog, chart paper, deep-water ink and storm-flag red. Red is used only for the flags and the error box, so it always means "warning".

| Token | Light | Dark |
|---|---|---|
| Fog (page) | `#e4e9e7` | `#0b1418` |
| Paper (panels) | `#f7f9f8` | `#132026` |
| Ink | `#10202b` | `#e6eef0` |
| Flag red | `#c8102e` | `#ef3b4f` |
| Range bands | `#cfdfee` / `#e7eff6` | `#22415e` / `#19303f` |

The backtest chart has one coloured series: the forecast, in sea blue (`#1f5c9e` light, `#5b95d6` dark). The realised weeks are neutral ink dots. An ochre (`#a8670a` / `#bf7f22`) is reserved for an EWMA line. The blue and ochre pair passed the dataviz palette validator against both panel colours.

## Type

- **Saira Extra Condensed:** the wordmark, warning levels and numbers, like the stencilled lettering on a station board.
- **Literata:** running text and the note.
- **Red Hat Mono:** labels, prices and axis ticks.
