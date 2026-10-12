import type { User, Post, Match, Tournament, AppNotification, ChatPreview, Transaction, TokenPackage, Gift, Community } from '../types';

const mk = (username: string, level: number, rating: number, x: Partial<User> = {}): User => ({
  id: username.toLowerCase(),
  name: username,
  username,
  level,
  bio: 'Chess is not just a game, it is a lifestyle.',
  country: 'Nigeria',
  rating,
  followers: 120,
  following: 80,
  games: 600,
  wins: 300,
  losses: 220,
  draws: 80,
  badges: ['crown', 'star', 'trophy'],
  online: false,
  isFollowing: false,
  profileComplete: true,
  ...x,
});

export const users: User[] = [
  mk('KingMaster23', 15, 2150, { followers: 2400, following: 180, games: 2400, wins: 1330, losses: 760, draws: 310, premium: true, online: true, favoriteGame: 'chess' }),
  mk('QueenBee', 12, 1980, { online: true, favoriteGame: 'checkers', isFollowing: true }),
  mk('SilentMove', 10, 1760, { favoriteGame: 'chess' }),
  mk('LadyTactics', 9, 1640, { online: true, favoriteGame: 'chess' }),
  mk('RookBoss', 8, 1520, { favoriteGame: 'checkers' }),
  mk('ChessPro', 7, 1410, { favoriteGame: 'chess' }),
  mk('Anyira_001', 5, 1200, { favoriteGame: 'chess', wins: 128, losses: 46, draws: 12, games: 186 }),
];

const by = (n: string) => users.find((x) => x.username === n)!;

export const posts: Post[] = [
  { id: 'p1', author: by('KingMaster23'), kind: 'tournament', text: 'Kinggdom Cup starts in 1h 32m! Prize pool 50,000 tokens. Who is in?', likes: 342, comments: 54, shares: 21, liked: false, saved: false, createdAt: '2m ago' },
  { id: 'p2', author: by('QueenBee'), kind: 'stream', text: 'Going live now - Checkers blitz with the community. Come say hi!', likes: 128, comments: 24, shares: 9, liked: true, saved: false, createdAt: '30m ago' },
  { id: 'p3', author: by('LadyTactics'), kind: 'puzzle', text: 'Daily puzzle: white to move and win in 3. Drop your answer below.', likes: 96, comments: 31, shares: 4, liked: false, saved: true, createdAt: '1h ago' },
  { id: 'p4', author: by('SilentMove'), kind: 'replay', text: 'My best game this week - a queen sacrifice that actually worked.', likes: 210, comments: 18, shares: 12, liked: false, saved: false, createdAt: '3h ago' },
  { id: 'p5', author: by('RookBoss'), kind: 'text', text: 'Endgames win tournaments. Practice rook endings 10 minutes every day.', likes: 64, comments: 7, shares: 2, liked: false, saved: false, createdAt: '5h ago' },
  { id: 'p6', author: by('ChessPro'), kind: 'image', text: 'Clubhouse setup for this weekend. Bring your own board.', likes: 51, comments: 5, shares: 1, liked: false, saved: false, createdAt: '8h ago' },
];

export const matches: Match[] = [
  { id: 'm1', game: 'chess', title: 'Chess · Finals · Best of 3', white: by('KingMaster23'), black: by('QueenBee'), viewers: 1234, live: true, round: 'Finals' },
  { id: 'm2', game: 'checkers', title: 'Checkers · Semi-final', white: by('RookBoss'), black: by('LadyTactics'), viewers: 482, live: true, round: 'Semi-final' },
  { id: 'm3', game: 'chess', title: 'Chess · Blitz Arena', white: by('SilentMove'), black: by('ChessPro'), viewers: 207, live: true, round: 'Round 4' },
];

export const tournaments: Tournament[] = [
  { id: 't1', name: 'Kinggdom Cup', game: 'chess', prizePool: 50000, entryFee: 100, players: 32, maxPlayers: 128, startsIn: '1h 32m', status: 'upcoming', description: 'Top players from around the world compete for the grand prize. Good luck!', rewards: [{ place: '1st', tokens: 50000 }, { place: '2nd', tokens: 25000 }, { place: '3rd', tokens: 15000 }], joined: false },
  { id: 't2', name: 'Weekly Chess Cup', game: 'chess', prizePool: 10000, entryFee: 50, players: 48, maxPlayers: 64, startsIn: '2h 5m', status: 'live', description: 'Weekly swiss event. Climb the standings and win tokens.', rewards: [{ place: '1st', tokens: 6000 }, { place: '2nd', tokens: 3000 }, { place: '3rd', tokens: 1000 }], joined: false },
  { id: 't3', name: 'Daily Checkers Cup', game: 'checkers', prizePool: 5000, entryFee: 20, players: 20, maxPlayers: 32, startsIn: '4h 20m', status: 'upcoming', description: 'A fast knockout for checkers fans.', rewards: [{ place: '1st', tokens: 3000 }, { place: '2nd', tokens: 1500 }, { place: '3rd', tokens: 500 }], joined: false },
  { id: 't4', name: 'Beginners Tournament', game: 'chess', prizePool: 1000, entryFee: 0, players: 60, maxPlayers: 100, startsIn: '6h 12m', status: 'upcoming', description: 'Free entry for new players rated under 1000.', rewards: [{ place: '1st', tokens: 600 }, { place: '2nd', tokens: 300 }, { place: '3rd', tokens: 100 }], joined: false },
  { id: 't5', name: 'Monthly Crown Final', game: 'chess', prizePool: 100000, entryFee: 200, players: 64, maxPlayers: 64, startsIn: 'ended', status: 'completed', description: 'The official event that crowns the best player of the month.', rewards: [{ place: '1st', tokens: 60000 }, { place: '2nd', tokens: 30000 }, { place: '3rd', tokens: 10000 }], joined: false },
];

export const notifications: AppNotification[] = [
  { id: 'n1', type: 'gift', text: 'QueenBee sent you a gift', sub: '2m ago', user: 'QueenBee', time: '2m ago', read: false },
  { id: 'n2', type: 'comment', text: 'LadyTactics commented on your post', sub: 'Nice move!', user: 'LadyTactics', time: '5m ago', read: false },
  { id: 'n3', type: 'live', text: 'KingMaster23 started a live stream', sub: 'Join now!', user: 'KingMaster23', time: '10m ago', read: false },
  { id: 'n4', type: 'tournament', text: 'Tournament registration ends', sub: 'Kinggdom Cup · 30m ago', time: '30m ago', read: true },
  { id: 'n5', type: 'reward', text: 'You earned 50 tokens', sub: 'From daily reward', time: '1h ago', read: true },
  { id: 'n6', type: 'follow', text: 'SilentMove followed you', user: 'SilentMove', time: '2h ago', read: true },
];

export const chats: ChatPreview[] = [
  { id: 'c1', name: 'QueenBee', last: 'You: Nice game!', time: '2m', unread: 0, online: true },
  { id: 'c2', name: 'LadyTactics', last: 'You: Thanks!', time: '5m', unread: 2, online: true },
  { id: 'c3', name: 'KingMaster23', last: 'Wanna play?', time: '12m', unread: 1, online: true },
  { id: 'c4', name: 'ChessPro', last: 'Sent a voice message', time: '30m', unread: 0 },
  { id: 'c5', name: 'SilentMove', last: 'See you in the final', time: '1h', unread: 0 },
  { id: 'c6', name: 'Tournament Discussion', last: 'Group chat is open', time: '2h', unread: 5, group: true },
];

export const transactions: Transaction[] = [
  { id: 'x1', label: 'Received from QueenBee', amount: 500, time: '2h ago', kind: 'received' },
  { id: 'x2', label: 'Sent to SilentMove', amount: -200, time: '5h ago', kind: 'sent' },
  { id: 'x3', label: 'Tournament reward', amount: 1000, time: '1d ago', kind: 'tournament' },
  { id: 'x4', label: 'Gift from LadyTactics', amount: 100, time: '1d ago', kind: 'gift' },
];

export const packages: TokenPackage[] = [
  { id: 'k50', tokens: 50, price: 0.99 },
  { id: 'k120', tokens: 120, price: 1.99 },
  { id: 'k500', tokens: 500, price: 4.99, popular: true },
  { id: 'k1500', tokens: 1500, price: 12.99 },
  { id: 'k3500', tokens: 3500, price: 24.99 },
];

export const gifts: Gift[] = [
  { id: 'g1', name: 'Rose', emoji: '🌹', cost: 10 },
  { id: 'g2', name: 'Whale', emoji: '🐋', cost: 50 },
  { id: 'g3', name: 'Crown', emoji: '👑', cost: 100 },
  { id: 'g4', name: 'Rocket', emoji: '🚀', cost: 200 },
  { id: 'g5', name: 'Diamond', emoji: '💎', cost: 500 },
  { id: 'g6', name: 'King', emoji: '🤴', cost: 1000 },
];

export const communities: Community[] = [
  { id: 'cm1', name: 'Chess Masters', members: 12400, preview: 'The game is getting intense!', joined: true, scope: 'global' },
  { id: 'cm2', name: 'Checkers Kings', members: 5400, preview: 'Great stream today!', joined: false, scope: 'global' },
  { id: 'cm3', name: 'Puzzle Addicts', members: 3100, preview: 'Who is joining the next tournament?', joined: false, scope: 'global' },
  { id: 'cm4', name: 'Abraka Chess Club', members: 220, preview: 'Weekend meetup this Saturday', joined: true, scope: 'groups' },
  { id: 'cm5', name: 'Late Night Blitz', members: 860, preview: 'Checkmate!', joined: false, scope: 'groups' },
];

export const trending = ['#chess', '#checkers', '#tournament', '#puzzle', '#blitz', '#endgame'];
