const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const inputs = {
  min_dist: document.getElementById("min_dist"),
  drop_off: document.getElementById("drop_off"),
};

// --- UTILITY FUNCTIONS ---
function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x <= edge0 ? 0 : 1;
  x = Math.max(0, Math.min(edge1, x) - edge0) / (edge1 - edge0);
  return x * x * (3 - 2 * x);
}

function findBiggestNiceStep(start, end) {
  const maxVal = Math.max(Math.abs(start), Math.abs(end));
  if (!isFinite(maxVal)) return { expon: Infinity, mant: 1 };
  let expon = Math.floor(Math.log10(maxVal));
  const multipliers = [5, 1];
  const start_step = 10 ** expon;
  start /= start_step;
  end /= start_step;
  while (start < end) {
    for (let mant of multipliers) {
      if (Math.ceil(start / mant) < end / mant) return { expon, mant };
    }
    expon--;
    start *= 10.0;
    end *= 10.0;
  }
  return { expon, mant: 1.0 };
}

function formatSci({ mant, expon }) {
  let s = mant.toString();
  if (expon === 0) return s;
  if (expon > 0) {
    return s + "0".repeat(expon);
  } else {
    const absExpon = Math.abs(expon);
    const sign = s.startsWith("-") ? "-" : "";
    const digits = sign ? s.slice(1) : s;
    if (absExpon < digits.length) {
      const dotIndex = digits.length - absExpon;
      return `${sign}${digits.slice(0, dotIndex)}.${digits.slice(dotIndex)}`;
    } else {
      return `${sign}0.${"0".repeat(absExpon - digits.length)}${digits}`;
    }
  }
}

// --- NUMERICAL HELPERS FOR BETA DISTRIBUTION ---
// Lanczos approximation for the log-gamma function
function log_gamma(x) {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.PI / Math.sin(Math.PI * x) - log_gamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    a += p[i] / (x + i + 1);
  }
  const t = x + p.length - 0.5;
  return (
    Math.log(Math.sqrt(2 * Math.PI)) + (x + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

// Regularized Incomplete Beta function (CDF of Beta distribution)
// Adapted from SheetJS/j-i-beta (Public Domain)
function incomplete_beta(x, a, b) {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;
  const lbeta_ab = log_gamma(a) + log_gamma(b) - log_gamma(a + b);
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta_ab);
  if (x < (a + 1) / (a + b + 2)) {
    const a_ = 1,
      b_ = a + b,
      x_ = a + 1;
    const fn = (n, x) =>
      n % 2 === 0
        ? ((n / 2) * (b - n / 2) * x) / ((a + n - 1) * (a + n))
        : -((a + (n - 1) / 2) * (a + b + (n - 1) / 2) * x) /
          ((a + n - 1) * (a + n));
    const c = Array(100)
      .fill(0)
      .map((_, i) => fn(i + 1, x));
    let C = 1,
      D = 1 / (1 - c[0] / (1 + c[1]));
    for (let j = 2; j < c.length; ++j) {
      D = 1 / (1 + c[j - 1] * D);
      C = 1 / (1 + c[j - 1] / C);
    }
    return (bt * D) / a;
  }
  const a_ = 1,
    b_ = a + b,
    x_ = b + 1;
  const fn = (n, x) =>
    n % 2 === 0
      ? ((n / 2) * (a - n / 2) * x) / ((b + n - 1) * (b + n))
      : -((b + (n - 1) / 2) * (a + b + (n - 1) / 2) * x) /
        ((b + n - 1) * (b + n));
  const c = Array(100)
    .fill(0)
    .map((_, i) => fn(i + 1, (1 - x) / x));
  let C = 1,
    D = 1 / (1 - c[0] / (1 + c[1]));
  for (let j = 2; j < c.length; ++j) {
    D = 1 / (1 + c[j - 1] * D);
    C = 1 / (1 + c[j - 1] / C);
  }
  return 1 - (bt * D * x) / b;
}

// Inverse of the Incomplete Beta function (ICDF of Beta distribution)
// Uses Newton-Raphson method.
function inverse_incomplete_beta(p, a, b) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let x = 0.5; // Initial guess
  const lbeta_ab = log_gamma(a) + log_gamma(b) - log_gamma(a + b);
  for (let i = 0; i < 20; i++) {
    // Max 20 iterations
    const pdf = Math.exp(
      (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lbeta_ab,
    );
    const err = incomplete_beta(x, a, b) - p;
    if (Math.abs(err) < 1e-9) break;
    x -= err / pdf;
    x = Math.max(1e-10, Math.min(1 - 1e-10, x));
  }
  return x;
}

// --- DISTRIBUTION CLASSES ---
// (Normal, Exponential, Uniform, Logistic from before, unchanged)
class NormalDistribution {
  constructor(mu = 0, sigma = 1) {
    this.mu = mu;
    this.sigma = sigma;
  }
  pdf(x) {
    const z = (x - this.mu) / this.sigma;
    return Math.exp(-0.5 * z * z) / (this.sigma * Math.sqrt(2 * Math.PI));
  }
  icdf(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [
      -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
    ];
    const b = [
      -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1,
    ];
    const c = [
      -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
      -2.549732539343734, 4.374664141464968, 2.938163982698783,
    ];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
      3.754408661907416,
    ];
    let z;
    if (p < 0.02425) {
      const q = Math.sqrt(-2 * Math.log(p));
      z =
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p > 0.97575) {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      z =
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else {
      const q = p - 0.5;
      const r = q * q;
      z =
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
          q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    return this.mu + z * this.sigma;
  }
  qdf(p) {
    const x = this.icdf(p);
    const z = (x - this.mu) / this.sigma;
    return (this.sigma * Math.sqrt(2 * Math.PI)) / Math.exp(-0.5 * z * z);
  }
}
class ExponentialDistribution {
  constructor(offset = 0.0, scale = 1) {
    this.offset = offset;
    this.scale = scale;
  }
  icdf(p) {
    return (
      this.offset - this.scale * Math.log(2) - Math.log(1 - p) * this.scale
    );
  }
  qdf(p) {
    return this.scale / (1 - p);
  }
}
class UniformDistribution {
  constructor(a = 0, b = 1) {
    this.a = a;
    this.b = b;
  }
  icdf(p) {
    return this.a + p * (this.b - this.a);
  }
  qdf(p) {
    return this.b - this.a;
  }
}
class LogisticDistribution {
  constructor(mu = 0, s = 1) {
    this.mu = mu;
    this.s = s;
  }
  icdf(p) {
    return this.mu + this.s * Math.log(p / (1 - p));
  }
  qdf(p) {
    return this.s / (p * (1 - p));
  }
}

// *** NEW DISTRIBUTIONS ***
const standardNormal = new NormalDistribution(0, 1);
class LogNormalDistribution {
  constructor(log_mu = 0, log_sigma = 1) {
    this.log_mu = log_mu;
    this.log_sigma = log_sigma;
  }
  pdf(x) {
    if (x <= 0) return 0;
    const log_x = Math.log(x);
    const z = (log_x - this.log_mu) / this.log_sigma;
    return (
      Math.exp(-0.5 * z * z) / (x * this.log_sigma * Math.sqrt(2 * Math.PI))
    );
  }
  icdf(p) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    return Math.exp(this.log_mu + this.log_sigma * standardNormal.icdf(p));
  }
  qdf(p) {
    const x = this.icdf(p);
    if (x === 0 || !isFinite(x)) return Infinity;
    return 1 / this.pdf(x);
  }
}
class CauchyDistribution {
  constructor(x0 = 0, gamma = 1) {
    this.x0 = x0;
    this.gamma = gamma;
  }
  pdf(x) {
    const term = (x - this.x0) / this.gamma;
    return 1 / (Math.PI * this.gamma * (1 + term * term));
  }
  icdf(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    return this.x0 + this.gamma * Math.tan(Math.PI * (p - 0.5));
  }
  qdf(p) {
    const x = this.icdf(p);
    if (!isFinite(x)) return Infinity;
    return 1 / this.pdf(x);
  }
}
class BetaDistribution {
  constructor(alpha = 2, beta = 2) {
    this.alpha = Math.max(0.01, alpha);
    this.beta = Math.max(0.01, beta);
    this.lbeta_ab =
      log_gamma(this.alpha) +
      log_gamma(this.beta) -
      log_gamma(this.alpha + this.beta);
  }
  pdf(x) {
    if (x < 0 || x > 1) return 0;
    if ((x === 0 && this.alpha < 1) || (x === 1 && this.beta < 1))
      return Infinity;
    if (x === 0 || x === 1) return 0;
    return Math.exp(
      (this.alpha - 1) * Math.log(x) +
        (this.beta - 1) * Math.log(1 - x) -
        this.lbeta_ab,
    );
  }
  icdf(p) {
    return inverse_incomplete_beta(p, this.alpha, this.beta);
  }
  qdf(p) {
    const x = this.icdf(p);
    if (!isFinite(x) || x <= 0 || x >= 1) return Infinity;
    const pdf_val = this.pdf(x);
    return pdf_val > 0 ? 1 / pdf_val : Infinity;
  }
}

// --- STATE VARIABLES ---
let log_lambda = 1.0;
let mu = 0.0;

// --- CORE LOGIC ---
function generateTicks(dist, n) {
  const ticks = [];
  let prev_bound = dist.icdf(0.0);

  for (let idx = 0; idx <= n; idx++) {
    const p = idx / n;
    const next_bound = dist.icdf(p);
    if (prev_bound === next_bound) continue;
    const { expon, mant } = findBiggestNiceStep(prev_bound, next_bound);
    const ik = 10 ** -expon / mant;

    const tick = {
      mant: Math.floor(next_bound * ik) * mant,
      expon,
      p,
      inv_density: dist.qdf(p) * ik,
    };
    if (prev_bound < 0 && 0 <= next_bound) {
      tick.mant = 0;
      tick.expon = 0;
      tick.inv_density = 0;
    }
    if (isFinite(tick.expon)) ticks.push(tick);
    prev_bound = next_bound;
  }
  return ticks;
}

function drawTicks(ctx, ticks, yPos, colorRgb, params) {
  const { min_dist, drop_off, width } = params;
  ctx.beginPath();
  ctx.moveTo(0, yPos);
  ctx.lineTo(width, yPos);
  ctx.strokeStyle = `rgba(${colorRgb}, 0.3)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  for (const tick of ticks) {
    const final_opacity = smoothstep(
      min_dist,
      min_dist * drop_off,
      width / tick.inv_density,
    );
    if (final_opacity * 256 <= 1) continue;
    const x = tick.p * (width - 1);
    const color = `rgba(${colorRgb}, ${final_opacity})`;

    ctx.beginPath();
    ctx.moveTo(x, yPos - 8);
    ctx.lineTo(x, yPos + 8);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(x, yPos + 12);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(formatSci(tick), 0, 0);
    ctx.restore();
  }
}

let last_time = null;
function draw(time) {
  if (last_time === null) last_time = time;
  const dt = time - last_time;
  last_time = time;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, width, height);

  mu += dt * 0.001;
  const min_dist = parseFloat(inputs.min_dist.value);
  const drop_off = parseFloat(inputs.drop_off.value);
  const scale = Math.exp(log_lambda);

  document.getElementById("val_lambda").innerText = scale.toExponential(2);
  document.getElementById("median").innerText = mu.toExponential(2);
  document.getElementById("val_min_dist").innerText = min_dist;
  document.getElementById("val_drop_off").innerText = drop_off.toFixed(1);

  // --- Parameters for Beta distribution ---
  // Remap mu [-inf, inf] to mean (0, 1) and scale (0, inf) to concentration
  const beta_mean = (Math.tanh(mu * 0.1) + 1) / 2; // Squeezes mu into (0, 1)
  const beta_concentration = 2 + 20 * Math.exp(-scale); // Higher scale = lower concentration
  const beta_alpha = beta_mean * beta_concentration;
  const beta_beta = (1 - beta_mean) * beta_concentration;

  const distributions = [
    {
      name: "Normal",
      dist: new NormalDistribution(mu, scale),
      colorRgb: "135, 206, 235",
    },
    {
      name: "Logistic",
      dist: new LogisticDistribution(mu, scale * (Math.sqrt(3) / Math.PI)),
      colorRgb: "144, 238, 144",
    },
    {
      name: "Cauchy",
      dist: new CauchyDistribution(mu, scale / 2),
      colorRgb: "255, 182, 193" /* Light Pink */,
    }, // Smaller scale to be more visible
    {
      name: "Exponential",
      dist: new ExponentialDistribution(mu, scale),
      colorRgb: "255, 165, 0",
    },
    // {
    //   name: "Lognormal",
    //   dist: new LogNormalDistribution(mu / 5, scale / 2),
    //   colorRgb: "255, 215, 0" /* Gold */,
    // }, // Parameters adjusted for visual comparability
    {
      name: "Uniform",
      dist: new UniformDistribution(mu - scale, mu + scale),
      colorRgb: "216, 191, 216",
    },
    // {
    //   name: "Beta",
    //   dist: new BetaDistribution(beta_alpha, beta_beta),
    //   colorRgb: "255, 99, 71" /* Tomato */,
    // },
  ];

  const drawParams = { min_dist, drop_off, width };
  ctx.font = "14px monospace";
  const y_spacing = height / (distributions.length + 1);

  distributions.forEach((item, index) => {
    const yPos = y_spacing * (index + 1);
    ctx.fillStyle = `rgb(${item.colorRgb})`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(item.name, 10, yPos - 15);
    const ticks = generateTicks(item.dist, (width - 1) * 4);
    drawTicks(ctx, ticks, yPos, item.colorRgb, drawParams);
  });

  requestAnimationFrame(draw);
}

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  log_lambda -= e.deltaY * 0.02;
  mu += e.deltaX * Math.exp(log_lambda) * 0.02;
});

requestAnimationFrame(draw);
