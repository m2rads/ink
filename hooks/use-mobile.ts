import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// A media query is an external store: subscribe to it instead of copying it
// into state from an effect. The server renders the desktop layout.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
