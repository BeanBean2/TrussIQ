export type UiSoundCue = 'click' | 'solve' | 'pass';

let audioContext: AudioContext | null = null;

/** Short synthesized feedback tones; no audio assets or network requests are used. */
export function playUiSound(cue: UiSoundCue, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;

  try {
    audioContext ??= new AudioContextConstructor();
    const context = audioContext;
    const playTone = (frequency: number, endFrequency: number, duration: number, offset = 0, wave: OscillatorType = 'sine') => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime + offset;
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startAt + duration);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.035, startAt + Math.min(0.012, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.01);
    };

    const schedule = () => {
      if (cue === 'click') playTone(760, 430, 0.055, 0, 'sine');
      if (cue === 'solve') playTone(145, 90, 0.22, 0, 'triangle');
      if (cue === 'pass') {
        playTone(660, 660, 0.10, 0, 'sine');
        playTone(880, 880, 0.14, 0.08, 'sine');
      }
    };

    if (context.state === 'suspended') void context.resume().then(schedule).catch(() => undefined);
    else schedule();
  } catch {
    // Audio is optional; restricted or unavailable audio must not interrupt editing.
  }
}
