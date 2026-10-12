export type GameType = 'chess' | 'checkers';
export type Period = 'global' | 'weekly' | 'monthly';

export interface User {
  id: string;
  name: string;
  username: string;
  level: number;
  bio: string;
  country: string;
  rating: number;
  followers: number;
  following: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  badges: string[];
  premium?: boolean;
  online?: boolean;
  isFollowing?: boolean;
  favoriteGame?: GameType;
  skill?: string;
  gender?: string;
  profileComplete?: boolean;
}

export interface Post {
  id: string;
  author: User;
  kind: 'text' | 'image' | 'video' | 'replay' | 'puzzle' | 'tournament' | 'stream';
  text: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  saved: boolean;
  createdAt: string;
}

export interface Match {
  id: string;
  game: GameType;
  title: string;
  white: User;
  black: User;
  viewers: number;
  live: boolean;
  round?: string;
}

export interface Tournament {
  id: string;
  name: string;
  game: GameType;
  prizePool: number;
  entryFee: number;
  players: number;
  maxPlayers: number;
  startsIn: string;
  status: 'live' | 'upcoming' | 'completed';
  description: string;
  rewards: { place: string; tokens: number }[];
  joined: boolean;
}

export interface AppNotification {
  id: string;
  type: 'gift' | 'comment' | 'live' | 'tournament' | 'reward' | 'follow' | 'message';
  text: string;
  sub?: string;
  user?: string;
  time: string;
  read: boolean;
}

export interface ChatPreview {
  id: string;
  name: string;
  last: string;
  time: string;
  unread: number;
  group?: boolean;
  online?: boolean;
}

export interface Message {
  id: string;
  from: 'me' | 'them';
  text: string;
  time: string;
}

export interface Transaction {
  id: string;
  label: string;
  amount: number;
  time: string;
  kind: 'received' | 'sent' | 'tournament' | 'gift' | 'deposit' | 'withdraw' | 'purchase';
}

export interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  popular?: boolean;
}

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

export interface Community {
  id: string;
  name: string;
  members: number;
  preview: string;
  joined: boolean;
  scope: 'global' | 'groups';
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
}

export interface ProfileSetup {
  username: string;
  country: string;
  favoriteGame: GameType;
  skill: string;
  referralCode?: string;
}
