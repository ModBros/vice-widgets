import {
  useCheckboxField,
  useIsMetricFieldConfigured,
  useItemSize,
  useNumberField,
  useSelectField,
} from '@modbros/dashboard-sdk';
import React, { type FunctionComponent } from 'react';
import styled, { keyframes } from 'styled-components';

import { Flash, Root } from '../../components/Widget';
import { useMetricReading } from '../../utils/metric';
import { clamp, colors, defaultAlertThreshold, random, useColor, withAlpha } from '../../utils/theme';

const map = {
  land: '#2b2440',
  park: '#2d4a3a',
  water: '#173c5e',
  road: '#554a74',
  highway: '#9a8fbf',
  route: '#d23cf0',
};

// the map is drawn in a 100 x 100 box with the player in the middle, the
// streets reach far enough beyond it to cover the corners while it turns
const grid = 12.5;
const extent = { from: -40, to: 140 };

function coastX(y: number): number {
  return 90 + 6 * Math.sin(y / 13) + 3 * Math.sin(y / 5);
}

const water = (() => {
  const points: string[] = [];

  for (let y = extent.from; y <= extent.to; y += 5) {
    points.push(`${coastX(y).toFixed(1)},${y}`);
  }

  return `M${points.join('L')}L${extent.to},${extent.to}L${extent.to},${extent.from}Z`;
})();

const streets = (() => {
  const next = random(11);
  const lines: { d: string; width: number }[] = [];

  for (let at = 50 - grid * 7; at <= 50 + grid * 7; at += grid) {
    const major = Math.round((at - 50) / grid) % 4 === 0;

    // every street is cut into blocks, some of them are left out
    for (let from = extent.from; from < extent.to; from += grid) {
      if (major || next() > 0.18) {
        lines.push({ d: `M${at},${from}V${from + grid}`, width: major ? 1.6 : 0.9 });
      }

      if (major || next() > 0.18) {
        lines.push({ d: `M${from},${at}H${from + grid}`, width: major ? 1.6 : 0.9 });
      }
    }
  }

  return lines;
})();

const islands = [
  { cx: 118, cy: 30, rx: 7, ry: 4 },
  { cx: 126, cy: 60, rx: 9, ry: 5 },
  { cx: 112, cy: 96, rx: 6, ry: 3.5 },
];

const blips = [
  { x: 75, y: 37.5, color: colors.gold },
  { x: 25, y: 75, color: colors.armor },
  { x: 62.5, y: 87.5, color: colors.cash },
  { x: 126, y: 60, color: colors.pink },
];

const turn = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

// a CSS animation instead of SMIL <animateTransform>, which never starts in the dashboard viewer
const Spin = styled.g`
  animation: ${turn} linear infinite;
`;

const MapBox = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
`;

const Bars = styled.div`
  display: flex;
  flex: none;
`;

const Track = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
`;

const Fill = styled(Flash)`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
`;

interface BarProps {
  field: string;
  colorField: string;
  defaultColor: string;
  threshold: number;
}

function useBar({ field, colorField, defaultColor, threshold }: BarProps) {
  const configured = useIsMetricFieldConfigured({ field });
  const reading = useMetricReading({ field, precision: 0, max: null });
  const color = useColor(colorField, defaultColor);
  const alerting = reading.bounded && threshold > 0 && reading.percent * 100 >= threshold;

  return { field, configured, percent: reading.percent, color, alerting };
}

const Minimap: FunctionComponent = () => {
  const { width, height } = useItemSize();
  const shape = useSelectField({ field: 'shape', defaultValue: 'square' });
  const speed = useNumberField({ field: 'rotation_speed', defaultValue: 3 });
  const barHeightValue = useNumberField({ field: 'bar_height', defaultValue: 6 });
  const hideRoute = useCheckboxField({ field: 'hide_route' });
  const hideBlips = useCheckboxField({ field: 'hide_blips' });
  const threshold = useNumberField({ field: 'alert_threshold', defaultValue: defaultAlertThreshold }) ?? 0;
  const bars = [
    useBar({ field: 'health_metric', colorField: 'health_color', defaultColor: colors.health, threshold }),
    useBar({ field: 'armor_metric', colorField: 'armor_color', defaultColor: colors.armor, threshold }),
    useBar({ field: 'special_metric', colorField: 'special_color', defaultColor: colors.special, threshold }),
  ].filter((bar) => bar.configured);

  const barHeight = bars.length > 0 ? Math.max(3, (height * clamp(barHeightValue ?? 6, 1, 30)) / 100) : 0;
  const gap = Math.max(2, barHeight * 0.5);
  const round = shape === 'round';
  const mapHeight = height - (bars.length > 0 ? barHeight + gap : 0);
  const boxWidth = round ? Math.min(width, mapHeight) : width;
  const border = Math.max(1.5, Math.min(width, height) * 0.012);
  const seconds = speed !== null && speed > 0 ? 360 / speed : 0;
  // the north marker turns back, so it stays upright while it circles
  const spin = (origin: string, reverse = false) =>
    seconds > 0
      ? {
          transformOrigin: origin,
          animationDuration: `${seconds}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }
      : { animation: 'none' };

  return (
    <Root style={{ justifyContent: 'center', alignItems: round ? 'center' : undefined }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: boxWidth, gap }}>
        <MapBox
          style={{
            // a round map is a square box, a stretched one would be an ellipse
            flex: round ? 'none' : undefined,
            height: round ? boxWidth : undefined,
            borderRadius: round ? '50%' : border * 2,
            border: `${border}px solid rgba(0, 0, 0, 0.6)`,
            boxShadow: `inset 0 0 ${border * 8}px rgba(0, 0, 0, 0.7)`,
            background: map.land,
          }}
        >
          <svg
            width='100%'
            height='100%'
            viewBox='0 0 100 100'
            preserveAspectRatio='xMidYMid slice'
            style={{ display: 'block' }}
          >
            <Spin style={spin('50px 50px')}>
              <rect x='18' y='56' width='16' height='12' fill={map.park} />
              <rect x='60' y='6' width='10' height='15' fill={map.park} />
              {streets.map((street) => (
                <path key={street.d} d={street.d} stroke={map.road} strokeWidth={street.width} />
              ))}
              <path
                d='M-40,120 C20,90 30,40 60,20 S100,-20 140,-30'
                stroke={map.highway}
                strokeWidth='2.4'
                fill='none'
              />
              <path d={water} fill={map.water} />
              <ellipse cx='10' cy='106' rx='26' ry='14' fill={map.water} />
              <path d='M92,30 H118 M95,60 H126 M90,96 H112' stroke={map.road} strokeWidth='0.9' />
              {islands.map((island) => (
                <ellipse key={island.cx} {...island} fill={map.land} />
              ))}
              {!hideRoute && (
                <g>
                  <path
                    d='M50,50 V25 H12.5 V0'
                    stroke={map.route}
                    strokeWidth='1.8'
                    fill='none'
                    strokeLinejoin='round'
                  />
                  <circle cx='12.5' cy='0' r='2.6' fill={map.route} stroke='black' strokeWidth='0.5' />
                </g>
              )}
              {!hideBlips &&
                blips.map((blip) => (
                  <circle
                    key={`${blip.x}-${blip.y}`}
                    cx={blip.x}
                    cy={blip.y}
                    r='2.2'
                    fill={blip.color}
                    stroke='black'
                    strokeWidth='0.5'
                  />
                ))}
              <g transform='translate(50 12)'>
                <Spin style={spin('0 0', true)}>
                  <circle r='3.6' fill='rgba(0, 0, 0, 0.75)' />
                  <text
                    y='1.5'
                    textAnchor='middle'
                    fontSize='4.4'
                    fontWeight='700'
                    fill='white'
                    fontFamily='Arial, sans-serif'
                  >
                    N
                  </text>
                </Spin>
              </g>
            </Spin>
            <polygon points='50,45.5 54,55 50,52.5 46,55' fill='white' stroke='black' strokeWidth='0.6' />
          </svg>
        </MapBox>
        {bars.length > 0 && (
          <Bars style={{ height: barHeight, gap }}>
            {bars.map((bar) => (
              <Track
                key={bar.field}
                style={{
                  background: withAlpha(bar.color, 0.3),
                  outline: `${Math.max(1, barHeight * 0.15)}px solid rgba(0, 0, 0, 0.6)`,
                }}
              >
                <Fill
                  $active={bar.alerting}
                  style={{
                    width: `${bar.percent * 100}%`,
                    background: bar.alerting ? colors.alert : bar.color,
                  }}
                />
              </Track>
            ))}
          </Bars>
        )}
      </div>
    </Root>
  );
};

export default Minimap;
