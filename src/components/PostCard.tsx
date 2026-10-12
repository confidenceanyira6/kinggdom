import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Flag, Heart, MessageCircle, Share2 } from 'lucide-react';
import type { Post } from '../types';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { Avatar, fmt } from './ui';

const kindLabel: Record<Post['kind'], string> = {
  text: '', image: '🖼️ Photo', video: '▶️ Short video', replay: '♟️ Game replay', puzzle: '🧩 Puzzle', tournament: '🏆 Tournament', stream: '🔴 Live stream',
};

export function PostCard({ post }: { post: Post }) {
  const toast = useApp((s) => s.toast);
  const me = useApp((s) => s.user);
  const [p, setP] = useState(post);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [comments, setComments] = useState<{ by: string; text: string }[]>([]);

  const like = () => {
    setP((x) => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }));
    api.feed.like(p.id);
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
  const send = async () => {
    if (!text.trim()) return;
    await api.feed.comment(p.id, text);
    setComments((c) => [...c, { by: me?.username ?? 'you', text }]);
    setP((x) => ({ ...x, comments: x.comments + 1 }));
    setText('');
  };

  return (
    <article className='card post' id={p.id}>
      <div className='head'>
        <Link to={'/u/' + p.author.username}><Avatar name={p.author.name} size={38} online={p.author.online} /></Link>
        <div className='grow'>
          <Link to={'/u/' + p.author.username} className='bold'>{p.author.username}</Link>
          <div className='tiny muted'>{p.createdAt} {kindLabel[p.kind] && '· ' + kindLabel[p.kind]}</div>
        </div>
        <button className='act' onClick={report} aria-label='Report'><Flag size={15} /></button>
      </div>
      <p>{p.text}</p>
      {p.kind !== 'text' && <div className='media'>{kindLabel[p.kind]}</div>}
      <div className='actions'>
        <button className={'act' + (p.liked ? ' on' : '')} onClick={like}><Heart size={17} fill={p.liked ? 'currentColor' : 'none'} />{fmt(p.likes)}</button>
        <button className='act' onClick={() => setOpen((o) => !o)}><MessageCircle size={17} />{fmt(p.comments)}</button>
        <button className='act' onClick={share}><Share2 size={17} />{fmt(p.shares)}</button>
        <button className={'act' + (p.saved ? ' saved' : '')} onClick={save}><Bookmark size={17} fill={p.saved ? 'currentColor' : 'none'} /></button>
      </div>
      {open && (
        <div className='mt12'>
          {comments.map((c, i) => (
            <div key={i} className='chatline mb8'><b>{c.by}</b> {c.text}</div>
          ))}
          <div className='row gap8'>
            <input placeholder='Write a comment or reply...' value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button className='btn primary sm' onClick={send}>Send</button>
          </div>
        </div>
      )}
    </article>
  );
}
