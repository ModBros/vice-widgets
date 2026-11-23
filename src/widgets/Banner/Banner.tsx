import {
  useCheckboxField,
  useIsMetricFieldConfigured,
  useItemSize,
  useNumberField,
  useStringField,
} from '@modbros/dashboard-sdk';
import React, { type FunctionComponent } from 'react';

import { Root } from '../../components/Widget';
import { useMetricReading, valueText } from '../../utils/metric';
import {
  colors,
  defaultAlertThreshold,
  displayFontFamily,
  outline,
  uiFontFamily,
  useColor,
  useFontFamily,
} from '../../utils/theme';

const Banner: FunctionComponent = () => {
  const { width, height } = useItemSize();
  const title = useStringField({ field: 'title', defaultValue: 'Mission Passed' }) ?? '';
  const subtitle = useStringField({ field: 'subtitle' }) ?? '';
  const alertTitle = useStringField({ field: 'alert_title', defaultValue: 'Wasted' }) ?? '';
  const threshold = useNumberField({ field: 'alert_threshold', defaultValue: defaultAlertThreshold }) ?? 0;
  const hideBand = useCheckboxField({ field: 'hide_band' });
  const metricConfigured = useIsMetricFieldConfigured({ field: 'metric' });
  const reading = useMetricReading({ field: 'metric', precision: null, max: null });
  const fontFamily = useFontFamily(displayFontFamily);
  const titleColor = useColor('title_color', colors.gold);
  const textColor = useColor('text_color', colors.white);
  const alertColor = useColor('alert_color', colors.alert);

  const alerting = metricConfigured && reading.bounded && threshold > 0 && reading.percent * 100 >= threshold;
  const value = metricConfigured ? valueText(reading, { mode: 'value', hideUnit: false }) : '';
  const shownTitle = alerting ? alertTitle : title;
  const sub = [subtitle, value].filter(Boolean).join(' ');
  // texts shrink to fit the width, the condensed display font is about half an em wide per letter
  const titleSize = Math.max(1, Math.min(height * (sub ? 0.56 : 0.8), width / (shownTitle.length * 0.5 + 1)));
  const subSize = Math.max(1, Math.min(height * 0.2, width / (sub.length * 0.56 + 1)));

  return (
    <Root
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: subSize * 0.35,
        background: hideBand
          ? undefined
          : 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.6) 20%, rgba(0, 0, 0, 0.6) 80%, transparent)',
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: titleSize,
          color: alerting ? alertColor : titleColor,
          textShadow: outline(titleSize * 0.04),
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}
      >
        {shownTitle}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: uiFontFamily,
            fontSize: subSize,
            fontWeight: 700,
            color: textColor,
            textShadow: outline(subSize * 0.06),
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {sub}
        </div>
      )}
    </Root>
  );
};

export default Banner;
