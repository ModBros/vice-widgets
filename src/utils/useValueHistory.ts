import { type ChannelValue, type MetricValue } from '@modbros/dashboard-core';
import { useRef } from 'react';

import { parseNumber } from './metric';

const maxHistory = 1024;

/**
 * Collects the numeric values of a metric over time. The buffer is larger than
 * any graph needs, so resizing a widget does not throw away history. Selecting
 * another metric or another unit starts a new history, values of different
 * units cannot share a graph.
 */
export function useValueHistory(channelValue: ChannelValue | null): number[] {
  const historyRef = useRef<number[]>([]);
  const lastValueRef = useRef<MetricValue | null>(null);
  const metricIdRef = useRef<string | null>(null);
  const metricValue = channelValue?.value ?? null;
  const metricId = channelValue ? `${channelValue.metric?.id}|${channelValue.unit?.abbreviation}` : null;

  if (metricValue && metricId !== metricIdRef.current) {
    metricIdRef.current = metricId;
    historyRef.current = [];
    lastValueRef.current = null;
  }

  if (metricValue && metricValue !== lastValueRef.current) {
    const history = historyRef.current;

    let seeded = false;

    // seed with the timeseries if the metric provides one
    if (!lastValueRef.current && history.length === 0) {
      for (const sample of metricValue.timeseries?.values ?? []) {
        const parsed = parseNumber(sample);

        if (parsed !== null) {
          history.push(parsed);
          seeded = true;
        }
      }
    }

    lastValueRef.current = metricValue;
    const value = parseNumber(metricValue.value);

    // the timeseries usually ends with the current value already
    if (value !== null && !(seeded && history[history.length - 1] === value)) {
      history.push(value);
    }

    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }
  }

  return historyRef.current;
}
