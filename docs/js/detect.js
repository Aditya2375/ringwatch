"use strict";
// Pass-through ring detector. Input: transactions [from, to, amount, hour]. Uses no labels.
const PARAMS = { windowH: 48, minIn: 300, minForward: 0.6, maxDays80: 3, minRing: 2 };
function detect(tx, P = PARAMS) {
  const acc = new Map();
  const get = (id) => { let a = acc.get(id); if (!a) { a = { id, ins: [], outs: [], daily: new Map(), tot: 0 }; acc.set(id, a); } return a; };
  for (const [f, t, amt, h] of tx) {
    const day = Math.floor(h / 24);
    const A = get(f), B = get(t);
    A.outs.push([h, amt, t]); B.ins.push([h, amt, f]);
    A.daily.set(day, (A.daily.get(day) || 0) + amt); B.daily.set(day, (B.daily.get(day) || 0) + amt);
    A.tot += amt; B.tot += amt;
  }
  const flagged = new Map();
  for (const a of acc.values()) {
    const totalIn = a.ins.reduce((s, x) => s + x[1], 0);
    if (totalIn < P.minIn || !a.outs.length) continue;
    // FIFO: each outflow consumes inflows received in the previous windowH hours
    const ins = a.ins.slice().sort((x, y) => x[0] - y[0]).map((x) => ({ h: x[0], left: x[1] }));
    let fwd = 0, i = 0;
    for (const o of a.outs.slice().sort((x, y) => x[0] - y[0])) {
      let need = o[1];
      for (let k = 0; k < ins.length && need > 0; k++) {
        const q = ins[k];
        if (q.h > o[0] || o[0] - q.h > P.windowH || q.left <= 0) continue;
        const take = Math.min(q.left, need); q.left -= take; need -= take; fwd += take;
      }
    }
    const f = Math.min(1, fwd / totalIn);
    // number of days that carry 80% of the account's money movement
    const vols = [...a.daily.values()].sort((x, y) => y - x);
    let c = 0, d = 0; for (const v of vols) { c += v; d++; if (c >= 0.8 * a.tot) break; }
    if (f >= P.minForward && d <= P.maxDays80) flagged.set(a.id, { id: a.id, totalIn, forwarded: fwd, f, days80: d, senders: new Set(a.ins.map((x) => x[2])).size });
  }
  // rings: connected components of flagged accounts joined by a direct payment
  const adj = new Map([...flagged.keys()].map((k) => [k, new Set()]));
  for (const [f, t] of tx) if (flagged.has(f) && flagged.has(t) && f !== t) { adj.get(f).add(t); adj.get(t).add(f); }
  const seen = new Set(), rings = [];
  for (const k of flagged.keys()) {
    if (seen.has(k)) continue;
    const comp = [], st = [k]; seen.add(k);
    while (st.length) { const x = st.pop(); comp.push(x); for (const y of adj.get(x)) if (!seen.has(y)) { seen.add(y); st.push(y); } }
    if (comp.length < P.minRing) continue;
    const set = new Set(comp);
    const feeders = new Set(), edges = [];
    for (const [f, t, amt, h] of tx) {
      if (set.has(t) && !set.has(f)) feeders.add(f);
      if (set.has(f) || set.has(t)) edges.push([f, t, amt, h]);
    }
    const through = comp.reduce((s, id) => s + flagged.get(id).forwarded, 0);
    rings.push({ members: comp, feeders: [...feeders], through, edges, score: through * comp.length });
  }
  rings.sort((a, b) => b.score - a.score);
  return { flagged, rings };
}
if (typeof module !== "undefined") module.exports = { detect, PARAMS };
