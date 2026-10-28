import type { AppNotification, ChatPreview, Community, Gift, GameType, LeaderboardEntry, Match, Message, Period, Post, ProfileSetup, TokenPackage, Tournament, Transaction, User } from '../types';

/**
 * The single contract between the UI and any backend.
 * The UI only ever talks to `api` (see ./api.ts). To go live, implement this
 * interface in ./backendApi.ts and set VITE_USE_MOCK=false. No screen changes needed.
 */
export interface ApiClient {
  auth: {
    signUp(i: { name: string; identifier: string; password: string }): Promise<User>;
    logIn(i: { identifier: string; password: string }): Promise<User>;
    social(provider: 'google' | 'apple' | 'facebook'): Promise<User>;
    completeProfile(i: ProfileSetup): Promise<{ user: User; referralCode: string; starterTokens: number }>;
    logOut(): Promise<void>;
  };
  feed: {
    list(): Promise<Post[]>;
    create(i: { text: string; kind: Post['kind']; images?: File[] }): Promise<Post>;
    like(id: string): Promise<void>;
    save(id: string): Promise<void>;
    comment(id: string, text: string): Promise<void>;
    report(id: string, reason: string): Promise<void>;
  };
  users: {
    get(username: string): Promise<User | null>;
    search(q: string, kind: 'users' | 'streamers' | 'games'): Promise<User[]>;
    follow(username: string): Promise<boolean>;
    update(patch: Partial<User>): Promise<User>;
    friends(): Promise<User[]>;
    requests(): Promise<User[]>;
  };
  matches: { live(): Promise<Match[]>; get(id: string): Promise<Match | null> };
  tournaments: {
    list(status?: Tournament['status']): Promise<Tournament[]>;
    get(id: string): Promise<Tournament | null>;
    join(id: string): Promise<Tournament>;
    create(i: { name: string; game: GameType; prizePool: number; entryFee: number; maxPlayers: number }): Promise<Tournament>;
  };
  leaderboard: { get(period: Period): Promise<LeaderboardEntry[]> };
  wallet: {
    get(): Promise<{ tokens: number; usd: number; transactions: Transaction[] }>;
    packages(): Promise<TokenPackage[]>;
    buy(packageId: string, method: string): Promise<number>;
    deposit(amount: number): Promise<number>;
    withdraw(amount: number): Promise<number>;
  };
  gifts: {
    list(): Promise<Gift[]>;
    send(i: { to: string; giftId: string; qty: number }): Promise<number>;
  };
  notifications: { list(): Promise<AppNotification[]>; markAllRead(): Promise<void> };
  chat: {
    list(): Promise<ChatPreview[]>;
    messages(id: string): Promise<Message[]>;
    send(id: string, text: string): Promise<Message>;
  };
  communities: { list(): Promise<Community[]>; join(id: string): Promise<Community> };
  games: { report(i: { game: GameType; result: 'win' | 'loss' | 'draw'; mode: string }): Promise<{ tokens: number }> };
  referral: { get(): Promise<{ code: string; invited: number; earned: number }> };
}
