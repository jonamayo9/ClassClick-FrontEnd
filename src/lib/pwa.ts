export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return navigatorWithStandalone.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
}

export function isMobileBrowser(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}
