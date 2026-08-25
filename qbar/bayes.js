const field = document.getElementById('field');
const predictive = document.getElementById('predictive');
const qbarCanvas = document.getElementById('qbar');
const fctx = field.getContext('2d');
const pctx = predictive.getContext('2d');
const qctx = qbarCanvas.getContext('2d');

const ui = {
  mode: document.getElementById('mode'),
  modeInfo: document.getElementById('modeInfo'),
  fieldViews: document.getElementById('fieldViews'),
  mu0: document.getElementById('mu0'),
  tau: document.getElementById('tau'),
  s0: document.getElementById('s0'),
  ssd: document.getElementById('ssd'),
  mu0v: document.getElementById('mu0v'),
  tauv: document.getElementById('tauv'),
  s0v: document.getElementById('s0v'),
  ssdv: document.getElementById('ssdv'),
  undo: document.getElementById('undo'),
  reset: document.getElementById('reset'),
  obs: document.getElementById('obs'),
  modeMs: document.getElementById('modeMs'),
  refMs: document.getElementById('refMs'),
  posteriorKl: document.getElementById('posteriorKl'),
  predictiveKl: document.getElementById('predictiveKl'),
};

const TAU = 2 * Math.PI;
const LOG_TAU = Math.log(TAU);
const CFG = {
  uMin: -6,
  uMax: 6,
  sMin: -3,
  sMax: 2,
  nx: 180,
  ny: 140,
  xMin: -6,
  xMax: 6,
  metricBins: 220,
};
const G = CFG.nx * CFG.ny;
const fieldMargin = { l: 52, r: 18, t: 20, b: 38 };
const predMargin = { l: 46, r: 18, t: 15, b: 30 };

const state = {
  observations: [],
  n: 0,
  sum: 0,
  sum2: 0,
  fieldView: 'selected',
  reference: null,
  selected: null,
  dirty: true,
};

const uGrid = new Float64Array(G);
const sGrid = new Float64Array(G);
const vGrid = new Float64Array(G);
const invVGrid = new Float64Array(G);
const priorLog = new Float64Array(G);
const lastLikeLog = new Float64Array(G);

for (let j = 0; j < CFG.ny; j++) {
  const s = CFG.sMax - (j + 0.5) * (CFG.sMax - CFG.sMin) / CFG.ny;
  const v = Math.exp(s);
  for (let i = 0; i < CFG.nx; i++) {
    const k = j * CFG.nx + i;
    uGrid[k] = CFG.uMin + (i + 0.5) * (CFG.uMax - CFG.uMin) / CFG.nx;
    sGrid[k] = s;
    vGrid[k] = v;
    invVGrid[k] = 1 / v;
  }
}

const offscreen = document.createElement('canvas');
offscreen.width = CFG.nx;
offscreen.height = CFG.ny;
const offctx = offscreen.getContext('2d');
const heatImage = offctx.createImageData(CFG.nx, CFG.ny);

function priorParams() {
  return {
    mu0: +ui.mu0.value,
    tau: +ui.tau.value,
    s0: +ui.s0.value,
    ssd: +ui.ssd.value,
  };
}

function logNormal(x, mean, sd) {
  const z = (x - mean) / sd;
  return -Math.log(sd) - 0.5 * LOG_TAU - 0.5 * z * z;
}

function logPosteriorPoint(u, s) {
  const { mu0, tau, s0, ssd } = priorParams();
  const v = Math.exp(s);
  const ssr = state.sum2 - 2 * u * state.sum + state.n * u * u;
  return logNormal(u, mu0, tau) + logNormal(s, s0, ssd)
    - 0.5 * state.n * (LOG_TAU + s) - 0.5 * ssr / v;
}

function rebuildCommonFields() {
  const { mu0, tau, s0, ssd } = priorParams();
  const has = state.n > 0;
  const last = has ? state.observations[state.n - 1] : 0;
  for (let k = 0; k < G; k++) {
    const u = uGrid[k], s = sGrid[k];
    priorLog[k] = logNormal(u, mu0, tau) + logNormal(s, s0, ssd);
    if (has) {
      const d = last - u;
      lastLikeLog[k] = -0.5 * (LOG_TAU + s) - 0.5 * d * d * invVGrid[k];
    } else {
      lastLikeLog[k] = 0;
    }
  }
}

function normalizeLogWeights(logw) {
  let max = -Infinity;
  for (let k = 0; k < logw.length; k++) if (logw[k] > max) max = logw[k];
  const w = new Float64Array(logw.length);
  let z = 0;
  for (let k = 0; k < logw.length; k++) {
    const x = Math.exp(logw[k] - max);
    w[k] = x;
    z += x;
  }
  const inv = 1 / z;
  for (let k = 0; k < w.length; k++) w[k] *= inv;
  return w;
}

function referenceGrid() {
  const t0 = performance.now();
  const { mu0, tau, s0, ssd } = priorParams();
  const logw = new Float64Array(G);
  let mapIndex = 0, max = -Infinity;
  for (let k = 0; k < G; k++) {
    const u = uGrid[k], s = sGrid[k], v = vGrid[k];
    let lp = logNormal(u, mu0, tau) + logNormal(s, s0, ssd);
    for (let i = 0; i < state.observations.length; i++) {
      const d = state.observations[i] - u;
      lp += -0.5 * (LOG_TAU + s) - 0.5 * d * d / v;
    }
    logw[k] = lp;
    if (lp > max) { max = lp; mapIndex = k; }
  }
  const weights = normalizeLogWeights(logw);
  return {
    kind: 'grid', weights, logw, mapIndex,
    computeMs: performance.now() - t0,
    exact: true,
    stateLabel: `${G.toLocaleString()} cells + full history`,
  };
}

function sufficientGrid() {
  const t0 = performance.now();
  const logw = new Float64Array(G);
  let mapIndex = 0, max = -Infinity;
  for (let k = 0; k < G; k++) {
    const u = uGrid[k], s = sGrid[k];
    const ssr = state.sum2 - 2 * u * state.sum + state.n * u * u;
    const lp = priorLog[k] - 0.5 * state.n * (LOG_TAU + s) - 0.5 * ssr * invVGrid[k];
    logw[k] = lp;
    if (lp > max) { max = lp; mapIndex = k; }
  }
  const weights = normalizeLogWeights(logw);
  return {
    kind: 'grid', weights, logw, mapIndex,
    computeMs: performance.now() - t0,
    exact: true,
    stateLabel: `${G.toLocaleString()} cells + (n, Σx, Σx²)`,
  };
}

function analyticU() {
  const t0 = performance.now();
  const { mu0, tau, s0, ssd } = priorParams();
  const tau2 = tau * tau;
  const priorPrec = 1 / tau2;
  const sWeights = new Float64Array(CFG.ny);
  const means = new Float64Array(CFG.ny);
  const vars = new Float64Array(CFG.ny);
  const logm = new Float64Array(CFG.ny);
  let max = -Infinity;

  for (let j = 0; j < CFG.ny; j++) {
    const k = j * CFG.nx;
    const s = sGrid[k], v = vGrid[k], iv = invVGrid[k];
    const A = priorPrec + state.n * iv;
    const B = mu0 * priorPrec + state.sum * iv;
    const C = mu0 * mu0 * priorPrec + state.sum2 * iv;
    means[j] = B / A;
    vars[j] = 1 / A;
    const lm = logNormal(s, s0, ssd)
      - 0.5 * state.n * (LOG_TAU + s)
      - 0.5 * Math.log(tau2)
      - 0.5 * Math.log(A)
      - 0.5 * (C - B * B / A);
    logm[j] = lm;
    if (lm > max) max = lm;
  }
  let z = 0;
  for (let j = 0; j < CFG.ny; j++) { const w = Math.exp(logm[j] - max); sWeights[j] = w; z += w; }
  for (let j = 0; j < CFG.ny; j++) sWeights[j] /= z;

  return {
    kind: 'analytic', sWeights, means, vars,
    computeMs: performance.now() - t0,
    exact: true,
    stateLabel: `${CFG.ny} log-v weights + closed-form u|v`,
  };
}

function gradientAndNegHessian(u, s) {
  const { mu0, tau, s0, ssd } = priorParams();
  const tau2 = tau * tau, ssd2 = ssd * ssd;
  const iv = Math.exp(-s);
  const ssr = state.sum2 - 2 * u * state.sum + state.n * u * u;
  const gu = -(u - mu0) / tau2 + (state.sum - state.n * u) * iv;
  const gs = -(s - s0) / ssd2 - 0.5 * state.n + 0.5 * ssr * iv;
  const a = 1 / tau2 + state.n * iv;
  const b = (state.sum - state.n * u) * iv;
  const c = 1 / ssd2 + 0.5 * ssr * iv;
  return { gu, gs, a, b, c };
}

function refinedMap() {
  const seed = state.reference.mapIndex;
  let u = uGrid[seed], s = sGrid[seed], lp = logPosteriorPoint(u, s);
  for (let iter = 0; iter < 12; iter++) {
    const { gu, gs, a, b, c } = gradientAndNegHessian(u, s);
    const det = a * c - b * b;
    if (!(det > 1e-12)) break;
    let du = (c * gu - b * gs) / det;
    let ds = (-b * gu + a * gs) / det;
    if (Math.hypot(du, ds) < 1e-8) break;
    let step = 1;
    let accepted = false;
    for (let ls = 0; ls < 12; ls++) {
      const nu = Math.max(CFG.uMin, Math.min(CFG.uMax, u + step * du));
      const ns = Math.max(CFG.sMin, Math.min(CFG.sMax, s + step * ds));
      const nlp = logPosteriorPoint(nu, ns);
      if (nlp >= lp) { u = nu; s = ns; lp = nlp; accepted = true; break; }
      step *= 0.5;
    }
    if (!accepted) break;
  }
  return { u, s };
}

function laplace(diagonal) {
  const t0 = performance.now();
  const mode = refinedMap();
  const H = gradientAndNegHessian(mode.u, mode.s);
  let a = H.a, b = diagonal ? 0 : H.b, c = H.c;
  const det = a * c - b * b;
  const covUU = c / det;
  const covUS = -b / det;
  const covSS = a / det;
  return {
    kind: diagonal ? 'diag' : 'laplace',
    meanU: mode.u, meanS: mode.s,
    a, b, c, covUU, covUS, covSS,
    computeMs: performance.now() - t0,
    exact: false,
    stateLabel: diagonal ? '2 means + 2 variances' : '2 means + 3 covariance terms',
  };
}

function weightsForRepresentation(rep) {
  if (rep.kind === 'grid') return rep.weights;
  if (rep.kind === 'analytic') return state.reference.weights;
  const logw = new Float64Array(G);
  for (let k = 0; k < G; k++) {
    const du = uGrid[k] - rep.meanU;
    const ds = sGrid[k] - rep.meanS;
    logw[k] = -0.5 * (rep.a * du * du + 2 * rep.b * du * ds + rep.c * ds * ds);
  }
  return normalizeLogWeights(logw);
}

function buildSelected() {
  switch (ui.mode.value) {
    case 'reference': return state.reference;
    case 'sufficient': return sufficientGrid();
    case 'analytic': return analyticU();
    case 'laplace': return laplace(false);
    case 'diag': return laplace(true);
    default: return sufficientGrid();
  }
}

function gaussianPdf(x, mean, variance) {
  const d = x - mean;
  return Math.exp(-0.5 * (LOG_TAU + Math.log(variance) + d * d / variance));
}

function predictivePdf(rep, x) {
  if (rep.kind === 'grid') {
    let y = 0;
    const w = rep.weights;
    for (let k = 0; k < G; k++) y += w[k] * gaussianPdf(x, uGrid[k], vGrid[k]);
    return y;
  }
  if (rep.kind === 'analytic') {
    let y = 0;
    for (let j = 0; j < CFG.ny; j++) {
      const v = vGrid[j * CFG.nx];
      y += rep.sWeights[j] * gaussianPdf(x, rep.means[j], v + rep.vars[j]);
    }
    return y;
  }
  const varS = rep.covSS;
  const condVarU = Math.max(1e-10, rep.covUU - rep.covUS * rep.covUS / varS);
  let z = 0, y = 0;
  for (let j = 0; j < CFG.ny; j++) {
    const s = sGrid[j * CFG.nx];
    const ws = Math.exp(-0.5 * (s - rep.meanS) * (s - rep.meanS) / varS);
    const mu = rep.meanU + (rep.covUS / varS) * (s - rep.meanS);
    y += ws * gaussianPdf(x, mu, Math.exp(s) + condVarU);
    z += ws;
  }
  return y / z;
}

function sampledPredictive(rep, bins, supersample = false) {
  const xs = new Float64Array(bins);
  const ys = new Float64Array(bins);
  const dx = (CFG.xMax - CFG.xMin) / bins;
  for (let i = 0; i < bins; i++) {
    const x0 = CFG.xMin + i * dx;
    xs[i] = x0 + 0.5 * dx;
    ys[i] = supersample
      ? (predictivePdf(rep, x0 + 0.2113248654 * dx) + predictivePdf(rep, x0 + 0.5 * dx) + predictivePdf(rep, x0 + 0.7886751346 * dx)) / 3
      : predictivePdf(rep, xs[i]);
  }
  return { xs, ys, dx };
}

function normalizeDensitySample(sample) {
  let z = 0;
  for (let i = 0; i < sample.ys.length; i++) z += sample.ys[i] * sample.dx;
  const ys = new Float64Array(sample.ys.length);
  for (let i = 0; i < ys.length; i++) ys[i] = sample.ys[i] / z;
  return { xs: sample.xs, ys, dx: sample.dx };
}

function discreteKl(p, q) {
  let kl = 0;
  const eps = 1e-300;
  for (let i = 0; i < p.length; i++) if (p[i] > 0) kl += p[i] * Math.log((p[i] + eps) / (q[i] + eps));
  return Math.max(0, kl);
}

function densityKl(pSample, qSample) {
  const p = normalizeDensitySample(pSample);
  const q = normalizeDensitySample(qSample);
  let kl = 0;
  const eps = 1e-300;
  for (let i = 0; i < p.ys.length; i++) {
    if (p.ys[i] > 0) kl += p.ys[i] * Math.log((p.ys[i] + eps) / (q.ys[i] + eps)) * p.dx;
  }
  return Math.max(0, kl);
}

function computeAll() {
  rebuildCommonFields();
  state.reference = referenceGrid();
  state.selected = buildSelected();
  state.selected.weights = weightsForRepresentation(state.selected);

  const refMetric = sampledPredictive(state.reference, CFG.metricBins, false);
  const selectedMetric = sampledPredictive(state.selected, CFG.metricBins, false);
  state.refMetric = refMetric;
  state.selectedMetric = selectedMetric;
  state.posteriorKl = discreteKl(state.reference.weights, state.selected.weights);
  state.predictiveKl = densityKl(refMetric, selectedMetric);
  state.dirty = false;
}

const modeDescriptions = {
  reference: {
    exact: true,
    cost: 'update O(G·n), predictive O(G·X)',
    trade: 'No algebraic compression. Intentionally dumb baseline; only the grid itself is numerical.',
  },
  sufficient: {
    exact: true,
    cost: 'update O(G), predictive O(G·X)',
    trade: 'Stores n, Σx, Σx² instead of replaying history. Same posterior, less work.',
  },
  analytic: {
    exact: true,
    cost: 'update O(S), predictive O(S·X)',
    trade: 'Integrates u out analytically. Only the 1-D log-v quadrature remains numerical.',
  },
  laplace: {
    exact: false,
    cost: 'roughly O(1) inference + O(S·X) predictive',
    trade: 'Replaces the weird posterior field with one tilted Gaussian: loses skew, tails, curvature changes and multimodality.',
  },
  diag: {
    exact: false,
    cost: 'roughly O(1) inference + O(S·X) predictive',
    trade: 'Laplace, then deletes u↔log-v covariance too. Cheapest representation here, but it destroys the visible funnel dependence.',
  },
};

function updateModeInfo() {
  const d = modeDescriptions[ui.mode.value];
  const rep = state.selected;
  ui.modeInfo.innerHTML = `<span class="badge ${d.exact ? 'exact' : 'approx'}">${d.exact ? 'exact reformulation' : 'approximation'}</span><br><strong>${d.cost}</strong><br>${d.trade}<br><br><strong>representation:</strong> ${rep ? rep.stateLabel : '—'}`;
}

function heatColor(kind, t) {
  t = Math.pow(Math.max(0, Math.min(1, t)), 0.55);
  let lo = [23, 23, 23], hi;
  if (kind === 'prior') hi = [154, 154, 146];
  else if (kind === 'likelihood') hi = [240, 161, 90];
  else if (kind === 'error') hi = [232, 93, 135];
  else hi = [93, 143, 255];
  return [
    Math.round(lo[0] + (hi[0] - lo[0]) * t),
    Math.round(lo[1] + (hi[1] - lo[1]) * t),
    Math.round(lo[2] + (hi[2] - lo[2]) * t),
  ];
}

function drawField() {
  const view = state.fieldView;
  let values, kind = view;
  if (view === 'selected') values = state.selected.weights;
  else if (view === 'reference') values = state.reference.weights;
  else if (view === 'prior') values = normalizeLogWeights(priorLog);
  else if (view === 'likelihood') values = state.n ? normalizeLogWeights(lastLikeLog) : new Float64Array(G);
  else {
    values = new Float64Array(G);
    const eps = 1e-300;
    let maxErr = 0;
    for (let k = 0; k < G; k++) {
      const e = Math.abs(Math.log(state.reference.weights[k] + eps) - Math.log(state.selected.weights[k] + eps));
      values[k] = Math.min(12, e);
      if (values[k] > maxErr) maxErr = values[k];
    }
    if (maxErr > 0) for (let k = 0; k < G; k++) values[k] /= maxErr;
    kind = 'error';
  }

  let max = 0;
  for (let k = 0; k < values.length; k++) if (values[k] > max) max = values[k];
  const inv = max ? 1 / max : 0;
  const data = heatImage.data;
  for (let k = 0, p = 0; k < G; k++, p += 4) {
    const c = heatColor(kind, values[k] * inv);
    data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
  }
  offctx.putImageData(heatImage, 0, 0);

  const W = field.width, H = field.height;
  const pw = W - fieldMargin.l - fieldMargin.r;
  const ph = H - fieldMargin.t - fieldMargin.b;
  fctx.clearRect(0, 0, W, H);
  fctx.imageSmoothingEnabled = true;
  fctx.drawImage(offscreen, fieldMargin.l, fieldMargin.t, pw, ph);
  fctx.strokeStyle = '#303030'; fctx.fillStyle = '#aaa'; fctx.lineWidth = 1; fctx.font = '11px system-ui';
  for (let x = -6; x <= 6; x += 2) {
    const px = fieldMargin.l + (x - CFG.uMin) / (CFG.uMax - CFG.uMin) * pw;
    fctx.beginPath(); fctx.moveTo(px, fieldMargin.t); fctx.lineTo(px, fieldMargin.t + ph); fctx.stroke();
    fctx.textAlign = 'center'; fctx.fillText(String(x), px, H - 12);
  }
  for (let s = -3; s <= 2; s++) {
    const py = fieldMargin.t + (CFG.sMax - s) / (CFG.sMax - CFG.sMin) * ph;
    fctx.beginPath(); fctx.moveTo(fieldMargin.l, py); fctx.lineTo(fieldMargin.l + pw, py); fctx.stroke();
    fctx.textAlign = 'right'; fctx.fillText(String(s), fieldMargin.l - 8, py + 4);
  }
  fctx.textAlign = 'center'; fctx.fillText('u', fieldMargin.l + pw / 2, H - 1);
  fctx.save(); fctx.translate(13, fieldMargin.t + ph / 2); fctx.rotate(-Math.PI / 2); fctx.fillText('log v', 0, 0); fctx.restore();
}

function drawPredictive() {
  const W = predictive.width, H = predictive.height;
  const pw = W - predMargin.l - predMargin.r;
  const ph = H - predMargin.t - predMargin.b;
  const bins = Math.max(200, Math.floor(pw));
  const ref = sampledPredictive(state.reference, bins, false);
  const selected = sampledPredictive(state.selected, bins, true);
  state.selectedDisplay = selected;
  state.referenceDisplay = ref;

  let ymax = 0;
  for (let i = 0; i < bins; i++) ymax = Math.max(ymax, ref.ys[i], selected.ys[i]);
  ymax = ymax * 1.12 || 1;

  pctx.clearRect(0, 0, W, H);
  pctx.strokeStyle = '#303030'; pctx.fillStyle = '#aaa'; pctx.lineWidth = 1; pctx.font = '11px system-ui';
  for (let x = -6; x <= 6; x += 2) {
    const px = predMargin.l + (x - CFG.xMin) / (CFG.xMax - CFG.xMin) * pw;
    pctx.beginPath(); pctx.moveTo(px, predMargin.t); pctx.lineTo(px, predMargin.t + ph); pctx.stroke();
    pctx.textAlign = 'center'; pctx.fillText(String(x), px, H - 9);
  }

  function strokeSample(sample, color, width) {
    pctx.beginPath();
    for (let i = 0; i < sample.ys.length; i++) {
      const x = predMargin.l + (i + 0.5) / sample.ys.length * pw;
      const y = predMargin.t + ph - sample.ys[i] / ymax * ph;
      if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
    }
    pctx.strokeStyle = color; pctx.lineWidth = width; pctx.stroke();
  }
  strokeSample(ref, 'rgba(210,210,210,.35)', 2);
  strokeSample(selected, '#78a6ff', 3);

  for (const x of state.observations) {
    const px = predMargin.l + (x - CFG.xMin) / (CFG.xMax - CFG.xMin) * pw;
    pctx.beginPath(); pctx.moveTo(px, predMargin.t); pctx.lineTo(px, predMargin.t + ph);
    pctx.strokeStyle = 'rgba(240,161,90,.38)'; pctx.lineWidth = 1.2; pctx.stroke();
  }
  pctx.fillStyle = '#aaa'; pctx.textAlign = 'center'; pctx.fillText('x', predMargin.l + pw / 2, H - 1);
}

class NumericalDistribution {
  constructor(sample) {
    const norm = normalizeDensitySample(sample);
    this.xs = norm.xs;
    this.ys = norm.ys;
    this.dx = norm.dx;
    this.cdf = new Float64Array(this.xs.length);
    let c = 0;
    for (let i = 0; i < this.xs.length; i++) {
      c += this.ys[i] * this.dx;
      this.cdf[i] = c;
    }
    this.cdf[this.cdf.length - 1] = 1;
  }
  pdf(x) {
    if (x <= this.xs[0]) return this.ys[0];
    const n = this.xs.length;
    if (x >= this.xs[n - 1]) return this.ys[n - 1];
    const p = (x - this.xs[0]) / (this.xs[n - 1] - this.xs[0]) * (n - 1);
    const i = Math.floor(p), t = p - i;
    return this.ys[i] * (1 - t) + this.ys[i + 1] * t;
  }
  icdf(p) {
    if (p <= 0) return this.xs[0];
    if (p >= 1) return this.xs[this.xs.length - 1];
    let lo = 0, hi = this.cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cdf[mid] < p) lo = mid + 1; else hi = mid;
    }
    const i = lo;
    if (i === 0) return this.xs[0];
    const c0 = this.cdf[i - 1], c1 = this.cdf[i];
    const t = c1 > c0 ? (p - c0) / (c1 - c0) : 0;
    return this.xs[i - 1] * (1 - t) + this.xs[i] * t;
  }
  qdf(p) {
    const x = this.icdf(p);
    const y = this.pdf(x);
    return y > 1e-12 ? 1 / y : Infinity;
  }
}

function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x <= edge0 ? 0 : 1;
  x = Math.max(0, Math.min(edge1, x) - edge0) / (edge1 - edge0);
  return x * x * (3 - 2 * x);
}

function findBiggestNiceStep(start, end) {
  const maxVal = Math.max(Math.abs(start), Math.abs(end));
  if (!isFinite(maxVal)) return { expon: Infinity, mant: 1 };
  let expon = Math.floor(Math.log10(Math.max(maxVal, 1e-300)));
  const multipliers = [5, 1];
  const step = 10 ** expon;
  start /= step; end /= step;
  while (start < end) {
    for (const mant of multipliers) if (Math.ceil(start / mant) < end / mant) return { expon, mant };
    expon--; start *= 10; end *= 10;
  }
  return { expon, mant: 1 };
}

function formatSci({ mant, expon }) {
  const value = mant * 10 ** expon;
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e-3 && Math.abs(value) < 1e4) return Number(value.toPrecision(4)).toString();
  return value.toExponential(2);
}

function generateTicks(dist, n) {
  const ticks = [];
  let prev = dist.icdf(0);
  for (let idx = 1; idx <= n; idx++) {
    const p = idx / n;
    const next = dist.icdf(p);
    if (prev === next) continue;
    const { expon, mant } = findBiggestNiceStep(prev, next);
    if (!isFinite(expon)) { prev = next; continue; }
    const ik = 10 ** -expon / mant;
    const tick = { mant: Math.floor(next * ik) * mant, expon, p, inv_density: dist.qdf(p) * ik };
    if (prev < 0 && next >= 0) { tick.mant = 0; tick.expon = 0; tick.inv_density = 0; }
    ticks.push(tick); prev = next;
  }
  return ticks;
}

function drawTickRow(ctx, dist, label, y, color, width) {
  ctx.fillStyle = color; ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, 8, y - 13);
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
  const ticks = generateTicks(dist, Math.max(180, width * 2));
  for (const tick of ticks) {
    const opacity = smoothstep(72, 145, width / tick.inv_density);
    if (opacity * 255 <= 2) continue;
    const x = tick.p * (width - 1);
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.strokeStyle = color.replace('1)', `${opacity})`); ctx.stroke();
    if (opacity > 0.55) {
      ctx.save(); ctx.fillStyle = color.replace('1)', `${opacity})`); ctx.translate(x, y + 10); ctx.rotate(Math.PI / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(formatSci(tick), 0, 0); ctx.restore();
    }
  }
}

function drawQBar() {
  const W = qbarCanvas.width, H = qbarCanvas.height;
  qctx.clearRect(0, 0, W, H);
  const refDist = new NumericalDistribution(state.referenceDisplay || state.refMetric);
  const selDist = new NumericalDistribution(state.selectedDisplay || state.selectedMetric);
  drawTickRow(qctx, refDist, 'Reference predictive', 45, 'rgba(205,205,205,1)', W);
  drawTickRow(qctx, selDist, 'Selected method', 100, 'rgba(120,166,255,1)', W);
}

function formatKl(x) {
  if (x < 5e-7) return '≈ 0';
  if (x < 0.001) return x.toExponential(2) + ' nat';
  return x.toFixed(4) + ' nat';
}

function updateChrome() {
  ui.mu0v.textContent = (+ui.mu0.value).toFixed(1);
  ui.tauv.textContent = (+ui.tau.value).toFixed(2);
  ui.s0v.textContent = (+ui.s0.value).toFixed(1);
  ui.ssdv.textContent = (+ui.ssd.value).toFixed(2);
  ui.undo.disabled = state.n === 0;
  ui.obs.innerHTML = state.n
    ? state.observations.map((x, i) => `<span>${i + 1}: ${x.toFixed(2)}</span>`).join('')
    : '<span class="empty">None yet.</span>';
  ui.modeMs.textContent = `${state.selected.computeMs.toFixed(3)} ms`;
  ui.refMs.textContent = `${state.reference.computeMs.toFixed(3)} ms`;
  ui.posteriorKl.textContent = formatKl(state.posteriorKl);
  ui.predictiveKl.textContent = formatKl(state.predictiveKl);
  for (const button of ui.fieldViews.querySelectorAll('button[data-view]')) button.classList.toggle('active', button.dataset.view === state.fieldView);
  updateModeInfo();
}

function render(recompute = true) {
  if (recompute || state.dirty) computeAll();
  updateChrome();
  drawField();
  drawPredictive();
  drawQBar();
}

function addObservation(x) {
  x = Math.max(CFG.xMin, Math.min(CFG.xMax, x));
  state.observations.push(x);
  state.n++;
  state.sum += x;
  state.sum2 += x * x;
  state.dirty = true;
  render(true);
}

function undoObservation() {
  if (!state.n) return;
  const x = state.observations.pop();
  state.n--;
  state.sum -= x;
  state.sum2 -= x * x;
  state.dirty = true;
  render(true);
}

function resetObservations() {
  state.observations = [];
  state.n = 0; state.sum = 0; state.sum2 = 0;
  state.dirty = true;
  render(true);
}

predictive.addEventListener('pointerdown', (e) => {
  const rect = predictive.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * predictive.width;
  const pw = predictive.width - predMargin.l - predMargin.r;
  if (px < predMargin.l || px > predictive.width - predMargin.r) return;
  const x = CFG.xMin + (px - predMargin.l) / pw * (CFG.xMax - CFG.xMin);
  addObservation(x);
});

ui.undo.addEventListener('click', undoObservation);
ui.reset.addEventListener('click', resetObservations);
ui.mode.addEventListener('change', () => { state.dirty = true; render(true); });
for (const input of [ui.mu0, ui.tau, ui.s0, ui.ssd]) {
  input.addEventListener('input', () => { state.dirty = true; render(true); });
}
ui.fieldViews.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-view]');
  if (!button) return;
  state.fieldView = button.dataset.view;
  updateChrome();
  drawField();
});

render(true);
