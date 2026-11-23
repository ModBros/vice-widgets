import {
  useActionField,
  useItemSize,
  useRipple,
  useSelectField,
  useStringField,
  useSystemTime,
} from '@modbros/dashboard-sdk';
import React, { type FunctionComponent, type MouseEvent, type ReactNode } from 'react';
import styled from 'styled-components';

import { Root } from '../../components/Widget';
import { colors, outline, uiFontFamily, useFontFamily } from '../../utils/theme';

const wallpapers: Record<string, string> = {
  sunset: 'linear-gradient(170deg, #2a0d4a 0%, #7a1f6e 35%, #ff3d7f 70%, #ffb35c 100%)',
  dusk: 'linear-gradient(170deg, #0f1a4a 0%, #3b2a8a 40%, #a83fa0 75%, #ff6f91 100%)',
  night: 'linear-gradient(170deg, #05040f 0%, #120a3a 45%, #47197a 100%)',
};

// app icons drawn in a 24 x 24 box with white strokes
const glyphs: Record<string, { color: string; icon: ReactNode }> = {
  web: {
    color: '#2d8cf0',
    icon: (
      <>
        <circle cx='12' cy='12' r='8' />
        <path d='M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16' />
      </>
    ),
  },
  chat: {
    color: '#3ddc84',
    icon: <path d='M5 6h14v9H10l-4 3v-3H5z' />,
  },
  mail: {
    color: '#ff8a3d',
    icon: <path d='M4 7h16v10H4zM4 7l8 6 8-6' />,
  },
  music: {
    color: '#ff2e88',
    icon: (
      <>
        <path d='M10 17V6l9-2v11' />
        <circle cx='8' cy='17' r='2' />
        <circle cx='17' cy='15' r='2' />
      </>
    ),
  },
  play: {
    color: '#e8233e',
    icon: <path d='M9 7v10l8-5z' />,
  },
  map: {
    color: '#22e4d9',
    icon: (
      <>
        <path d='M12 20s-6-6-6-10a6 6 0 0 1 12 0c0 4-6 10-6 10z' />
        <circle cx='12' cy='10' r='2' />
      </>
    ),
  },
  lock: {
    color: '#9b3cf0',
    icon: (
      <>
        <path d='M6 11h12v9H6z' />
        <path d='M9 11V8a3 3 0 0 1 6 0v3' />
      </>
    ),
  },
  power: {
    color: '#555066',
    icon: <path d='M12 4v8M7.5 7a7 7 0 1 0 9 0' />,
  },
};

// the apps of the four slots until the user picks others
const slots = [
  { slot: 1, icon: 'web', label: 'Internet' },
  { slot: 2, icon: 'chat', label: 'Messages' },
  { slot: 3, icon: 'music', label: 'Music' },
  { slot: 4, icon: 'lock', label: 'Lock' },
];
const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const App = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;

  &:active > div {
    transform: scale(0.92);
  }
`;

const Tile = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
`;

function clockText(now: Date, format: string | null): string {
  const minutes = String(now.getMinutes()).padStart(2, '0');

  if (format === '12h') {
    return `${now.getHours() % 12 || 12}:${minutes}`;
  }

  return `${String(now.getHours()).padStart(2, '0')}:${minutes}`;
}

const AppButton: FunctionComponent<{ slot: number; icon: string; label: string; size: number }> = (props) => {
  const { slot, size } = props;
  const label = useStringField({ field: `app_${slot}_label`, defaultValue: props.label });
  const iconName = useSelectField({ field: `app_${slot}_icon`, defaultValue: props.icon });
  const action = useActionField({ field: `app_${slot}_action` });
  const ripple = useRipple();
  const glyph = glyphs[iconName ?? 'none'];

  if (!glyph) {
    return null;
  }

  const onClick = (event: MouseEvent) => {
    ripple(event.clientX, event.clientY);
    action()?.catch(() => undefined);
  };

  return (
    <App onClick={onClick} style={{ gap: size * 0.1, width: size * 1.2 }}>
      <Tile
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.24,
          background: glyph.color,
          boxShadow: `0 ${size * 0.05}px ${size * 0.15}px rgba(0, 0, 0, 0.45)`,
        }}
      >
        <svg
          viewBox='0 0 24 24'
          width={size * 0.62}
          height={size * 0.62}
          fill='none'
          stroke='white'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          {glyph.icon}
        </svg>
      </Tile>
      {label && <span style={{ fontSize: size * 0.2, textShadow: outline(size * 0.015) }}>{label}</span>}
    </App>
  );
};

const Phone: FunctionComponent = () => {
  const { width, height } = useItemSize();
  const now = useSystemTime({ autoRefresh: true, refreshInterval: 1000 });
  const format = useSelectField({ field: 'clock_format', defaultValue: '24h' });
  const wallpaper = useSelectField({ field: 'wallpaper', defaultValue: 'sunset' });
  const fontFamily = useFontFamily(uiFontFamily);

  // the phone keeps its shape and sits in the middle of the widget
  const phoneHeight = Math.min(height, width * 2.05);
  const phoneWidth = phoneHeight / 2.05;
  const bezel = phoneWidth * 0.045;
  const tile = phoneWidth * 0.26;
  const time = now ? clockText(now, format) : '--:--';
  const date = now ? `${weekdays[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}` : '';

  return (
    <Root style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: phoneWidth,
          height: phoneHeight,
          padding: bezel,
          boxSizing: 'border-box',
          borderRadius: phoneWidth * 0.14,
          background: '#0d0b12',
          boxShadow: `inset 0 0 0 ${Math.max(1, bezel * 0.25)}px #3a3545, 0 ${bezel}px ${bezel * 3}px rgba(0, 0, 0, 0.5)`,
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%',
            overflow: 'hidden',
            borderRadius: phoneWidth * 0.1,
            background: wallpapers[wallpaper ?? 'sunset'] ?? wallpapers.sunset,
            color: colors.white,
            fontFamily,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignSelf: 'stretch',
              padding: `${phoneWidth * 0.04}px ${phoneWidth * 0.08}px`,
              fontSize: phoneWidth * 0.055,
              fontWeight: 700,
            }}
          >
            <span>{time}</span>
            <span style={{ letterSpacing: '0.1em' }}>▂▄▆ ▮</span>
          </div>
          <div
            style={{
              marginTop: phoneHeight * 0.06,
              fontSize: phoneWidth * 0.26,
              fontWeight: 300,
              textShadow: `0 0 ${phoneWidth * 0.04}px rgba(0, 0, 0, 0.4)`,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {time}
          </div>
          <div style={{ fontSize: phoneWidth * 0.07, fontWeight: 700, letterSpacing: '0.12em', marginTop: '0.4em' }}>
            {date}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignContent: 'flex-end',
              gap: tile * 0.25,
              flex: 1,
              paddingBottom: phoneHeight * 0.07,
            }}
          >
            {slots.map((app) => (
              <AppButton key={app.slot} {...app} size={tile} />
            ))}
          </div>
        </div>
      </div>
    </Root>
  );
};

export default Phone;
