import React, { useEffect, useRef } from 'react';
import { Icon, IconBtn } from './readerUI';

// Highlights the matched query inside a snippet for the results list.
const Snippet = ({ text, term, caseSensitive }) => {
  if (!term) return <>{text}</>;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, caseSensitive ? 'g' : 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase() ? <mark key={i} className="bg-gold/60 text-[#0b0f12] rounded-sm px-0.5">{p}</mark> : <span key={i}>{p}</span>
      )}
    </>
  );
};

export const SearchPanel = ({ open, onClose, query, setQuery, results, searching, term, options, setOptions, activeIdx, onJump, onPrev, onNext }) => {
  const inputRef = useRef(null);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60); }, [open]);
  if (!open) return null;

  const total = results.reduce((s, r) => s + r.count, 0);

  return (
    <div className="absolute top-3 left-3 z-40 w-[360px] max-w-[calc(100vw-24px)] bg-[#141A1F] border border-[#2A333B] rounded-xl shadow-2xl flex flex-col max-h-[80%]">
      {/* input row */}
      <div className="flex items-center gap-2 p-3 border-b border-[#2A333B]">
        <Icon name="search" size={16} className="text-[#7c8690]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.shiftKey ? onPrev : onNext)(); if (e.key === 'Escape') onClose(); }}
          placeholder="Search in book…"
          className="flex-1 bg-transparent text-sm text-[#F5F2EA] placeholder:text-[#5c6670] focus:outline-none"
        />
        {term && (
          <span className="text-xs text-[#7c8690] tabular-nums whitespace-nowrap">
            {results.length ? `${activeIdx + 1}/${results.length}` : '0'}
          </span>
        )}
        <IconBtn name="left" title="Previous (Shift+Enter)" size={15} onClick={onPrev} disabled={!results.length} />
        <IconBtn name="right" title="Next (Enter)" size={15} onClick={onNext} disabled={!results.length} />
        <IconBtn name="close" title="Close (Esc)" size={15} onClick={onClose} />
      </div>

      {/* options */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#2A333B] text-xs text-[#8c95a0]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={options.caseSensitive} onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })} className="accent-[#C99A3B]" />
          Match case
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={options.wholeWord} onChange={(e) => setOptions({ ...options, wholeWord: e.target.checked })} className="accent-[#C99A3B]" />
          Whole word
        </label>
        {term && <span className="ml-auto">{total} match{total === 1 ? '' : 'es'}</span>}
      </div>

      {/* results */}
      <div className="overflow-auto flex-1">
        {searching ? (
          <p className="text-sm text-[#7c8690] text-center py-8">Searching…</p>
        ) : !term ? (
          <p className="text-sm text-[#7c8690] text-center py-8">Type at least 2 characters.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-[#7c8690] text-center py-8">No results for “{term}”.</p>
        ) : (
          results.map((r, i) => (
            <button key={r.page} onClick={() => onJump(i)}
              className={`w-full text-left px-3 py-2.5 border-b border-[#20272d] transition-colors ${i === activeIdx ? 'bg-gold/10' : 'hover:bg-white/5'}`}>
              <div className="flex justify-between text-xs text-[#7c8690] mb-1">
                <span>Page {r.page}</span>
                <span>{r.count} match{r.count === 1 ? '' : 'es'}</span>
              </div>
              <p className="text-sm text-[#C6CDD3] line-clamp-2">
                <Snippet text={r.snippet} term={term} caseSensitive={options.caseSensitive} />
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
