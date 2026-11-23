import {
  Loading,
  MissingConfigPlaceholder,
  useCheckboxField,
  useIsMetricFieldConfigured,
  useItemSize,
  useNumberField,
  useStringField,
} from '@modbros/dashboard-sdk';
import React, { type FunctionComponent } from 'react';
import styled from 'styled-components';

import { Root } from '../../components/Widget';
import { joinValue, useMetricReading } from '../../utils/metric';
import { clamp, colors, fontSizeOf, uiFontFamily, useColor, useFontFamily } from '../../utils/theme';
import { useSvgId } from '../../utils/useSvgId';
import { useValueHistory } from '../../utils/useValueHistory';

const Symbol = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

function formatChange(change: number, decimals: number): string {
  // the sign of the rounded change, so -0.001 is "+0.0" and not "-0.0"
  const rounded = Number(change.toFixed(decimals));

  return `${rounded >= 0 ? '+' : '-'}${Math.abs(rounded).toFixed(decimals)}`;
}

const Ticker: FunctionComponent = () => {
  const id = useSvgId();
  const { width, height } = useItemSize();
  const configured = useIsMetricFieldConfigured({ field: 'metric' });
  const customLabel = useStringField({ field: 'label' });
  const samples = clamp(Math.round(useNumberField({ field: 'samples', defaultValue: 60 }) ?? 60), 2, 600);
  const precision = useNumberField({ field: 'precision' });
  const hideUnit = useCheckboxField({ field: 'hide_unit' });
  const hidePanel = useCheckboxField({ field: 'hide_panel' });
  const fontSizeValue = useNumberField({ field: 'font_size' });
  const fontFamily = useFontFamily(uiFontFamily);
  const upColor = useColor('up_color', colors.up);
  const downColor = useColor('down_color', colors.down);
  const panelColor = useColor('panel_color', 'rgba(20, 10, 38, 0.72)');
  const reading = useMetricReading({ field: 'metric', precision, max: null, everyUpdate: true });
  const history = useValueHistory(reading.channelValue);

  if (!configured) {
    return <MissingConfigPlaceholder text={'Please provide a metric'} />;
  }

  if (!reading.ready) {
    return <Loading />;
  }

  const recent = history.slice(-samples);
  // the history holds raw values, the text has the unit conversion applied
  const first = reading.toShown(recent[0] ?? 0);
  const last = reading.toShown(recent[recent.length - 1] ?? 0);
  const change = last - first;
  const percent = first !== 0 ? (change / Math.abs(first)) * 100 : null;
  // toFixed throws above 100 decimals
  const decimals = typeof precision === 'number' && precision >= 0 ? Math.min(precision, 10) : 1;
  const rising = Number(change.toFixed(decimals)) >= 0;
  const trendColor = rising ? upColor : downColor;

  const padding = Math.max(4, Math.min(width, height) * 0.07);
  const fontSize = fontSizeOf(fontSizeValue, height * 0.13);
  const valueSize = Math.min(fontSize * 2.1, width * 0.16);
  const chartWidth = Math.max(1, width - padding * 2);
  const gap = fontSize * 0.3;
  // the symbol, the value, the change and three gaps above the chart
  const chartHeight = Math.max(1, height - padding * 2 - fontSize * 2.2 - valueSize * 1.1 - gap * 3);
  const low = Math.min(...recent);
  const high = Math.max(...recent);
  const span = high - low || 1;
  const points = recent.map((sample, i) => {
    const x = chartWidth - ((recent.length - 1 - i) / (samples - 1)) * chartWidth;
    const y = high === low ? chartHeight / 2 : chartHeight - ((sample - low) / span) * chartHeight * 0.9 - 1;

    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.length > 1 ? `M${points.join('L')}` : '';
  const startX = points.length > 1 ? points[0].split(',')[0] : '0';
  const area = line ? `${line}L${chartWidth},${chartHeight}L${startX},${chartHeight}Z` : '';

  return (
    <Root
      style={{
        flexDirection: 'column',
        padding,
        gap,
        fontFamily,
        color: colors.white,
        fontVariantNumeric: 'tabular-nums',
        background: hidePanel ? undefined : panelColor,
        borderRadius: hidePanel ? undefined : padding * 0.6,
        borderLeft: hidePanel ? undefined : `${Math.max(2, padding * 0.35)}px solid ${trendColor}`,
      }}
    >
      <Symbol style={{ fontSize }}>{customLabel || reading.name}</Symbol>
      <div style={{ fontSize: valueSize, fontWeight: 700 }}>
        {hideUnit ? reading.text : joinValue(reading.text, reading.unit, reading.unitBefore)}
      </div>
      <div style={{ fontSize, color: trendColor }}>
        {`${rising ? '▲' : '▼'} ${formatChange(change, decimals)}`}
        {percent !== null && ` (${formatChange(percent, 1)}%)`}
      </div>
      <svg width={chartWidth} height={chartHeight} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${id}-area`} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor={trendColor} stopOpacity='0.45' />
            <stop offset='1' stopColor={trendColor} stopOpacity='0' />
          </linearGradient>
        </defs>
        {area && <path d={area} fill={`url(#${id}-area)`} />}
        {line && (
          <path
            d={line}
            fill='none'
            stroke={trendColor}
            strokeWidth={Math.max(1.5, fontSize * 0.12)}
            strokeLinejoin='round'
          />
        )}
      </svg>
    </Root>
  );
};

export default Ticker;
