import { useEffect, useState } from 'react';

/**
 * Opens the front camera for a face-cam preview. Video only (no mic prompt).
 * Tracks are stopped when `enabled` flips off or the page unmounts.
 * This is a local preview; sending it to viewers needs the live video service.
 */
export function useCamera(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera is not supported on this device'); return; }
    let dead = false;
    let s: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false })
      .then((st) => {
        if (dead) { st.getTracks().forEach((t) => t.stop()); return; }
        s = st;
        setError(null);
        setStream(st);
      })
      .catch(() => { if (!dead) setError('Camera blocked. Allow camera access to show your face'); });
    return () => {
      dead = true;
      s?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [enabled]);

  return { stream, error };
}
