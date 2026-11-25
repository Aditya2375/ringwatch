# Ringwatch

A money mule ring detector that runs in the browser, scored honestly on synthetic payments with planted rings.

Live: https://aditya2375.github.io/ringwatch/

## What it does

`docs/js/detect.js` matches each account's outgoing payments first-in-first-out to money received in the previous 48 hours. Accounts that pass on at least 60% of what they get, in a burst of 3 days or fewer, are flagged. Flagged accounts joined by a direct payment form a ring, and the senders into a ring are shown as likely victims. The detector does not see labels.

## Scorecard

| | Easy set | Hard set |
|---|---|---|
| Mule accounts planted | 37 | 54 |
| Accounts flagged | 38 | 36 |
| Precision | 97% | 100% |
| Recall | 100% | 67% |
| Rings found | 8 of 8 | 7 of 12 |

The data is synthetic and the author wrote both the generator (`train/gen.py`) and the detector, so the easy set is a sanity check and not evidence. The hard set has long delays, bigger fees, camouflage spending and more merchants. Thresholds were set on the easy set and not changed for the hard one.

## Rebuild

```
python train/gen.py        # writes docs/data.json
node train/eval.js         # writes docs/metrics.json
cd docs && python -m http.server
```

## Limits

Real fraud systems use device, identity and account-age signals that a payment graph lacks. A flag needs human review.

MIT licence. Fonts: Instrument Serif and IBM Plex Mono, SIL OFL.
