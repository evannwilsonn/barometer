# Design notes

The page is an aneroid barometer, the instrument the project is named after. A barometer doesn't say where the weather is going, only how settled or stormy it's likely to be, which is exactly what a volatility forecast does for a stock. So the forecast is read off a dial, the price range off a vernier scale, the backtest off a barograph, the note is a log entry, and the accuracy results are a calibration certificate.

## The dial

- **Face:** a porcelain face in a merlot lacquered case, with a copper bezel ring.
- **Scale:** 0% to 100% annualised volatility over 270°. It is square-root spaced, so the crowded low end, where most stocks sit, gets room.
- **Words:** in place of a weather barometer's Stormy, Rain, Change, Fair, Very Dry, it reads **Settled, Fair, Change, Rough, Stormy**. The boundaries (19%, 28%, 45%, 90%) are the 10th, 50th, 90th and 99th percentiles of forecasts in the test years. The current zone's arc and word are drawn in merlot.
- **Needle:** a blacked steel needle shows the forecast, and swings to a new reading when the ticker changes.
- **Set hand:** a copper hand marks last month's volatility. On a real barometer the set hand is turned by hand to the last reading, so you can see which way the needle has moved since. That is the same comparison here.

## Layout

- **Nameplate:** a merlot badge for the name, then the headline "How rough will next week be?".
- **The reading:** the dial on the left. On the right are the zone word in large engraved capitals, the three readings (needle, set hand, EWMA reference) with matching swatches, and the vernier. The vernier is a ruled strip with the darker ±1σ band, the lighter ±2σ band, and a pointer at the last close.
- **Log:** a ruled entry with the date on the left and the note in italic on the right, with its byline.
- **Barograph:** past forecasts as a merlot trace over monthly drum lines, with what each week turned out to be as grey dots.
- **Certificate of calibration:** a double-ruled card that states the instrument, test set, reference standard, result and range check. It ends with what isn't certified, which is direction. The QLIKE table sits beside it.

Below 1024px the dial sits above the readings. The barograph keeps a 560px minimum width and scrolls sideways on phones rather than shrinking its labels.

## Color

| Token | Light | Dark |
|---|---|---|
| Wall (page) | `#ece3dd` | `#120a0b` |
| Porcelain (panels, dial face) | `#fbf8f3` | `#211517` |
| Case | `#5c1621` | `#3a0f16` |
| Ink | `#1d1513` | `#f3e9e4` |
| Merlot (current zone, headings) | `#7a1f2e` | `#e9a0aa` |
| Copper (set hand, bezel) | `#a8491f` | `#e3925f` |
| Range bands | `#ecd5d0` / `#f5e9e5` | `#4a2328` / `#321b1e` |

Dark mode is its own set of values, not an inversion: the case deepens, the dial face goes to dark porcelain, and the needle turns pale so it still reads against it. The barograph has a single coloured series, the forecast trace (`#963044` light, `#d2687a` dark). Both were checked with the dataviz palette validator against the panel colour, and the realised weeks are neutral dots.

## Type

- **Marcellus:** the dial lettering, zone words, readings and headings. It is an engraved Roman, like the lettering on instrument dials and brass plates.
- **Newsreader:** running text and the italic log entry.
- **Spline Sans Mono:** labels, prices and chart ticks.
