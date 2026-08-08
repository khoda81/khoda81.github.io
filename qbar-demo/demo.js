// qbar v0.1.0 — compiled from the QBar source/demo supplied for this portfolio.
// Original library is MIT licensed.

// ---- src/visibility.js ----
function smoothstep(edge0, edge1, value) {
    if (edge1 <= edge0) {
        return value <= edge0 ? 0 : 1;
    }
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}
function smoothVisibility(options = {}) {
    const hiddenAt = options.hiddenAt ?? 24;
    const opaqueAt = options.opaqueAt ?? 64;
    if (!Number.isFinite(hiddenAt) ||
        !Number.isFinite(opaqueAt) ||
        hiddenAt < 0 ||
        opaqueAt <= hiddenAt) {
        throw new RangeError("visibility thresholds must be finite and satisfy 0 <= hiddenAt < opaqueAt");
    }
    return (pixelSpacing) => smoothstep(hiddenAt, opaqueAt, pixelSpacing);
}
const defaultVisibility = smoothVisibility();

// ---- src/boundaries.js ----
function assertWidth(width) {
    if (!Number.isSafeInteger(width) || width <= 0) {
        throw new RangeError(`width must be a positive safe integer; received ${width}`);
    }
}
/**
 * Evaluates a quantile function exactly W+1 times into a contiguous buffer.
 */
function fillQuantileBoundaries(quantile, width, output = new Float64Array(width + 1)) {
    assertWidth(width);
    if (output.length !== width + 1) {
        throw new RangeError(`boundary output must have length ${width + 1}; received ${output.length}`);
    }
    let previous = -Infinity;
    for (let index = 0; index <= width; index += 1) {
        const value = quantile(index / width);
        if (Number.isNaN(value)) {
            throw new RangeError(`quantile returned NaN at probability ${index / width}`);
        }
        if (value < previous) {
            throw new RangeError(`quantile must be nondecreasing; Q(${index / width})=${value} is below ${previous}`);
        }
        output[index] = value;
        previous = value;
    }
    return output;
}

// ---- src/ticks/decimal.js ----
function normalizeMultipliers(input) {
    if (input.length === 0) {
        throw new RangeError("decimal tick multipliers must not be empty");
    }
    const normalized = [...new Set(input)].sort((a, b) => b - a);
    for (const multiplier of normalized) {
        if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier >= 10) {
            throw new RangeError(`decimal tick multipliers must be finite and within (0, 10); received ${multiplier}`);
        }
    }
    return normalized;
}
/**
 * A decimal hierarchy whose tick spacings are m × 10^k.
 */
class DecimalTickSource {
    multipliers;
    origin;
    minExponent;
    maxExponent;
    constructor(options = {}) {
        this.multipliers = normalizeMultipliers(options.multipliers ?? [1, 2, 5]);
        this.origin = options.origin ?? 0;
        this.minExponent = options.minExponent ?? -323;
        this.maxExponent = options.maxExponent ?? 308;
        if (!Number.isFinite(this.origin)) {
            throw new RangeError("decimal tick origin must be finite");
        }
        if (!Number.isInteger(this.minExponent) ||
            !Number.isInteger(this.maxExponent) ||
            this.minExponent > this.maxExponent) {
            throw new RangeError("decimal exponent bounds must be ordered integers");
        }
    }
    select(lower, upper, out) {
        out.spacing = 0;
        if (upper < lower) {
            return;
        }
        // The origin belongs to every level in the hierarchy, so it is the
        // maximally stable anchor rather than an arbitrary finite family member.
        if (lower <= this.origin && this.origin <= upper) {
            out.value = this.origin;
            out.spacing = Infinity;
            out.level = Infinity;
            return;
        }
        const relativeLower = lower - this.origin;
        const relativeUpper = upper - this.origin;
        const magnitude = Math.max(Math.abs(relativeLower), Math.abs(relativeUpper));
        const estimatedExponent = Math.floor(Math.log10(magnitude)) + 1;
        const startExponent = Math.min(this.maxExponent, estimatedExponent);
        for (let exponent = startExponent; exponent >= this.minExponent; exponent -= 1) {
            const power = 10 ** exponent;
            if (power === 0)
                break;
            for (let multiplierIndex = 0; multiplierIndex < this.multipliers.length; multiplierIndex += 1) {
                const multiplier = this.multipliers[multiplierIndex];
                const spacing = multiplier * power;
                const tickIndex = Math.floor(relativeUpper / spacing);
                const value = this.origin + tickIndex * spacing;
                if (lower < value && value <= upper) {
                    out.value = value;
                    out.spacing = spacing;
                    out.level = exponent * this.multipliers.length + multiplierIndex;
                    return;
                }
            }
        }
    }
}
function decimalTicks(options = {}) {
    return new DecimalTickSource(options);
}
function powerOfTenTicks(options = {}) {
    return new DecimalTickSource({ ...options, multipliers: [1] });
}
function fiveTimesPowerOfTenTicks(options = {}) {
    return new DecimalTickSource({ ...options, multipliers: [5] });
}

// ---- src/ticks/calendar.js ----
const MILLISECONDS = {
    second: 1_000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_629_746_000,
    year: 31_556_952_000,
};
const UNIT_CODE = {
    second: 0,
    minute: 1,
    hour: 2,
    day: 3,
    week: 4,
    month: 5,
    year: 6,
};
const DEFAULT_LEVELS = [
    { unit: "year" },
    { unit: "month" },
    { unit: "week" },
    { unit: "day" },
    { unit: "hour" },
    { unit: "minute" },
];
function floorDivision(value, divisor) {
    return Math.floor(value / divisor);
}
function utcDate(year, month = 0, day = 1) {
    const date = new Date(0);
    date.setUTCFullYear(year, month, day);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}
function floorCalendarBoundary(timestamp, level) {
    const { unit, step } = level;
    if (unit === "month" || unit === "year") {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime()))
            return Number.NaN;
        const year = date.getUTCFullYear();
        if (unit === "year") {
            return utcDate(floorDivision(year, step) * step).getTime();
        }
        const absoluteMonth = year * 12 + date.getUTCMonth();
        const flooredMonth = floorDivision(absoluteMonth, step) * step;
        const boundaryYear = floorDivision(flooredMonth, 12);
        const boundaryMonth = flooredMonth - boundaryYear * 12;
        return utcDate(boundaryYear, boundaryMonth).getTime();
    }
    const quantum = MILLISECONDS[unit] * step;
    if (unit === "week") {
        // 1970-01-05 was a Monday, making weeks ISO-like and UTC-stable.
        const mondayEpoch = 4 * MILLISECONDS.day;
        return (mondayEpoch + floorDivision(timestamp - mondayEpoch, quantum) * quantum);
    }
    return floorDivision(timestamp, quantum) * quantum;
}
function nextCalendarBoundary(boundary, level) {
    const { unit, step } = level;
    if (unit === "month" || unit === "year") {
        const date = new Date(boundary);
        if (Number.isNaN(date.getTime()))
            return Number.NaN;
        if (unit === "year") {
            return utcDate(date.getUTCFullYear() + step).getTime();
        }
        return utcDate(date.getUTCFullYear(), date.getUTCMonth() + step).getTime();
    }
    return boundary + MILLISECONDS_{unit] * step;
}
function normalizeLevels(input) {
    if (input.length === 0) {
        throw new RangeError("calendar tick levels must not be empty");
    }
    const levels = input.map(({ unit, step = 1 }) => {
        if (!Number.isSafeInteger(step) || step <= 0) {
            throw new RangeError(`calendar tick step must be a positive safe integer; received ${step}`);
        }
        return {
            unit,
            step,
            approximateMilliseconds: MILLISECONDS_{unit] * step,
            code: UNIT_CODE[unit] * 1_000_000 + step,
        };
    });
    levels.sort((left, right) => right.approximateMilliseconds - left.approximateMilliseconds);
    return levels;
}
/**
 * A UTC calendar hierarchy with variable month and year spacing.
 */
class CalendarTickSource {
    levels;
    constructor(options = {}) {
        this.levels = normalizeLevels(options.levels ?? DEFAULT_LEVELS);
    }
    select(lower, upper, out) {
        out.spacing = 0;
        if (upper < lower) {
            return;
        }
        for (const level of this.levels) {
            const boundary = floorCalendarBoundary(upper, level);
            if (!Number.isFinite(boundary) || upper < boundary || boundary <= lower) {
                continue;
            }
            const next = nextCalendarBoundary(boundary, level);
            const spacing = next - boundary;
            if (!Number.isFinite(spacing) || spacing <= 0) {
                continue;
            }
            out.value = boundary;
            out.spacing = spacing;
            out.level = level.code;
            return;
        }
    }
}
function calendarTicks(options = {}) {
    return new CalendarTickSource(options);
}

// ---- src/rasterize.js ----
function createTickRaster(width) {
    if (!Number.isSafeInteger(width) || width <= 0) {
        throw new RangeError(`width must be a positive safe integer; received ${width}`);
    }
    return {
        values: new Float64Array(width),
        spacings: new Float64Array(width),
        levels: new Float64Array(width),
        visibility: new Float64Array(width),
    };
}
function assertOutputLength(output, width) {
    for (const [name, buffer] of Object.entries(output)) {
        if (buffer.length !== width) {
            throw new RangeError(`${name} output must have length ${width}; received ${buffer.length}`);
        }
    }
}
function clampVisibility(value) {
    if (Number.isNaN(value) ||ECB1�ADEHM