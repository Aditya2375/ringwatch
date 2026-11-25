"""Synthetic payments with planted mule rings. Two difficulty levels, fixed seeds. All data is made up."""
import json, random, math
def make(seed, hard):
    R = random.Random(seed)
    acc = {}; tx = []
    def A(kind):
        i = f"A{len(acc):04d}"; acc[i] = kind; return i
    normal = [A("normal") for _ in range(600)]
    merchants = [A("merchant") for _ in range(6 if not hard else 14)]
    payroll = [A("payroll") for _ in range(3 if not hard else 6)]
    bank = A("sink")
    days = 30
    def add(a, b, amt, t): tx.append([a, b, round(amt, 2), round(t, 2)])
    for a in normal:
        for _ in range(R.randint(3, 12)):
            b = R.choice(normal + merchants)
            if b != a: add(a, b, math.exp(R.gauss(3.6, 1.0)), R.uniform(0, days * 24))
    for m in merchants:
        for d in range(days):
            ds = [a for a in R.sample(normal, R.randint(8, 25))]
            tot = 0
            for a in ds:
                x = math.exp(R.gauss(3.8, .8)); tot += x; add(a, m, x, d * 24 + R.uniform(0, 20))
            add(m, bank, tot * .97, d * 24 + 23.5)
    for p in payroll:
        staff = R.sample(normal, 40)
        for mth in (0, 1):
            for a in staff: add(p, a, R.uniform(900, 3000), mth * 15 * 24 + R.uniform(0, 3))
    rings = []
    for k in range(8 if not hard else 12):
        t0 = R.uniform(0, (days - 5) * 24)
        victims = R.sample(normal, R.randint(3, 6))
        col = A("mule"); layers = [A("mule") for _ in range(R.randint(2, 3))]; cash = A("mule")
        lo, hi = (1, 6) if not hard else (4, 60)
        fee = (.03, .05) if not hard else (.05, .22)
        members = [col] + layers + [cash]
        got = 0
        for v in victims:
            x = R.uniform(200, 2500); got += x; add(v, col, x, t0 + R.uniform(0, 8))
        tl = t0 + 10
        share = [R.random() + .3 for _ in layers]; s = sum(share)
        for l, w in zip(layers, share):
            x = got * w / s * (1 - R.uniform(*fee)); t1 = tl + R.uniform(lo, hi); add(col, l, x, t1)
            y = x * (1 - R.uniform(*fee)); t2 = t1 + R.uniform(lo, hi); add(l, cash, y, t2)
        out = got * .7
        add(cash, bank, out, t0 + 10 + hi * 2 + R.uniform(lo, hi))
        if hard:
            for m in members:  # camouflage: some ordinary spending and receiving
                for _ in range(R.randint(2, 8)):
                    b = R.choice(normal); add(m, b, math.exp(R.gauss(3.2, .9)), R.uniform(0, days * 24)); add(R.choice(normal), m, math.exp(R.gauss(3.2, .9)), R.uniform(0, days * 24))
        rings.append(members)
    tx.sort(key=lambda r: r[3])
    return {"accounts": acc, "tx": tx, "rings": rings}
json.dump({"easy": make(11, False), "hard": make(29, True)}, open("docs/data.json", "w"), separators=(",", ":"))
d = json.load(open("docs/data.json"))
for k, v in d.items(): print(k, len(v["accounts"]), "accounts", len(v["tx"]), "tx", len(v["rings"]), "rings")
