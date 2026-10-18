import type { Board, Pos, Side } from '../lib/checkers';

export type CompKind = 'monthly' | 'championship';
export type MatchStatus = 'scheduled' | 'invited' | 'live' | 'finished';
export type EndReason = 'played' | 'forfeit' | 'draw' | 'no-show';

export interface ArenaResult { winner: string | null; reason: EndReason }

export interface ArenaMatch {
  id: string;
  compId: string;
  round: string;
  /** Red, moves first. null = not decided yet (knockout bracket). */
  a: string | null;
  /** Black. */
  b: string | null;
  /** Epoch ms. null until both players are known. */
  startsAt: number | null;
  status: MatchStatus;
  accepted: { a: boolean; b: boolean };
  inviteExpiresAt?: number;
  botAcceptAt?: { a?: number; b?: number };
  liveSince?: number;
  result?: ArenaResult;
  /** Knockout only: where the winner goes next. */
  next?: { matchId: string; slot: 'a' | 'b' };
}

export interface Prize { place: string; tokens: number; to: string | null; paid: boolean; paidAt?: number }

export interface Competition {
  id: string;
  name: string;
  kind: CompKind;
  status: 'upcoming' | 'live' | 'completed';
  players: string[];
  prizePool: number;
  prizes: Prize[];
  matches: ArenaMatch[];
  gapMinutes: number;
  createdAt: number;
}

export interface GiftRecord { id: string; from: string; name: string; emoji: string; tokens: number; at: number }

export interface OfficialStream { live: boolean; title: string; featuredMatchId: string | null; startedAt: number | null }

export interface ArenaState {
  seededFor: string | null;
  seededAt: number;
  comps: Competition[];
  gifts: GiftRecord[];
  fundPaidOut: number;
  official: OfficialStream;
}

export interface BoardState { board: Board; turn: Side; cont: Pos | null; n: number; last: { from: Pos; to: Pos } | null }

export interface StandingRow { user: string; p: number; w: number; d: number; l: number; pts: number; form: ('W' | 'D' | 'L')[]; live: boolean }

export interface NewComp { name: string; kind: CompKind; players: string[]; prizePool: number; firstStartMinutes: number; gapMinutes: number }
