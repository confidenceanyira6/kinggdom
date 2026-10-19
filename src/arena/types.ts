import type { Board, Pos, Side } from '../lib/checkers';
import type { GameType } from '../types';

export type CompKind = 'monthly' | 'championship';
export type MatchStatus = 'scheduled' | 'invited' | 'live' | 'finished';
export type EndReason = 'played' | 'forfeit' | 'draw' | 'no-show';
export type SideName = 'White' | 'Black' | 'Red';

export interface ArenaResult { winner: string | null; reason: EndReason }

export interface ArenaMatch {
  id: string;
  compId: string;
  round: string;
  /** First player (White in chess, Red in checkers). null = not decided yet (knockout bracket). */
  a: string | null;
  /** Second player (Black). */
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
  game: GameType;
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

/** Live position of one match. Checkers uses board/turn/cont/last; chess uses fen/lastSq. */
export interface BoardState {
  board: Board;
  turn: Side;
  cont: Pos | null;
  n: number;
  last: { from: Pos; to: Pos } | null;
  fen: string;
  lastSq: { from: string; to: string } | null;
}

export interface StandingRow { user: string; p: number; w: number; d: number; l: number; pts: number; form: ('W' | 'D' | 'L')[]; live: boolean }

export interface NewComp { name: string; game: GameType; kind: CompKind; players: string[]; prizePool: number; firstStartMinutes: number; gapMinutes: number }
