import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../store/useApp';
import { Button, TopBar } from '../components/ui';
import type { Post } from '../types';

const KINDS: { id: Post['kind']; label: string }[] = [
  { id: 'text', label: 'Text' }, { id: 'image', label: 'Image' }, { id: 'video', label: 'Short video' }, { id: 'puzzle', label: 'Puzzle' }, { id: 'replay', label: 'Game replay' },
];

export default function CreatePost() {
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Post['kind']>('text');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!text.trim()) { toast('Write something first'); return; }
    setBusy(true);
    try { await api.feed.create({ text: text.trim(), kind }); toast('Posted'); nav('/home', { replace: true }); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className='screen nonav'>
      <TopBar title='Create Post' />
      <textarea placeholder='Share a move, a puzzle, or a thought. Use #hashtags and @mentions.' value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
      <div className='tiny muted tc mt8'>{text.length}/500</div>
      <span className='small muted'>Type</span>
      <div className='row wrap gap8 mt8 mb12'>{KINDS.map((k) => <button key={k.id} className={'chip' + (kind === k.id ? ' active' : '')} onClick={() => setKind(k.id)}>{k.label}</button>)}</div>
      {(kind === 'image' || kind === 'video') && <p className='tiny muted mb12'>Media uploads connect with backend storage.</p>}
      <Button full loading={busy} onClick={post}>Post</Button>
    </div>
  );
}
