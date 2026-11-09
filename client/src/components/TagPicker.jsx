import { useState } from 'react';
import { Icon } from './icons.jsx';
import { cx } from './ui.jsx';

export default function TagPicker({ options = [], value = [], onChange, max = 12, placeholder = 'Add your own interest' }) {
  const [custom, setCustom] = useState('');

  const toggle = (tag) => {
    if (value.includes(tag)) onChange(value.filter((t) => t !== tag));
    else if (value.length < max) onChange([...value, tag]);
  };

  const addCustom = (e) => {
    e.preventDefault();
    const tag = custom.trim().toLowerCase();
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setCustom('');
  };

  const known = new Set(options.map((o) => o.tag));
  const extras = value.filter((v) => !known.has(v));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.slice(0, 30).map((opt) => {
          const active = value.includes(opt.tag);
          return (
            <button key={opt.tag} type="button" onClick={() => toggle(opt.tag)} className={cx('chip', active && 'chip-active')}>
              {active && <Icon name="check" size={12} />}
              {opt.tag}
              <span className="text-muted/60 text-[10px]">{opt.count}</span>
            </button>
          );
        })}
        {extras.map((tag) => (
          <button key={tag} type="button" onClick={() => toggle(tag)} className="chip chip-active">
            <Icon name="close" size={12} />
            {tag}
          </button>
        ))}
      </div>

      <form onSubmit={addCustom} className="flex gap-2 mt-3">
        <input
          className="input"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={placeholder}
          maxLength={30}
        />
        <button type="submit" className="btn-secondary shrink-0" disabled={!custom.trim()}>
          <Icon name="plus" size={16} />
          Add
        </button>
      </form>
      <p className="text-xs text-muted mt-2">
        {value.length}/{max} selected · we use these to rank topics for you
      </p>
    </div>
  );
}
