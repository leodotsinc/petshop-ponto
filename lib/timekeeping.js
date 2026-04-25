export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

function parseOffsetPart(value) {
  if (!value || value === 'GMT') return 0;

  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Offset de timezone não suportado: ${value}`);
  }

  const [, sign, hours, minutes = '00'] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes);

  return (sign === '+' ? 1 : -1) * totalMinutes * 60 * 1000;
}

function getTimeZoneOffsetMs(date, timeZone = BUSINESS_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  });

  const offsetPart = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName');

  return parseOffsetPart(offsetPart?.value);
}

function zonedTimeToUtc(parts, timeZone = BUSINESS_TIME_ZONE) {
  let guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0,
    parts.millisecond || 0,
  );

  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    const nextGuess = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour || 0,
      parts.minute || 0,
      parts.second || 0,
      parts.millisecond || 0,
    ) - offset;

    if (nextGuess === guess) break;
    guess = nextGuess;
  }

  return new Date(guess);
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error(`Data inválida: ${dateKey}`);

  const parsed = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  const check = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  if (
    parsed.month < 1 || parsed.month > 12 ||
    check.getUTCFullYear() !== parsed.year ||
    check.getUTCMonth() + 1 !== parsed.month ||
    check.getUTCDate() !== parsed.day
  ) {
    throw new Error(`Data inválida: ${dateKey}`);
  }

  return parsed;
}

function parseMonthKey(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) throw new Error(`Mês inválido: ${monthKey}`);

  const parsed = {
    year: Number(match[1]),
    month: Number(match[2]),
  };

  if (parsed.month < 1 || parsed.month > 12) {
    throw new Error(`Mês inválido: ${monthKey}`);
  }

  return parsed;
}

export function getBusinessParts(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => ['year', 'month', 'day'].includes(part.type))
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function getBusinessDateKey(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const { year, month, day } = getBusinessParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getBusinessMonthKey(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const { year, month } = getBusinessParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getBusinessDayRange(dateKey, timeZone = BUSINESS_TIME_ZONE) {
  const startParts = parseDateKey(dateKey);
  const start = zonedTimeToUtc(startParts, timeZone);
  const nextUtcDay = addUtcDays(new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day)), 1);
  const end = zonedTimeToUtc(
    {
      year: nextUtcDay.getUTCFullYear(),
      month: nextUtcDay.getUTCMonth() + 1,
      day: nextUtcDay.getUTCDate(),
    },
    timeZone,
  );

  return { start, end };
}

export function getBusinessMonthRange(monthKey, timeZone = BUSINESS_TIME_ZONE) {
  const { year, month } = parseMonthKey(monthKey);
  const start = zonedTimeToUtc({ year, month, day: 1 }, timeZone);
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const end = zonedTimeToUtc(
    {
      year: nextMonthDate.getUTCFullYear(),
      month: nextMonthDate.getUTCMonth() + 1,
      day: nextMonthDate.getUTCDate(),
    },
    timeZone,
  );

  return { start, end };
}

export function sortRecords(records) {
  return [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function calculateWorkedHours(records) {
  const sorted = sortRecords(records);
  const pairs = [];
  let openEntry = null;

  for (const record of sorted) {
    if (record.type === 'entrada') {
      openEntry = record;
      continue;
    }

    if (record.type === 'saida' && openEntry) {
      const minutes = (new Date(record.timestamp) - new Date(openEntry.timestamp)) / 60000;

      if (minutes > 0 && minutes < 1440) {
        pairs.push({
          entrada: openEntry,
          saida: record,
          minutes: Math.round(minutes),
        });
      }

      openEntry = null;
    }
  }

  const lastRecord = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const totalMinutes = pairs.reduce((sum, pair) => sum + pair.minutes, 0);

  return {
    totalMinutes,
    pairs,
    openEntry,
    lastRecord,
    currentStatus: lastRecord?.type === 'entrada' ? 'presente' : 'ausente',
  };
}

export function getNextRecordType(records) {
  const { lastRecord } = calculateWorkedHours(records);
  return lastRecord?.type === 'entrada' ? 'saida' : 'entrada';
}

export function calculateExpectedMonthlyMinutes(yearMonth, weeklyHours, referenceDate = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const { year, month } = parseMonthKey(yearMonth);
  const nowParts = getBusinessParts(referenceDate, timeZone);

  let days = 0;

  if (year === nowParts.year && month === nowParts.month) {
    days = nowParts.day;
  } else if (year < nowParts.year || (year === nowParts.year && month < nowParts.month)) {
    days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  return Math.round((weeklyHours / 7) * 60 * days);
}

export function formatBusinessDate(date, options = {}, timeZone = BUSINESS_TIME_ZONE) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, ...options }).format(new Date(date));
}

export function formatBusinessTime(date, options = {}, timeZone = BUSINESS_TIME_ZONE) {
  return formatBusinessDate(
    date,
    { hour: '2-digit', minute: '2-digit', ...options },
    timeZone,
  );
}

export function formatBusinessDateTime(date, options = {}, timeZone = BUSINESS_TIME_ZONE) {
  return formatBusinessDate(
    date,
    {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    },
    timeZone,
  );
}
