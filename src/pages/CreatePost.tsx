import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
import { api } from '../services/api';
import { MAX_POST_IMAGES, checkImage } from '../services/mediaApi';
import { useApp } from '../store/useApp';
import { Button, TopBar } from '../components/ui';
import type { Post } from '../types';

const KINDS: { id: Post['kind']; label: string }[] = [
  { id: 'text', label: 'Text' }, { id: 'video', label: 'Short video' }, { id: 'puzzle', label: 'Puzzle' }, { id: 'replay', label: 'Game replay' },
];

interface Picked { file: File; url: string }

export default function CreatePost() {
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Post['kind']>('text');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const room = MAX_POST_IMAGES - picked.length;
    if (files.length > room) toast('You can add up to ' + MAX_POST_IMAGES + ' photos');
    const next: Picked[] = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      const bad = checkImage(f);
      if (bad) { toast(bad); continue; }
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    if (next.length) setPicked((p) => [...p, ...next]);
  };

  const removeAt = (i: number) => {
    setPicked((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, k) => k !== i);
    });
  };

  const post = async () => {
    if (!text.trim() && picked.length === 0) { toast('Write something or add a photo'); return; }
    setBusy(true);
    try {
      await api.feed.create({ text: text.trim(), kind: picked.length ? 'image' : kind, images: picked.map((p) => p.file) });
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      toast('Posted');
      nav('/home', { replace: true });
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Create Post' />
      <textarea placeholder='Share a move, a puzzle, or a thought. Use #hashtags and @mentions.' value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
      <div className='tiny muted tc mt8'>{text.length}/500</div>

      <input ref={input} type='file' accept='image/*' multiple hidden onChange={onPick} />
      {picked.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, margin: '12px 0' }}>
          {picked.map((p, i) => (
            <div key={p.url} style={{ position: 'relative' }}>
              <img src={p.url} alt='' style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 12, display: 'block' }} />
              <button type='button' className='icon-btn' aria-label='Remove photo' onClick={() => removeAt(i)} style={{ position: 'absolute', top: 6, right: 6 }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <div className='row gap8 mt8 mb12'>
        <button type='button' className='btn ghost sm' disabled={busy || picked.length >= MAX_POST_IMAGES} onClick={() => input.current?.click()}>
          <ImagePlus size={16} /> {picked.length ? 'Add more photos' : 'Add photos'}
        </button>
        <span className='tiny muted'>{picked.length}/{MAX_POST_IMAGES}</span>
      </div>

      {picked.length === 0 && (
        <>
          <span className='small muted'>Type</span>
          <div className='row wrap gap8 mt8 mb12'>{KINDS.map((k) => <button key={k.id} className={'chip' + (kind === k.id ? ' active' : '')} onClick={() => setKind(k.id)}>{k.label}</button>)}</div>
          {kind === 'video' && <p className='tiny muted mb12'>Video uploads connect with backend storage.</p>}
        </>
      )}
      <Button full loading={busy} onClick={post}>Post</Button>
    </div>
  );
}
