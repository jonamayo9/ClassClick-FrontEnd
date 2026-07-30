let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available
  }
}

export function playSuccessSound() {
  playTone(880, 0.15)
  setTimeout(() => playTone(1100, 0.2), 100)
}

export function playWarningSound() {
  playTone(660, 0.15)
  setTimeout(() => playTone(440, 0.2), 120)
}

export function playErrorSound() {
  playTone(330, 0.15)
  setTimeout(() => playTone(220, 0.25), 150)
}

export function vibrateSuccess() {
  try {
    if ('vibrate' in navigator) navigator.vibrate(100)
  } catch { /* not supported */ }
}

export function vibrateWarning() {
  try {
    if ('vibrate' in navigator) navigator.vibrate([60, 40, 60])
  } catch { /* not supported */ }
}

export function vibrateError() {
  try {
    if ('vibrate' in navigator) navigator.vibrate(300)
  } catch { /* not supported */ }
}
