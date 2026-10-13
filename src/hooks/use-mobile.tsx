import * as React from "react";

// The sidebar switches to an overlay drawer below this width. It is deliberately
// set above the iPad portrait range (iPad Mini 744px, Air/Pro 11" 820-834px,
// Pro 12.9" 1024px) so a tablet held upright gets the full width for content
// instead of losing 16rem of it to a permanently docked sidebar.
const MOBILE_BREAKPOINT = 1024;

// True phone widths, for cases where a tablet should keep the richer layout.
const PHONE_BREAKPOINT = 640;

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return !!matches;
}

/** Phone *or* tablet in portrait: the sidebar collapses to a drawer. */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/** Phones only. */
export function useIsPhone() {
  return useMediaQuery(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
}

/** Tablet range - wide enough for multi-column, too narrow for a docked sidebar. */
export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${PHONE_BREAKPOINT}px) and (max-width: ${MOBILE_BREAKPOINT - 1}px)`,
  );
}
