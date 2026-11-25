const { detect } = require("../docs/js/detect.js");
const D = require("../docs/data.json");
const res = {};
for (const [mode, d] of Object.entries(D)) {
  const { flagged, rings } = detect(d.tx);
  const mules = new Set(d.rings.flat());
  const fl = [...flagged.keys()];
  const tp = fl.filter((x) => mules.has(x)).length;
  const kinds = {}; for (const x of fl) if (!mules.has(x)) kinds[d.accounts[x]] = (kinds[d.accounts[x]] || 0) + 1;
  let found = 0, pure = 0;
  for (const planted of d.rings) {
    const ps = new Set(planted);
    const hit = rings.find((r) => r.members.filter((m) => ps.has(m)).length >= 3 && r.members.filter((m) => ps.has(m)).length / r.members.length >= 0.7);
    if (hit) found++;
  }
  res[mode] = { accounts: Object.keys(d.accounts).length, tx: d.tx.length, plantedRings: d.rings.length, plantedMules: mules.size, flagged: fl.length, truePositive: tp, precision: +(tp / fl.length).toFixed(3), recall: +(tp / mules.size).toFixed(3), ringsFound: found, falsePositiveKinds: kinds, ringsReported: rings.length };
}
console.log(JSON.stringify(res, null, 1));
require("fs").writeFileSync("docs/metrics.json", JSON.stringify(res));
