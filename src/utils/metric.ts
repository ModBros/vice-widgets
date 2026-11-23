import { type ChannelValue } from '@modbros/dashboard-core';
import { useFormatMetricValue, useMemoizedMetricField } from '@modbros/dashboard-sdk';

export interface MetricReading {
  channelValue: ChannelValue | null;
  ready: boolean;
  name: string;
  // in the unit of the text, i.e. with the conversion unit of the metric applied
  value: number | null;
  text: string;
  unit: string;
  // currencies write the unit first, "$1,234.56"
  unitBefore: boolean;
  min: number;
  max: number;
  // the max value written like the value, e.g. for "90/120"
  maxText: string;
  // the value as 0..1 between min and max
  percent: number;
  // false if the max value is just the highest value so far
  bounded: boolean;
  // converts a raw value of the metric to the unit of the text
  toShown: (raw: number) => number;
}

export function parseNumber(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// units with a natural upper bound, everything else uses the highest value
const unitMaxValues: Record<string, number> = {
  '%': 100,
  '°C': 100,
};

export function getMaxValue(
  channelValue: ChannelValue | null,
  value: number | null,
  maxOverride: number | null,
  min = 0,
  toShown: (raw: number) => number = (raw) => raw,
): number {
  if (typeof maxOverride === 'number' && maxOverride > min) {
    return maxOverride;
  }

  const unitMax = unitMaxValues[channelValue?.unit?.abbreviation ?? ''];

  if (unitMax !== undefined) {
    return Math.max(toShown(unitMax), value ?? 0);
  }

  const statisticsMax = parseNumber(channelValue?.value?.statistics?.max);

  return Math.max(statisticsMax === null ? 0 : toShown(statisticsMax), value ?? 0, min + 1);
}

export function getPercent(value: number | null, max: number, min = 0): number {
  if (value === null || max <= min) {
    return 0;
  }

  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

// fewer decimals for larger numbers, so readouts stay short
export function autoPrecision(value: number): number {
  const magnitude = Math.abs(value);

  if (magnitude >= 100) {
    return 0;
  }

  return magnitude >= 1 ? 1 : 2;
}

function toText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return String(node);
  }

  return '';
}

export function joinValue(text: string, unit: string, unitBefore = false): string {
  if (!text || !unit) {
    return text;
  }

  if (unitBefore) {
    return `${unit}${text}`;
  }

  if (unit === '%' || unit.startsWith('°')) {
    return `${text}${unit}`;
  }

  return `${text} ${unit}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Date and time values as "09.10.2026", "14:05:09" or both, null for other
 * values. They arrive as ISO strings ("2026-10-09T12:05:09.1234567Z",
 * "2026-10-09", "14:05:09.123"), and the formatter of the SDK fails on times
 * and shifts dates with the time zone.
 */
function dateTimeText(raw: unknown, valueType: string | undefined) {
  if (typeof raw !== 'string') {
    return null;
  }

  if (valueType === 'TimeOnly') {
    const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw);

    return time ? [time[1], time[2], time[3] ?? '0'].map((part) => pad(Number(part))).join(':') : null;
  }

  if (valueType === 'DateOnly') {
    const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

    return date ? [date[3], date[2], date[1]].join('.') : null;
  }

  if (valueType === 'DateTime') {
    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return `${[pad(date.getDate()), pad(date.getMonth() + 1), date.getFullYear()].join('.')} ${[
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join(':')}`;
  }

  return null;
}

// everything a reading is derived from, so the widget only re-renders when
// the displayed text or the bar length can change
function displayedParts(channelValue: ChannelValue | null) {
  if (!channelValue?.value) {
    return null;
  }

  return {
    metric: channelValue.metric?.id,
    label: channelValue.metric?.label,
    unit: channelValue.unit?.abbreviation,
    value: channelValue.value.value,
    max: channelValue.value.statistics?.max,
  };
}

function metricValueOf(channelValue: ChannelValue | null) {
  return channelValue?.value ?? null;
}

function isSameObject<T>(a: T | null, b: T | null): boolean {
  return a === b;
}

export function useMetricReading(props: {
  field: string;
  // decimal places, chosen by the size of the value if not set
  precision: number | null;
  max: number | null;
  // the value of an empty bar, 0 if not set
  min?: number | null;
  // re-render on every update, even if the value did not change
  everyUpdate?: boolean;
}): MetricReading {
  const { field, precision, max: maxOverride, everyUpdate } = props;
  const min = props.min ?? 0;
  const { channelValue } = useMemoizedMetricField<unknown>(
    everyUpdate ? { field, memo: metricValueOf, equals: isSameObject } : { field, memo: displayedParts },
  );
  const format = useFormatMetricValue();

  // formats a raw value like the text, so a conversion unit (MB as GB, °C as °F) applies to it too.
  // Only numeric texts can be parsed back; currencies are localized and never converted.
  const toShown = (raw: number): number => {
    if (!channelValue?.value || channelValue.type?.valueType !== 'Numeric') {
      return raw;
    }

    const formatted = format({ ...channelValue, value: { ...channelValue.value, value: raw } }, { precision: 10 });

    return parseNumber(toText(formatted?.value)) ?? raw;
  };
  const rawValue = parseNumber(channelValue?.value?.value);
  const value = rawValue === null ? null : toShown(rawValue);
  const max = getMaxValue(channelValue, value, maxOverride, min, toShown);
  const hasPrecision = typeof precision === 'number' && precision >= 0;
  // toFixed throws above 100 decimals
  const decimals = hasPrecision ? Math.min(precision, 10) : autoPrecision(value ?? 0);
  let text = '';
  let unit = '';
  let unitBefore = false;

  const dateTime = dateTimeText(channelValue?.value?.value, channelValue?.type?.valueType);

  if (dateTime !== null) {
    text = dateTime;
  } else if (typeof channelValue?.value?.value === 'boolean') {
    text = channelValue.value.value ? 'ON' : 'OFF';
  } else if (channelValue?.value) {
    const formatted = format(channelValue, { precision: decimals });

    text = toText(formatted?.value) || toText(channelValue.value.value);
    unit = formatted?.unit ?? channelValue.unit?.abbreviation ?? '';
    unitBefore = formatted?.unitPosition === 'before';
  }

  return {
    channelValue,
    ready: Boolean(channelValue?.value),
    name: channelValue?.metric?.label ?? '',
    value,
    text,
    unit,
    unitBefore,
    min,
    max,
    // a max value never needs more decimals than it has
    maxText: String(Number(max.toFixed(decimals))),
    percent: getPercent(value, max, min),
    bounded:
      (typeof maxOverride === 'number' && maxOverride > min) ||
      unitMaxValues[channelValue?.unit?.abbreviation ?? ''] !== undefined,
    toShown,
  };
}

export interface ValueDisplay {
  // 'value' | 'max' | 'percent' | 'none'
  mode: string | null;
  hideUnit: boolean;
}

// the text of a reading: "42.5 °C", "90/120", "75%" or nothing
export function valueText(reading: MetricReading, display: ValueDisplay) {
  if (!reading.ready || display.mode === 'none') {
    return '';
  }

  // texts, switches and dates have neither a max value nor a percentage
  if (reading.value === null) {
    return reading.text;
  }

  switch (display.mode) {
    case 'max':
      return `${reading.text}/${reading.maxText}`;

    case 'percent':
      return `${Math.round(reading.percent * 100)}%`;

    default:
      return display.hideUnit ? reading.text : joinValue(reading.text, reading.unit, reading.unitBefore);
  }
}
