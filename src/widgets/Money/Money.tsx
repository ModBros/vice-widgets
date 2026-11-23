import {
  Loading,
  MissingConfigPlaceholder,
  useCheckboxField,
  useIsMetricFieldConfigured,
  useItemSize,
  useNumberField,
  useSelectField,
  useStringField,
} from '@modbros/dashboard-sdk';
import React, { type FunctionComponent, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

import { Root } from '../../components/Widget';
import { useMetricReading } from '../../utils/metric';
import { clamp, colors, displayFontFamily, fontSizeOf, outline, useColor, useFontFamily } from '../../utils/theme';

const tweenMs = 700;

const fadeOut = keyframes`
  0%, 60% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const Change = styled.div`
  animation: ${fadeOut} 3s ease-in forwards;
`;

const alignItems: Record<string, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

// counts up or down to the target like the cash counter of the HUD
function useCountTo(target: number): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;

    if (from === target) {
      return undefined;
    }

    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / tweenMs);

      shownRef.current = from + (target - from) * (1 - (1 - t) ** 3);
      setShown(shownRef.current);

      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

// the change of the last update, shown under the cash for a few seconds
function useLastChange(value: number, multiplier: number, precision: number, ready: boolean) {
  const [change, setChange] = useState({ amount: 0, count: 0 });
  // null until the first value, which is no change
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const previous = previousRef.current;

    previousRef.current = value;

    // a settings edit runs this again with the same value, which is no change
    if (previous === null || previous === value) {
      return;
    }

    const amount = Number(((value - previous) * multiplier).toFixed(precision));

    if (amount !== 0) {
      setChange((last) => ({ amount, count: last.count + 1 }));
    }
  }, [value, multiplier, precision, ready]);

  return change;
}

function cash(amount: number, prefix: string, precision: number): string {
  // the sign of the rounded amount, so -0.3 is "$0" and not "-$0"
  const rounded = Number(amount.toFixed(precision));
  const digits = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return `${rounded < 0 ? '-' : ''}${prefix}${digits}`;
}

const Money: FunctionComponent = () => {
  const { width, height } = useItemSize();
  const configured = useIsMetricFieldConfigured({ field: 'metric' });
  const prefix = useStringField({ field: 'prefix', defaultValue: '$' }) ?? '$';
  const multiplier = useNumberField({ field: 'multiplier', defaultValue: 1 }) ?? 1;
  const precision = clamp(Math.round(useNumberField({ field: 'precision', defaultValue: 0 }) ?? 0), 0, 6);
  const hideChange = useCheckboxField({ field: 'hide_change' });
  const align = useSelectField({ field: 'align', defaultValue: 'right' });
  const fontSizeValue = useNumberField({ field: 'font_size' });
  const fontFamily = useFontFamily(displayFontFamily);
  const color = useColor('color', colors.cash);
  // the value with the unit conversion applied; currencies come raw, their text is localized ("1.234,50")
  const reading = useMetricReading({ field: 'metric', precision: 6, max: null });
  const value = reading.value ?? 0;
  const target = Number((value * multiplier).toFixed(precision));
  const shown = useCountTo(target);
  const change = useLastChange(value, multiplier, precision, reading.ready);

  if (!configured) {
    return <MissingConfigPlaceholder text={'Please provide a metric'} />;
  }

  if (!reading.ready) {
    return <Loading />;
  }

  const text = cash(shown, prefix, precision);
  const targetText = cash(target, prefix, precision);
  // the widest text the counter passes, so the size does not jump while counting
  const chars = Math.max(text.length, targetText.length);
  const fontSize = fontSizeOf(fontSizeValue, Math.min(height * (hideChange ? 0.9 : 0.62), width / (chars * 0.52)));
  const changeSize = Math.min(fontSize * 0.55, height * 0.3);
  const stroke = Math.max(1, fontSize * 0.045);

  return (
    <Root
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: alignItems[align ?? 'right'] ?? 'flex-end',
        fontFamily,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div style={{ fontSize, color, textShadow: outline(stroke) }}>{text}</div>
      {!hideChange && (
        <div style={{ height: changeSize, fontSize: changeSize, marginTop: changeSize * 0.15 }}>
          {change.count > 0 && (
            <Change
              key={change.count}
              style={{
                color: change.amount > 0 ? color : colors.down,
                textShadow: outline(stroke * 0.7),
              }}
            >
              {`${change.amount > 0 ? '+' : ''}${cash(change.amount, prefix, precision)}`}
            </Change>
          )}
        </div>
      )}
    </Root>
  );
};

export default Money;
