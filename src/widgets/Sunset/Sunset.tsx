import { useCheckboxField, useItemSize, useNumberField, useSelectField } from '@modbros/dashboard-sdk';
import React, { type FunctionComponent, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

import { Root } from '../../components/Widget';
import { clamp, random } from '../../utils/theme';
import { useSvgId } from '../../utils/useSvgId';

interface Scene {
  sky: string[];
  sun: [string, string];
  sea: [string, string];
  silhouette: string;
  windows: string[];
  stars: boolean;
}

const scenes: Record<string, Scene> = {
  sunset: {
    sky: ['#2a0d4a', '#7a1f6e', '#ff3d7f', '#ff9a4d', '#ffd27a'],
    sun: ['#fff1a8', '#ff2e88'],
    sea: ['#c2306f', '#1a0730'],
    silhouette: '#1a0726',
    windows: ['#ffd27a'],
    stars: false,
  },
  dusk: {
    sky: ['#0f1a4a', '#3b2a8a', '#a83fa0', '#ff6f91', '#ffb07a'],
    sun: ['#ffd1e8', '#ff5fa2'],
    sea: ['#6a2a8a', '#0c0a2e'],
    silhouette: '#0b0820',
    windows: ['#ff2e88', '#22e4d9', '#ffd27a'],
    stars: true,
  },
  night: {
    sky: ['#05040f', '#0c0a2e', '#1f1050', '#47197a', '#7a2a8a'],
    sun: ['#ffb3e6', '#9b3cf0'],
    sea: ['#2a1460', '#05040f'],
    silhouette: '#020108',
    windows: ['#ff2e88', '#22e4d9', '#9b3cf0', '#ffd27a'],
    stars: true,
  },
};

const shimmer = keyframes`
  50% {
    opacity: 0.35;
  }
`;

const Reflection = styled.rect<{ $delay: number }>`
  animation: ${shimmer} 3s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;

// a palm tree silhouette: a curved, tapering trunk and drooping fronds
function palmPaths(baseX: number, baseY: number, height: number, lean: number): string[] {
  const crownX = baseX + lean * height * 0.35;
  const crownY = baseY - height;
  const controlX = baseX + lean * height * 0.02;
  const controlY = baseY - height * 0.55;
  const width = height * 0.045;
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    // a point on the quadratic curve and its tangent
    const x = (1 - t) ** 2 * baseX + 2 * (1 - t) * t * controlX + t ** 2 * crownX;
    const y = (1 - t) ** 2 * baseY + 2 * (1 - t) * t * controlY + t ** 2 * crownY;
    const dx = 2 * (1 - t) * (controlX - baseX) + 2 * t * (crownX - controlX);
    const dy = 2 * (1 - t) * (controlY - baseY) + 2 * t * (crownY - controlY);
    const length = Math.hypot(dx, dy) || 1;
    const half = (width * (1 - t * 0.55)) / 2;

    left.push(`${(x - (dy / length) * half).toFixed(1)},${(y + (dx / length) * half).toFixed(1)}`);
    right.unshift(`${(x + (dy / length) * half).toFixed(1)},${(y - (dx / length) * half).toFixed(1)}`);
  }

  const paths = [`M${left.join('L')}L${right.join('L')}Z`];
  const fronds = [-172, -150, -122, -95, -62, -32, -8, 18, 158];

  for (const degrees of fronds) {
    const angle = ((degrees + lean * 12) * Math.PI) / 180;
    const length = height * (0.36 + 0.06 * Math.cos(angle * 3));
    const tipX = crownX + Math.cos(angle) * length;
    const tipY = crownY + Math.sin(angle) * length + length * 0.45;
    const midX = (crownX + tipX) / 2;
    const midY = (crownY + tipY) / 2 - length * 0.28;
    const dx = tipX - crownX;
    const dy = tipY - crownY;
    const norm = Math.hypot(dx, dy) || 1;
    const nx = (-dy / norm) * length * 0.11;
    const ny = (dx / norm) * length * 0.11;

    paths.push(
      `M${crownX.toFixed(1)},${crownY.toFixed(1)}` +
        `Q${(midX + nx).toFixed(1)},${(midY + ny).toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)}` +
        `Q${(midX - nx * 0.4).toFixed(1)},${(midY - ny * 0.4).toFixed(1)} ${crownX.toFixed(1)},${crownY.toFixed(1)}Z`,
    );
  }

  return paths;
}

interface Building {
  x: number;
  width: number;
  height: number;
  windows: { x: number; y: number; color: string }[];
}

// the skyline of the city on the horizon
function skyline(width: number, horizon: number, maxHeight: number, windowColors: string[]): Building[] {
  const next = random(7);
  const buildings: Building[] = [];
  let x = width * 0.12;

  while (x < width * 0.88) {
    // taller towers in the middle, like a downtown
    const center = 1 - Math.abs(x / width - 0.5) * 1.6;
    const buildingWidth = width * (0.012 + next() * 0.022);
    const height = maxHeight * clamp(0.15 + center * 0.55 + next() * 0.4, 0.1, 1);
    const windows = [];
    const step = Math.max(3, buildingWidth / 3);

    for (let wy = horizon - height + step; wy < horizon - step; wy += step * 1.4) {
      for (let wx = x + step * 0.6; wx < x + buildingWidth - step * 0.6; wx += step) {
        if (next() < 0.22) {
          windows.push({ x: wx, y: wy, color: windowColors[Math.floor(next() * windowColors.length)] });
        }
      }
    }

    buildings.push({ x, width: buildingWidth, height, windows });
    x += buildingWidth + width * next() * 0.006;
  }

  return buildings;
}

const Sunset: FunctionComponent = () => {
  const id = useSvgId();
  const { width, height } = useItemSize();
  const sceneName = useSelectField({ field: 'scene', defaultValue: 'sunset' });
  const horizonValue = useNumberField({ field: 'horizon', defaultValue: 68 });
  const hideSun = useCheckboxField({ field: 'hide_sun' });
  const hideSkyline = useCheckboxField({ field: 'hide_skyline' });
  const hidePalms = useCheckboxField({ field: 'hide_palms' });
  const hideShimmer = useCheckboxField({ field: 'hide_shimmer' });
  const scene = scenes[sceneName ?? 'sunset'] ?? scenes.sunset;
  const horizon = (height * clamp(horizonValue ?? 68, 20, 95)) / 100;
  const sunRadius = Math.min(width * 0.2, height * 0.32);
  const sunY = horizon - sunRadius * 0.45;

  const drawing = useMemo(() => {
    const next = random(3);
    const stars = Array.from({ length: 70 }, () => ({
      x: next() * width,
      y: next() * horizon * 0.8,
      r: 0.5 + next() * 1.2,
    }));
    const buildings = skyline(width, horizon, height * 0.2, scene.windows);
    const unit = Math.min(height, width * 0.7);
    const palms = [
      ...palmPaths(width * 0.06, height + 4, unit * 0.82, 0.55),
      ...palmPaths(width * 0.16, height + 4, unit * 0.6, 0.25),
      ...palmPaths(width * 0.93, height + 4, unit * 0.74, -0.5),
    ];

    return { stars, buildings, palms };
  }, [width, height, horizon, scene]);

  // the gaps cut into the sun above the skyline, wider towards the horizon
  const sunStripes = Array.from({ length: 6 }, (_, i) => {
    const y = sunY - sunRadius * (0.45 - i * 0.16);

    return { y, height: sunRadius * (0.02 + i * 0.018) };
  });

  const reflections = Array.from({ length: 9 }, (_, i) => {
    const y = horizon + ((height - horizon) * (i + 0.5)) / 10;
    const lineWidth = sunRadius * (1.5 - i * 0.12);

    return { y, x: width / 2 - lineWidth / 2, width: lineWidth, height: Math.max(1, (height - horizon) * 0.018) };
  });

  return (
    <Root>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`${id}-sky`} x1='0' y1='0' x2='0' y2='1'>
            {scene.sky.map((stop, i) => (
              <stop key={stop} offset={i / (scene.sky.length - 1)} stopColor={stop} />
            ))}
          </linearGradient>
          <linearGradient id={`${id}-sun`} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor={scene.sun[0]} />
            <stop offset='1' stopColor={scene.sun[1]} />
          </linearGradient>
          <linearGradient id={`${id}-sea`} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor={scene.sea[0]} />
            <stop offset='1' stopColor={scene.sea[1]} />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop offset='0' stopColor={scene.sun[1]} stopOpacity='0.55' />
            <stop offset='1' stopColor={scene.sun[1]} stopOpacity='0' />
          </radialGradient>
          <mask id={`${id}-stripes`}>
            <rect x='0' y='0' width={width} height={horizon} fill='white' />
            {sunStripes.map((stripe) => (
              <rect key={stripe.y} x='0' y={stripe.y} width={width} height={stripe.height} fill='black' />
            ))}
          </mask>
        </defs>

        <rect x='0' y='0' width={width} height={horizon} fill={`url(#${id}-sky)`} />
        {scene.stars &&
          drawing.stars.map((star) => (
            <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.r} fill='white' opacity='0.7' />
          ))}

        {!hideSun && (
          <g>
            <circle cx={width / 2} cy={sunY} r={sunRadius * 2.2} fill={`url(#${id}-glow)`} />
            <circle cx={width / 2} cy={sunY} r={sunRadius} fill={`url(#${id}-sun)`} mask={`url(#${id}-stripes)`} />
          </g>
        )}

        {!hideSkyline &&
          drawing.buildings.map((building) => (
            <g key={building.x}>
              <rect
                x={building.x}
                y={horizon - building.height}
                width={building.width}
                height={building.height + 1}
                fill={scene.silhouette}
              />
              {building.windows.map((window) => (
                <rect
                  key={`${window.x}-${window.y}`}
                  x={window.x}
                  y={window.y}
                  width='1.6'
                  height='1.6'
                  fill={window.color}
                  opacity='0.8'
                />
              ))}
            </g>
          ))}

        <rect x='0' y={horizon} width={width} height={height - horizon} fill={`url(#${id}-sea)`} />
        {!hideSun &&
          reflections.map((line, i) =>
            hideShimmer ? (
              <rect key={line.y} {...line} fill={scene.sun[0]} opacity='0.45' />
            ) : (
              <Reflection key={line.y} {...line} $delay={i * 0.3} fill={scene.sun[0]} opacity='0.45' />
            ),
          )}

        {!hidePalms && drawing.palms.map((path) => <path key={path} d={path} fill={scene.silhouette} />)}
      </svg>
    </Root>
  );
};

export default Sunset;
