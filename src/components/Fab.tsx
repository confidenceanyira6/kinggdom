import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, Plus, Trophy, Video, X } from 'lucide-react';

const items = [
  { label: 'Create Post', icon: PenSquare, to: '/create-post' },
  { label: 'Start Stream', icon: Video, to: '/live/start' },
  { label: 'Create Tournament', icon: Trophy, to: '/tournaments/new' },
];

export function Fab() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  return (
    <>
      {open && (
        <div className='fab-menu'>
          {items.map((i) => (
            <button key={i.to} className='btn ghost sm' style={{ background: 'var(--surface)' }} onClick={() => { setOpen(false); nav(i.to); }}>
              <i.icon size={16} /> {i.label}
            </button>
          ))}
        </div>
      )}
      <button className='fab' onClick={() => setOpen((o) => !o)} aria-label='Create'>
        {open ? <X /> : <Plus />}
      </button>
    </>
  );
}
