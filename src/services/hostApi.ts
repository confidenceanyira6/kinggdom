import { supabase, callFunction } from '../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface HostPlan { id: number; name: string; priceUsd: number; features: string[] }

export interface HostCompetition {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  entryFee: number;
  players: number;
  prizePool: number;
  platformFee: number;
}

export interface HostDashboard {
  isHost: boolean;
  feePct: number;
  hostUntil: string | null;
  cancelAtPeriodEnd: boolean;
  gifts: { count: number; gross: number; fee: number; net: number };
  entries: { players: number; gross: number; fee: number };
  competitions: HostCompetition[];
}

const FALLBACK_PCT = 3;
let pctCache: number | null = null;
const num = (v: unknown) => Number(v) || 0;

/**
 * Hosting: a Host subscription ($5/month) unlocks creating competitions. Kinggdom keeps a platform fee
 * (a public setting, 3%) on entry fees of hosted competitions and on gifts/tips a host receives while live
 * with a competition. All of it is calculated on the server (RPCs host_dashboard, send_gift, register_for_tournament).
 */
export const hostApi = {
  /** The platform fee percentage, read from the public app setting so the UI can never disagree with the server. */
  async feePct(): Promise<number> {
    if (pctCache !== null) return pctCache;
    const r = await supabase.from('app_settings').select('value').eq('key', 'tournament_platform_fee_pct').maybeSingle();
    const v = Number((r.data as Row | null)?.value);
    pctCache = Number.isFinite(v) && v >= 0 ? v : FALLBACK_PCT;
    return pctCache;
  },

  async plan(): Promise<HostPlan | null> {
    const r = await supabase.from('subscription_plans').select('id,name,price_cents,features').eq('code', 'host_monthly').eq('is_active', true).maybeSingle();
    if (r.error || !r.data) return null;
    const p = r.data as Row;
    return { id: p.id, name: p.name, priceUsd: num(p.price_cents) / 100, features: Array.isArray(p.features) ? (p.features as string[]) : [] };
  },

  async dashboard(): Promise<HostDashboard> {
    const r = await supabase.rpc('host_dashboard');
    if (r.error) throw new Error(r.error.message);
    const d = (r.data ?? {}) as Row;
    const g = (d.gifts ?? {}) as Row;
    const e = (d.entries ?? {}) as Row;
    return {
      isHost: !!d.is_host,
      feePct: num(d.fee_pct),
      hostUntil: d.host_until ?? null,
      cancelAtPeriodEnd: !!d.cancel_at_period_end,
      gifts: { count: num(g.count), gross: num(g.gross), fee: num(g.fee), net: num(g.net) },
      entries: { players: num(e.players), gross: num(e.gross), fee: num(e.fee) },
      competitions: ((d.competitions ?? []) as Row[]).map((c) => ({
        id: c.id, name: c.name, status: c.status, startsAt: c.starts_at, entryFee: num(c.entry_fee), players: num(c.players), prizePool: num(c.prize_pool), platformFee: num(c.platform_fee),
      })),
    };
  },

  /** Opens the Paystack checkout for the Host plan. The server activates hosting when the payment is confirmed. */
  async subscribe(planId: number): Promise<void> {
    const r = await callFunction<{ authorization_url?: string; error?: string }>('create-deposit', { plan_id: planId, callback_url: window.location.origin + '/host' });
    if (!r?.authorization_url) throw new Error(r?.error ?? 'Could not start payment.');
    window.location.href = r.authorization_url;
  },

  async cancel(): Promise<void> {
    const r = await supabase.rpc('cancel_host_subscription');
    if (r.error) throw new Error(r.error.message);
  },
};
