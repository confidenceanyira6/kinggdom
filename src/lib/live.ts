import { supabase, callFunction } from './supabase';

/** Go-live from inside a game. The server (kingdom.start_game_stream etc.) decides who may publish. */
export type LiveGame = 'chess' | 'checkers';
type Status = 'scheduled' | 'live' | 'ended';
type PStatus = 'invited' | 'accepted' | 'declined';

export interface LiveStreamRow { id: string; streamer_id: string; status: Status }
export interface LiveParticipant { user_id: string; role: string; status: PStatus }
export interface LiveState {
  stream_id: string;
  status: Status;
  host_id: string;
  me_status: PStatus | null;
  participants: LiveParticipant[];
}

function unwrap<T>(r: { data: unknown; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

/** Alone (vs AI / pass and play): live right away. */
export async function startSoloStream(game: LiveGame, title: string): Promise<LiveStreamRow> {
  return unwrap<LiveStreamRow>(await supabase.rpc('start_stream', { p_title: title, p_game_type: game, p_kind: 'video', p_tags: [game] }));
}

/** In a real game: live right away if there is no human opponent, otherwise a pending request the opponent must accept. */
export async function startGameStream(game: LiveGame, title: string, gameId: string): Promise<LiveStreamRow> {
  return unwrap<LiveStreamRow>(await supabase.rpc('start_game_stream', { p_game_type: game, p_title: title, p_game: gameId }));
}

export async function respondInvite(streamId: string, accept: boolean): Promise<void> {
  unwrap<unknown>(await supabase.rpc('respond_stream_invite', { p_stream: streamId, p_accept: accept }));
}

export async function endStream(streamId: string): Promise<void> {
  await supabase.rpc('end_stream', { p_stream: streamId });
}

export async function leaveGameStream(streamId: string): Promise<void> {
  await supabase.rpc('leave_game_stream', { p_stream: streamId });
}

export async function gameStreamState(gameId: string, streamId: string | null): Promise<LiveState | null> {
  return unwrap<LiveState | null>(await supabase.rpc('game_stream_state', { p_game: gameId, p_stream: streamId }));
}

export function streamToken(streamId: string) {
  return callFunction<{ token: string; url: string; role: string }>('stream-token', { stream_id: streamId });
}
