const BIRTH = { year: 2002, month: 8, day: 13, hour: 13, minute: 48, second: 21 };

const tehranFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tehran',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23'
});

type Parts = Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;

function tehranParts(epochMs: number): Parts {
  return Object.fromEntries(
    tehranFormatter.formatToParts(new Date(epochMs))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  ) as Parts;
}

/** The epoch of a Tehran wall-clock time, found by correcting a UTC guess by the zone offset it lands in. */
function tehranLocalEpoch({ year, month, day, hour, minute, second }: Parts): number {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetAsUtc;
  for (let i = 0; i < 4; i += 1) {
    const local = tehranParts(guess);
    const correction = targetAsUtc - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    guess += correction;
    if (Math.abs(correction) < 1) break;
  }
  return guess;
}

/**
 * Calendrical age in years: whole years since birth plus the fraction of the
 * way between successive Tehran-time birthdays, so it reaches each integer
 * exactly at the birthday instant rather than approximating a year's length.
 */
export function fractionalAge(epochMs: number): number {
  const birthday = (year: number) => tehranLocalEpoch({ ...BIRTH, year });
  let year = tehranParts(epochMs).year;
  if (epochMs < birthday(year)) year -= 1;
  const previous = birthday(year);
  return year - BIRTH.year + (epochMs - previous) / (birthday(year + 1) - previous);
}
