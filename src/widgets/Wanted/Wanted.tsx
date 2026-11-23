import {
  Loading,
  MissingConfigPlaceholder,
  useCheckboxField,
  useIsMetricFieldConfigured,
  useItemSize,
  useNumberField,
  useSelectField,
} from '@modbros/dashboard-sdk';
import React, { type FunctionComponent } from 'react';
import styled from 'styled-components';

import { flashing, Root } from '../../components/Widget';
import { useMetricReading } from '../../utils/metric';
import { clamp, colors, useColor } from '../../utils/theme';

// a five pointed star in a 1 x 1 box
const starPoints = Array.from({ length: 10 }, (_, i) => {
  const radius = i % 2 === 0 ? 0.5 : 0.21;
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;

  return `${(0.5 + radius * Math.cos(angle)).toFixed(3)},${(0.54 + radius * Math.sin(angle)).toFixed(3)}`;
}).join(' ');

const Star = styled.polygon<{ $flash: boolean }>`
  ${(props) => props.$flash && flashing}
`;

const justify: Record<string, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const Wanted: FunctionComponent = () => {
  const { width, height } = useItemSize();
  const configured = useIsMetricFieldConfigured({ field: 'metric' });
  const count = clamp(Math.round(useNumberField({ field: 'stars', defaultValue: 5 }) ?? 5), 1, 10);
  const min = useNumberField({ field: 'min' });
  const max = useNumberField({ field: 'max' });
  const align = useSelectField({ field: 'align', defaultValue: 'right' });
  const noFlash = useCheckboxField({ field: 'no_flash' });
  const starColor = useColor('star_color', colors.white);
  const emptyColor = useColor('empty_color', 'rgba(20, 10, 38, 0.55)');
  const reading = useMetricReading({ field: 'metric', precision: 0, min, max });

  if (!configured) {
    return <MissingConfigPlaceholder text={'Please provide a metric'} />;
  }

  if (!reading.ready) {
    return <Loading />;
  }

  const lit = Math.round(reading.percent * count);
  // a full wanted level flashes like a manhunt, but not for a max that is only the highest value so far
  const flash = !noFlash && reading.bounded && lit === count;
  const gap = 0.12;
  const size = Math.min(height, width / (count + (count - 1) * gap));

  return (
    <Root style={{ justifyContent: justify[align ?? 'right'] ?? 'flex-end', alignItems: 'center' }}>
      <svg
        width={size * (count + (count - 1) * gap)}
        height={size}
        viewBox={`-0.05 -0.05 ${count + (count - 1) * gap + 0.1} 1.1`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {Array.from({ length: count }, (_, i) => (
          <g key={i} transform={`translate(${i * (1 + gap)} 0)`}>
            <Star
              points={starPoints}
              $flash={flash}
              fill={i < lit ? starColor : emptyColor}
              stroke={i < lit ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.35)'}
              strokeWidth='0.06'
              strokeLinejoin='round'
            />
          </g>
        ))}
      </svg>
    </Root>
  );
};

export default Wanted;
