import { useEffect, useRef, useState } from 'react';

/**
 * Opens the microphone and reports a 0..1 input level. The audio is not played back (no echo).
 * Sending it to the opponent is done peer-to-peer once the realtime backend is connected.
 */
export function useMic(enabled: boolean) {
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) { setLevel(0); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Microphone is not supported on this device'); return; }
    let dead = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      .then((st) => {
        if (dead) { st.getTracks().forEach((t) => t.stop()); return; }
        stream = st;
        setError(null);
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        const src = ctx.createMediaStreamSource(st);
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        const loop = () => {
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
          const v = Math.min(1, peak / 64);
          if (Math.abs(v - last.current) > 0.06) { last.current = v; setLevel(v); }
          raf = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch(() => { if (!dead) setError('Microphone blocked. Allow mic access to talk'); });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (ctx) ctx.close().catch(() => undefined);
    };
  }, [enabled]);

  return { level, error };
}
