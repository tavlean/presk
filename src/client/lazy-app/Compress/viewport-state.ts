export const mobileWidthMediaQuery = '(max-width: 599px)';

export interface ViewportState {
  mobileView: boolean;
}

export function getViewportState(matchesMobileWidth: boolean): ViewportState {
  return {
    mobileView: matchesMobileWidth,
  };
}
