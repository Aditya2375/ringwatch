"use strict";
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
const sv = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
const money = (x) => "$" + Math.round(x).toLocaleString("en-US");
let D, M, mode = "easy";
function drawRing(r, d) {
  const mem = new Set(r.members), planted = new Set(d.rings.flat());
  const first = {}; for (const [f, t, a, h] of r.edges) if (mem.has(t) && !(t in first)) first[t] = h;
  const order = r.members.slice().sort((a, b) => (first[a] ?? 1e9) - (first[b] ?? 1e9));
  // layers by hop depth from the first-funded account
  const depth = {}; const start = order[0]; depth[start] = 0;
  for (let i = 0; i < 6; i++) for (const [f, t] of r.edges) if (f in depth && mem.has(t) && !(t in depth)) depth[t] = depth[f] + 1;
  for (const m of order) if (!(m in depth)) depth[m] = 0;
  const cols = {}; for (const m of order) (cols[depth[m]] = cols[depth[m]] || []).push(m);
  const nc = Math.max(...Object.values(depth)) + 2, W = 560, H = 190, pos = {};
  const fe = r.feeders.slice(0, 6);
  fe.forEach((f, i) => { pos[f] = [30, 20 + (i + .5) * (H - 40) / fe.length]; });
  for (const [c, list] of Object.entries(cols)) list.forEach((m, i) => { pos[m] = [30 + (+c + 1) * (W - 60) / (nc - 1), 20 + (i + .5) * (H - 40) / list.length]; });
  const s = sv("svg", { viewBox: "0 0 " + W + " " + H, class: "ring-svg", role: "img", "aria-label": "Payment flow through a flagged ring" });
  const defs = sv("defs", {}); const mk = sv("marker", { id: "ar", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto" }); mk.append(sv("path", { d: "M0 0L8 4L0 8z", fill: "#7d8aa6" })); defs.append(mk); s.append(defs);
  const seen = new Set();
  for (const [f, t, a] of r.edges) { if (!pos[f] || !pos[t] || f === t) continue; if (!mem.has(t) && fe.indexOf(f) < 0) continue; if (!mem.has(f) && !mem.has(t)) continue; const key = f + t; if (seen.has(key)) continue; seen.add(key); if (!mem.has(f) && fe.indexOf(f) < 0) continue; s.append(sv("line", { x1: pos[f][0], y1: pos[f][1], x2: pos[t][0], y2: pos[t][1], class: "edge", "marker-end": "url(#ar)" })); }
  for (const f of fe) s.append(sv("circle", { cx: pos[f][0], cy: pos[f][1], r: 6, class: "n victim" }));
  for (const m of order) { const c = sv("circle", { cx: pos[m][0], cy: pos[m][1], r: 9, class: "n " + (planted.has(m) ? "hit" : "miss") }); const tt = sv("title", {}); tt.textContent = m + (planted.has(m) ? " (planted mule)" : " (not a planted mule)"); c.append(tt); s.append(c); }
  return s;
}
function run() {
  const d = D[mode], { flagged, rings } = detect(d.tx), m = M[mode];
  $("setinfo").textContent = d.accounts ? Object.keys(d.accounts).length + " accounts, " + d.tx.length.toLocaleString("en-US") + " payments over 30 days, " + d.rings.length + " planted rings (" + m.plantedMules + " mule accounts)." : "";
  const st = $("stats"); st.textContent = "";
  for (const [k, v] of [["Accounts flagged", flagged.size], ["Rings reported", rings.length], ["Planted rings found", m.ringsFound + " of " + m.plantedRings], ["Mules caught", Math.round(m.recall * 100) + "%"]]) { const b = el("div", "stat"); b.append(el("b", "", v), el("span", "", k)); st.append(b); }
  const kn = $("knobs"); kn.textContent = "";
  kn.append(el("p", "fine", "Thresholds: window " + PARAMS.windowH + " h, inflow ≥ " + PARAMS.minIn + ", forward ≥ " + PARAMS.minForward + ", burst ≤ " + PARAMS.maxDays80 + " days."));
  const lg = el("p", "legend"); for (const [c, t] of [["hit", "planted mule"], ["miss", "flagged, not planted"], ["victim", "likely victim"]]) { lg.append(el("span", "dot " + c, "●"), document.createTextNode(" " + t + "  ")); } kn.append(lg);
  const box = $("rings"); box.textContent = "";
  rings.forEach((r, i) => {
    const c = el("article", "ringcard"); const h = el("div", "rh"); h.append(el("h3", "", "Ring " + (i + 1)), el("span", "", r.members.length + " accounts · " + money(r.through) + " passed through · " + r.feeders.length + " senders in"));
    c.append(h, drawRing(r, d)); box.append(c);
  });
  if (!rings.length) box.append(el("p", "fine", "No rings reported."));
}
function drawScore() {
  const t = $("score-t"); t.textContent = "";
  const rows = [["", "Easy set", "Hard set"], ["Mule accounts planted", "plantedMules"], ["Accounts flagged", "flagged"], ["Correct flags (precision)", "p"], ["Mules caught (recall)", "r"], ["Rings found", "rf"], ["Wrong flags by type", "fk"]];
  const hd = el("tr"); for (const x of rows[0]) hd.append(el("th", "", x)); const th = el("thead"); th.append(hd); t.append(th);
  const tb = el("tbody");
  for (const [lab, k] of rows.slice(1)) { const tr = el("tr"); tr.append(el("th", "", lab)); for (const md of ["easy", "hard"]) { const m = M[md]; let v; if (k === "p") v = (m.precision * 100).toFixed(0) + "% (" + m.truePositive + " of " + m.flagged + ")"; else if (k === "r") v = (m.recall * 100).toFixed(0) + "% (" + m.truePositive + " of " + m.plantedMules + ")"; else if (k === "rf") v = m.ringsFound + " of " + m.plantedRings; else if (k === "fk") v = Object.keys(m.falsePositiveKinds).length ? Object.entries(m.falsePositiveKinds).map(([a, b]) => b + " " + a).join(", ") : "none"; else v = m[k]; tr.append(el("td", "", v)); } tb.append(tr); }
  t.append(tb);
  const ul = $("notes"); ul.textContent = "";
  for (const x of ["Easy set: short delays, 3 to 5% fees, 6 merchants.", "Hard set: delays up to 60 hours, fees up to 22%, camouflage spending by mules, 14 merchants, 12 rings."]) ul.append(el("li", "", x));
}
function setMode(m) { mode = m; $("bEasy").className = m === "easy" ? "on" : ""; $("bHard").className = m === "hard" ? "on" : ""; $("bEasy").setAttribute("aria-pressed", m === "easy"); $("bHard").setAttribute("aria-pressed", m === "hard"); run(); }
Promise.all([fetch("data.json").then((r) => r.json()), fetch("metrics.json").then((r) => r.json())]).then(([d, m]) => { D = d; M = m; drawScore(); setMode("easy"); $("bEasy").addEventListener("click", () => setMode("easy")); $("bHard").addEventListener("click", () => setMode("hard")); }).catch(() => { $("setinfo").textContent = "Could not load data."; });
