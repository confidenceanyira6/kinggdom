import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useApp } from '../store/useApp';
import { endStream, gameStreamState, leaveGameStream, respondInvite, startGameStream, startSoloStream, streamToken } from '../lib/live';
import type { LiveGame } from '../lib/live';

/**
 * off      = not live
 * starting = creating the stream / opening the camera
 * pending  = I asked my opponent to go live with me; waiting for them to accept
 * invited  = my opponent asked me; I must accept before anything is shared
 * live     = camera and mic are on and viewers can watch
 */
export type LivePhase = 'off' | 'starting' | 'pending' | 'invited' | 'live';

interface Opts {
  game: LiveGame;
  title: string;
  /** Real two-player game id. Leave out for AI / pass-and-play (live starts at once). */
  gameId?: string | null;
  meId: string;
  /** Stop watching for requests when the game is over. */
  active?: boolean;
}

async function errMsg(e: unknown): Promise<string> {
  const ctx = (e as { context?: { json?: () => Promise<{ error?: string }> } })?.context;
  try {
    if (ctx?.json) {
      const b = await ctx.json();
      if (b?.error) return nice(String(b.error));
    }
  } catch { /* fall through */ }
  return nice((e as Error)?.message ?? 'Could not go live');
}
const nice = (m: string) => (/livekit|not configured/i.test(m) ? 'Live video is not set up yet. Please try again later.' : m);

export function useGameLive({ game, title, gameId = null, meId, active = true }: Opts) {
  const toast = useApp((s) => s.toast);
  const [phase, setPhaseState] = useState<LivePhase>('off');
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const phaseRef = useRef<LivePhase>('off');
  const sidRef = useRef<string | null>(null);
  const hostRef = useRef(false);
  const room = useRef<Room | null>(null);
  const busy = useRef(false);

  const setPhase = (p: LivePhase) => { phaseRef.current = p; setPhaseState(p); };

  const dropRoom = () => {
    const r = room.current;
    room.current = null;
    if (r) { r.removeAllListeners(); void r.disconnect(); }
    document.querySelectorAll('audio[data-kg-live]').forEach((el) => el.remove());
    setStreams({});
  };

  const connect = async (sid: string) => {
    const t = await streamToken(sid);
    const r = new Room({ adaptiveStream: true, dynacast: true });
    room.current = r;
    const put = (id: string, track: MediaStreamTrack | null) =>
      setStreams((cur) => {
        const n = { ...cur };
        if (track) n[id] = new MediaStream([track]); else delete n[id];
        return n;
      });
    r.on(RoomEvent.TrackSubscribed, (track, _pub, p) => {
      if (track.kind === Track.Kind.Video) put(p.identity, track.mediaStreamTrack);
      else if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.setAttribute('data-kg-live', '1');
        el.style.display = 'none';
        document.body.appendChild(el);
      }
    });
    r.on(RoomEvent.TrackUnsubscribed, (track, _pub, p) => {
      if (track.kind === Track.Kind.Video) put(p.identity, null);
      else track.detach().forEach((el) => el.remove());
    });
    r.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === Track.Source.Camera && pub.track) put(r.localParticipant.identity, pub.track.mediaStreamTrack);
    });
    r.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.source === Track.Source.Camera) put(r.localParticipant.identity, null);
    });
    await r.connect(t.url, t.token);
    try { await r.localParticipant.setCameraEnabled(true); } catch { toast('Camera blocked. Allow camera access so people can see you.'); }
    try { await r.localParticipant.setMicrophoneEnabled(true); } catch { /* mic is optional */ }
  };

  const reset = () => { dropRoom(); sidRef.current = null; hostRef.current = false; setPhase('off'); };

  /** Tap "Go Live". Alone = live now. Against another player = request, they must accept first. */
  const goLive = async () => {
    if (phaseRef.current !== 'off' || busy.current) return;
    busy.current = true;
    setPhase('starting');
    let created: string | null = null;
    try {
      const s = gameId ? await startGameStream(game, title, gameId) : await startSoloStream(game, title);
      sidRef.current = s.id;
      if (s.streamer_id !== meId) {
        // My opponent already asked first: show their request instead of starting a new one.
        hostRef.current = false;
        setPhase('invited');
        return;
      }
      created = s.id;
      hostRef.current = true;
      if (s.status === 'live') { await connect(s.id); setPhase('live'); } else setPhase('pending');
    } catch (e) {
      if (created) await endStream(created);
      reset();
      toast(await errMsg(e));
    } finally { busy.current = false; }
  };

  const accept = async () => {
    const sid = sidRef.current;
    if (!sid || busy.current) return;
    busy.current = true;
    try {
      await respondInvite(sid, true);
      setPhase('starting');
      await connect(sid);
      setPhase('live');
    } catch (e) {
      await leaveGameStream(sid);
      reset();
      toast(await errMsg(e));
    } finally { busy.current = false; }
  };

  const decline = async () => {
    const sid = sidRef.current;
    if (!sid) return;
    try { await respondInvite(sid, false); } catch { /* already expired */ }
    reset();
  };

  const stop = async () => {
    const sid = sidRef.current;
    const host = hostRef.current;
    reset();
    if (sid) { if (host) await endStream(sid); else await leaveGameStream(sid); }
  };

  // Watch the game for a live request (or for my request being accepted / declined).
  useEffect(() => {
    if (!gameId || !active) return;
    let dead = false;
    const tick = async () => {
      if (dead || busy.current) return;
      const p = phaseRef.current;
      let st;
      try { st = await gameStreamState(gameId, p === 'pending' || p === 'live' ? sidRef.current : null); } catch { return; }
      if (dead || busy.current || phaseRef.current !== p) return;
      if (!st || st.status === 'ended') {
        if (p === 'invited') { reset(); toast('The live request was cancelled'); }
        else if (p === 'pending' || p === 'live') {
          const declined = !!st?.participants.some((x) => x.role !== 'host' && x.status === 'declined');
          reset();
          toast(p === 'live' ? 'Live ended' : declined ? 'Your opponent declined to go live' : 'The live request expired');
        }
        return;
      }
      if (st.status === 'scheduled' && p === 'off' && st.me_status === 'invited') {
        sidRef.current = st.stream_id;
        hostRef.current = false;
        setPhase('invited');
      } else if (st.status === 'live' && p === 'pending') {
        busy.current = true;
        try { await connect(st.stream_id); setPhase('live'); }
        catch (e) { const m = await errMsg(e); const sid = st.stream_id; reset(); await endStream(sid); toast(m); }
        finally { busy.current = false; }
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), 3000);
    return () => { dead = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, active]);

  // Leaving the screen ends my camera (and the stream, if I started it).
  useEffect(() => () => {
    const sid = sidRef.current;
    const host = hostRef.current;
    const live = phaseRef.current !== 'off';
    const r = room.current;
    room.current = null;
    if (r) { r.removeAllListeners(); void r.disconnect(); }
    document.querySelectorAll('audio[data-kg-live]').forEach((el) => el.remove());
    if (sid && live) void (host ? endStream(sid) : leaveGameStream(sid));
  }, []);

  return { phase, streams, goLive, stop, accept, decline };
}
