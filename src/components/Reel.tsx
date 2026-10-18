import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Flag, Heart, MessageCircle, Plus, Send, Share2 } from 'lucide-react';
import type { Post } from '../types';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { Avatar, fmt } from './ui';

const kindMeta: Record<Post['kind'], { emoji: string; label: string }> = {
  text: { emoji: '', label: '' },
  image: { emoji: '🖼️', label: 'PHOTO' },
  video: { emoji: '▶️', label: 'SHORT VIDEO' },
  replay: { emoji: '♟️', label: 'GAME REPLAY' },
  puzzle: { emoji: '🧩', label: 'PUZZLE' },
  tournament: { emoji: '🏆', label: 'TOURNAMENT' },
  stream: { emoji: '🔴', label: 'LIVE STREAM' },
};

const palettes = [
  ['#1d2b66', '#4a1f7a'],
  ['#0f3d3e', '#1f6f5c'],
  ['#5a1a3a', '#a8324e'],
  ['#12306b', '#2f6bff'],
  ['#3b2a06', '#b8860b'],
  ['#2a1a4e', '#6b2fb0'],
];
const paletteFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
};

export function Reel({ post }: { post: Post }) {
  const toast = useApp((s) => s.toast);
  const me = useApp((s) => s.user);
  const [p, setP] = useState(post);
  const [following, setFollowing] = useState(!!post.author.isFollowing);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [comments, setComments] = useState<{ by: string; text: string }[]>([]);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTap = useRef(0);

  const [c1, c2] = paletteFor(p.id);
  const meta = kindMeta[p.kind];
  const mine = me?.username === p.author.username;

  const toggleLike = () => {
    setP((x) => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }));
    api.feed.like(p.id);
  };
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      const r = e.currentTarget.getBoundingClientRect();
      const b = { id: now, x: e.clientX - r.left, y: e.clientY - r.top };
      setBursts((l) => [...l, b]);
      setTimeout(() => setBursts((l) => l.filter((x) => x.id !== b.id)), 800);
      if (!p.liked) toggleLike();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };
  const save = () => {
    setP((x) => ({ ...x, saved: !x.saved }));
    api.feed.save(p.id);
    toast(p.saved ? 'Removed from saved' : 'Post saved');
  };
  const share = async () => {
    const url = location.origin + '/home#' + p.id;
    try {
      if (navigator.share) await navigator.share({ title: 'Kinggdom', text: p.text, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied'); }
    } catch { /* user cancelled */ }
    setP((x) => ({ ...x, shares: x.shares + 1 }));
  };
  const report = async () => {
    if (!window.confirm('Report this post?')) return;
    await api.feed.report(p.id, 'user_report');
    toast('Thanks, we will review it');
  };
  const follow = async () => {
    setFollowing((f) => !f);
    try { await api.users.follow(p.author.username); } catch { setFollowing((f) => !f); }
  };
  const send = async () => {
    if (!text.trim()) return;
    await api.feed.comment(p.id, text);
    setComments((c) => [...c, { by: me?.username ?? 'you', text }]);
    setP((x) => ({ ...x, comments: x.comments + 1 }));
    setText('');
  };

  return (
    <section className='reel' id={p.id} style={{ background: 'linear-gradient(160deg,' + c1 + ',' + c2 + ')' }} onClick={onTap}>
      <div className='reel-art'>
        {p.kind === 'text' ? (
          <div className='reel-quote'>{p.text}</div>
        ) : (
          <>
            <div className='emoji'>{meta.emoji}</div>
            <span className='kind'>{meta.label}</span>
          </>
        )}
      </div>

      <div className='reel-shade' />

      <div className='reel-info'>
        <Link to={'/u/' + p.author.username} className='who' onClick={(e) => e.stopPropagation()}>@{p.author.username}</Link>
        {p.kind !== 'text' && p.text && <div className='cap'>{p.text}</div>}
        <div className='meta'>{p.createdAt}{meta.label && ' · ' + meta.label.toLowerCase()}</div>
      </div>

      <div className='reel-rail' onClick={(e) => e.stopPropagation()}>
        <div className='rail-avatar'>
          <Link to={'/u/' + p.author.username}><Avatar name={p.author.name} size={48} online={p.author.online} /></Link>
          {!mine && (
            <button className={'follow' + (following ? ' done' : '')} onClick={follow} aria-label={following ? 'Unfollow' : 'Follow'}>
              {following ? <Check size={12} /> : <Plus size={12} />}
            </button>
          )}
        </div>
        <button className={'rail-btn' + (p.liked ? ' liked' : '')} onClick={toggleLike} aria-label='Like'>
          <span className='ic'><Heart size={24} fill={p.liked ? 'currentColor' : 'none'} /></span>{fmt(p.likes)}
        </button>
        <button className='rail-btn' onClick={() => setOpen(true)} aria-label='Comments'>
          <span className='ic'><MessageCircle size={24} /></span>{fmt(p.comments)}
        </button>
        <button className={'rail-btn' + (p.saved ? ' saved' : '')} onClick={save} aria-label='Save'>
          <span className='ic'><Bookmark size={24} fill={p.saved ? 'currentColor' : 'none'} /></span>Save
        </button>
        <button className='rail-btn' onClick={share} aria-label='Share'>
          <span className='ic'><Share2 size={24} /></span>{fmt(p.shares)}
        </button>
        <button className='rail-btn' onClick={report} aria-label='Report'>
          <span className='ic' style={{ width: 36, height: 36 }}><Flag size={16} /></span>
        </button>
      </div>

      {bursts.map((b) => (
        <span key={b.id} className='burst' style={{ left: b.x, top: b.y }}><Heart size={84} fill='currentColor' /></span>
      ))}

      {open && (
        <div className='backdrop' onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className='sheet comments' onClick={(e) => e.stopPropagation()}>
            <div className='grab' />
            <h3 className='tc mb8'>{fmt(p.comments)} comments</h3>
            <div className='list'>
              {comments.length === 0 && <div className='empty muted small'>Be the first to comment</div>}
              {comments.map((c, i) => (
                <div key={i} className='chatline mb8'><b>{c.by}</b> {c.text}</div>
              ))}
            </div>
            <div className='row gap8 mt12'>
              <input placeholder='Add a comment...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className='btn primary sm' onClick={send} aria-label='Send'><Send size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
