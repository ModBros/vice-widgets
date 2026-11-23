import styled, { css, keyframes } from 'styled-components';

const flashKeyframes = keyframes`
  50% {
    opacity: 0.25;
  }
`;

// for elements that flash while a value is above the alert threshold
export const flashing = css`
  animation: ${flashKeyframes} 0.8s steps(1, end) infinite;
`;

export const Root = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  line-height: 1;
  user-select: none;
`;

export const Flash = styled.div<{ $active: boolean }>`
  ${(props) => props.$active && flashing}
`;
