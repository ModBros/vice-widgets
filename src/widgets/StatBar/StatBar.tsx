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
import React, { type FunctionComponent } from 'react';
import styled from 'styled-components';

import { Flash, Root } from '../../components/Widget';
import { useMetricReading, valueText } from '../../utils/metric';
import {
  clamp,
  colors,
  defaultAlertThreshold,
  fontSizeOf,
  outline,
  uiFontFamily,
  useColor,
  useFontFamily,
} from '../../utils/theme';

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Label = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Segments = styled(Flash)`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const Segment = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
`;

const StatBar: FunctionComponent = () => {
  const { height } = useItemSize();
  const configured = useIsMetricFieldConfigured({ field: 'metric' });
  const customLabel = useStringField({ field: 'label' });
  const hideLabel = useCheckboxField({ field: 'hide_label' });
  const display = useSelectField({ field: 'value_display', defaultValue: 'value' });
  const precision = useNumberField({ field: 'precision' });
  const min = useNumberField({ field: 'min' });
  const max = useNumberField({ field: 'max' });
  const segmentCount = clamp(Math.round(useNumberField({ field: 'segments', defaultValue: 5 }) ?? 5), 1, 20);
  const threshold = useNumberField({ field: 'alert_threshold', defaultValue: defaultAlertThreshold }) ?? 0;
  const fontSizeValue = useNumberField({ field: 'font_size' });
  const fontFamily = useFontFamily(uiFontFamily);
  const color = useColor('color', colors.white);
  const emptyColor = useColor('empty_color', 'rgba(0, 0, 0, 0.45)');
  const alertColor = useColor('alert_color', colors.alert);
  const reading = useMetricReading({ field: 'metric', precision, min, max });

  if (!configured) {
    return <MissingConfigPlaceholder text={'Please provide a metric'} />;
  }

  if (!reading.ready) {
    return <Loading />;
  }

  const label = hideLabel ? '' : customLabel || reading.name;
  const value = valueText(reading, { mode: display, hideUnit: false });
  const showHead = Boolean(label || value);
  const fontSize = fontSizeOf(fontSizeValue, height * 0.34);
  const gap = Math.max(2, height * 0.06);
  const alerting = reading.bounded && threshold > 0 && reading.percent * 100 >= threshold;
  const lit = alerting ? alertColor : color;
  const filled = reading.percent * segmentCount;

  return (
    <Root style={{ flexDirection: 'column', gap: fontSize * 0.25, fontFamily, color }}>
      {showHead && (
        <Head style={{ fontSize, textShadow: outline(fontSize * 0.06) }}>
          <Label>{label}</Label>
          {value && <span style={{ color: lit }}>{value}</span>}
        </Head>
      )}
      <Segments $active={alerting} style={{ gap }}>
        {Array.from({ length: segmentCount }, (_, i) => (
          <Segment key={i} style={{ background: emptyColor, outline: '1px solid rgba(0, 0, 0, 0.5)' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                right: 'auto',
                width: `${clamp(filled - i, 0, 1) * 100}%`,
                background: lit,
              }}
            />
          </Segment>
        ))}
      </Segments>
    </Root>
  );
};

export default StatBar;
