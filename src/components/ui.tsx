import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown } from 'lucide-react';

export const fmt = (n: number) => n.toLocaleString('en-US');

const hue = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

export function Avatar({ name, size = 44, online, ring }: { name: string; size?: number; online?: boolean; ring?: boolean }) {
  const h = hue(name);
  return (
    <div className={'avatar' + (ring ? ' ring' : '')} style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg,hsl(${h} 70% 48%),hsl(${(h + 50) % 360} 70% 28%))` }}>
      {name.slice(0, 1).toUpperCase()}
      {online !== undefined && <i className={'dot ' + (online ? 'on' : 'off')} />}
    </div>
  );
}

export function Logo({ big }: { big?: boolean }) {
  return (
    <div className={'logo' + (big ? ' big' : '')}>
      <Crown className='gold' size={big ? 56 : 24} />
      <span>Kinggdom</span>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'danger'; full?: boolean; sm?: boolean; loading?: boolean };
export function Button({ variant = 'primary', full, sm, loading, children, className = '', ...rest }: BtnProps) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={`btn ${variant}${full ? ' full' : ''}${sm ? ' sm' : ''} ${className}`}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function TopBar({ title, right, back = true, onBack }: { title?: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <header className='topbar'>
      {back ? (
        <button className='icon-btn' onClick={onBack ?? (() => nav(-1))} aria-label='Back'>
          <ArrowLeft size={20} />
        </button>
      ) : (
        <span style={{ width: 4 }} />
      )}
      <h1>{title}</h1>
      <div className='row gap8'>{right}</div>
    </header>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className='tabs'>
      {tabs.map((t) => (
        <button key={t.id} className={'tab' + (t.id === value ? ' active' : '')} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, icon, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: ReactNode }) {
  return (
    <label className='field'>
      {label && <span className='small muted'>{label}</span>}
      <div className='input-wrap'>
        {icon && <span className='ico'>{icon}</span>}
        <input {...rest} style={icon ? { paddingLeft: 40 } : undefined} />
      </div>
    </label>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role='switch' aria-checked={checked} className={'toggle' + (checked ? ' on' : '')} onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className='backdrop' onClick={onClose}>
      <div className='sheet' onClick={(e) => e.stopPropagation()}>
        <div className='grab' />
        <h3 style={{ marginBottom: 12 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className='spinner' />;
}

export function Loading() {
  return (
    <div className='center' style={{ display: 'flex', padding: 40 }}>
      <Spinner />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className='empty muted'>{text}</div>;
}

export function Coin() {
  return <i className='coin' />;
}
