import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Flag, Heart, MessageCircle, Pencil, Share2, Trash2 } from 'lucide-react';
import type { Post } from '../types';
import { api } from '../services/api';
import { profileApi } from '../services/profileApi';
import { useApp } from '../store/useApp';
import { ConfirmSheet } from './ConfirmSheet';
import { Avatar, fmt } from './ui';

const kindLabel: Record<Post['kind'], string> = {
  text: '', image: '🖼️ Photo', video: '▶️ Short video', replay: '♟️ Game replay', puzzle: '🧩 Puzzle', tournament: '🏆 Tournament', stream: '🔴 Live stream',
};

export function PostCard({ post, onDeleted, onEdited }: { post: Post; onDeleted?: (id: string) => void; onEdited?: (id: string, text: string) => void }) {
  const toast = useApp((s) => s.toast);
  const me = useApp((s) => s.user);
  const [p, setP] = useState(post);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [comments, setComments] = useState<{ by: string; text: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [view, setView] = useState<string | null>(null);

  const mine = !!me && p.author.id === me.id;
  const images = p.images ?? [];

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
    try {
      await api.feed.report(p.id, 'user_report');
      toast('Thanks, we will review it');
    } catch (e) { toast((e as Error).message); }
  };
  const send = async () => {
    if (!text.trim()) return;
    try {
      await api.feed.comment(p.id, text);
      setComments((c) => [...c, { by: me?.username ?? 'you', text }]);
      setP((x) => ({ ...x, comments: x.comments + 1 }));
      setText('');
    } catch (e) { toast((e as Error).message); }
  };
  const saveEdit = async () => {
    const t = draft.trim();
    if (!t && images.length === 0) { toast('A post cannot be empty'); return; }
    setBusy(true);
    try {
      await profileApi.updatePost(p.id, t);
      setP((x) => ({ ...x, text: t }));
      setEditing(false);
      onEdited?.(p.id, t);
      toast('Post updated');
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await profileApi.deletePost(p.id);
      setAskDelete(false);
      setGone(true);
      onDeleted?.(p.id);
      toast('Post deleted');
    } catch (e) { setAskDelete(false); toast((e as Error).message); } finally { setBusy(false); }
  };

  if (gone) return null;

  return (
    <article className='card post' id={p.id}>
      <div className='head'>
        <Link to={'/u/' + p.author.username}><Avatar name={p.author.name} src={p.author.avatarUrl} size={38} online={p.author.online} /></Link>
        <div className='grow'>
          <Link to={'/u/' + p.author.username} className='bold'>{p.author.username}</Link>
          <div className='tiny muted'>{p.createdAt} {kindLabel[p.kind] && '· ' + kindLabel[p.kind]}</div>
        </div>
        {mine ? (
          <>
            <button className='act' onClick={() => { setDraft(p.text); setEditing(true); }} aria-label='Edit post'><Pencil size={15} /></button>
            <button className='act' onClick={() => setAskDelete(true)} aria-label='Delete post'><Trash2 size={15} /></button>
          </>
        ) : (
          <button className='act' onClick={report} aria-label='Report'><Flag size={15} /></button>
        )}
      </div>
      {editing ? (
        <div className='mt8'>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} />
          <div className='row gap8 mt8'>
            <button className='btn primary sm' disabled={busy} onClick={saveEdit}>{busy ? 'Saving…' : 'Save'}</button>
            <button className='btn ghost sm' disabled={busy} onClick={() => { setEditing(false); setDraft(p.text); }}>Cancel</button>
          </div>
        </div>
      ) : (
        p.text && <p>{p.text}</p>
      )}
      {images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr', gap: 4, marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
          {images.map((src) => (
            <img key={src} src={src} alt='' loading='lazy' onClick={() => setView(src)} style={{ width: '100%', aspectRatio: images.length === 1 ? '4 / 3' : '1 / 1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
          ))}
        </div>
      ) : (
        p.kind !== 'text' && <div className='media'>{kindLabel[p.kind]}</div>
      )}
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
      {view && (
        <div role='dialog' onClick={() => setView(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <img src={view} alt='' style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
      <ConfirmSheet
        open={askDelete}
        title='Delete this post?'
        message='This cannot be undone.'
        confirmLabel='Delete'
        danger
        busy={busy}
        onCancel={() => setAskDelete(false)}
        onConfirm={remove}
      />
    </article>
  );
}
