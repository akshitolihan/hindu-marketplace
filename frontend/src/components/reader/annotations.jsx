import React, { useState, useEffect } from 'react';
import { Icon, IconBtn, HL_COLORS, HL_KEYS } from './readerUI';

// Floating toolbar shown after selecting text: color swatches + add-note.
export const HighlightToolbar = ({ pos, onColor, onNote }) => (
  <div
    className="fixed z-50 -translate-x-1/2 -translate-y-full bg-[#141A1F] border border-[#2A333B] rounded-full shadow-2xl px-2 py-1.5 flex items-center gap-1"
    style={{ top: pos.top - 10, left: pos.left }}
    onMouseDown={(e) => e.preventDefault()} // keep the text selection alive
  >
    {HL_KEYS.map((c) => (
      <button
        key={c}
        onClick={() => onColor(c)}
        title={c}
        className="h-6 w-6 rounded-full border border-black/20 hover:scale-110 transition-transform"
        style={{ background: HL_COLORS[c].dot }}
      />
    ))}
    <div className="w-px h-5 bg-[#2A333B] mx-1" />
    <button onClick={onNote} title="Add note" className="h-7 px-2 rounded-full text-[#C6CDD3] hover:bg-white/10 flex items-center gap-1 text-xs">
      <Icon name="note" size={15} /> Note
    </button>
  </div>
);

// Colored rectangles drawn over a page for saved highlights.
export const HighlightLayer = ({ items }) => (
  <div className="absolute inset-0 pointer-events-none z-[5]">
    {items.map((h) =>
      h.rects.map((r, i) => (
        <div
          key={h._id + '-' + i}
          className="absolute rounded-[2px]"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.w * 100}%`,
            height: `${r.h * 100}%`,
            background: HL_COLORS[h.color]?.bg || HL_COLORS.yellow.bg
          }}
        />
      ))
    )}
  </div>
);

const Swatches = ({ current, onPick }) => (
  <div className="flex items-center gap-1.5">
    {HL_KEYS.map((c) => (
      <button
        key={c}
        onClick={() => onPick(c)}
        className={`h-4 w-4 rounded-full border ${current === c ? 'ring-2 ring-white/60' : 'border-black/20'}`}
        style={{ background: HL_COLORS[c].dot }}
        title={c}
      />
    ))}
  </div>
);

// Right-hand annotations panel with three tabs: Marks · Highlights · Notes.
export const AnnotationsPanel = ({
  open, onClose, tab, setTab,
  bookmarks, highlights, notes, currentPage, currentChapter, autoNoteFor,
  onGo, onRemoveBookmark, onRecolor, onRemoveHighlight, onSaveHlNote,
  onAddNote, onEditNote, onRemoveNote
}) => {
  const [editing, setEditing] = useState(null); // {type:'hl'|'note', id, text}
  const [newNote, setNewNote] = useState('');

  // When a highlight is created via the "Note" button, open its note editor.
  useEffect(() => {
    if (autoNoteFor) setEditing({ type: 'hl', id: autoNoteFor, text: '' });
  }, [autoNoteFor]);

  const tabs = [
    ['marks', 'Marks', bookmarks.length],
    ['highlights', 'Highlights', highlights.length],
    ['notes', 'Notes', notes.length]
  ];

  const copy = (t) => navigator.clipboard?.writeText(t);

  return (
    <aside className={`${open ? 'w-80' : 'w-0'} bg-[#171E24] border-l border-[#2A333B] overflow-hidden transition-[width] duration-300 z-20 absolute right-0 top-0 h-full shadow-2xl`}>
      <div className="w-80 h-full flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2A333B]">
          <span className="font-display text-lg">Annotations</span>
          <IconBtn name="close" title="Close" onClick={onClose} size={16} />
        </div>

        {/* tabs */}
        <div className="flex border-b border-[#2A333B] text-sm">
          {tabs.map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 border-b-2 transition-colors ${tab === key ? 'border-gold text-gold' : 'border-transparent text-[#8c95a0] hover:text-[#C6CDD3]'}`}>
              {label} <span className="text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {/* ---- Marks (bookmarks) ---- */}
          {tab === 'marks' && (bookmarks.length === 0 ? (
            <Empty icon="bookmark" text="No bookmarks yet. Press B to bookmark a page." />
          ) : bookmarks.map((b) => (
            <div key={b._id} className={`group rounded-lg px-3 py-2.5 mb-1 flex items-center justify-between gap-2 cursor-pointer ${b.page === currentPage ? 'bg-gold/15' : 'hover:bg-white/5'}`} onClick={() => onGo(b.page)}>
              <div className="min-w-0">
                <div className="text-sm text-[#E7EBEE]">Page {b.page}</div>
                {b.chapterTitle && <div className="text-xs text-[#7c8690] truncate">{b.chapterTitle}</div>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemoveBookmark(b._id); }} className="opacity-0 group-hover:opacity-100 text-[#7c8690] hover:text-red-400"><Icon name="close" size={15} /></button>
            </div>
          )))}

          {/* ---- Highlights ---- */}
          {tab === 'highlights' && (highlights.length === 0 ? (
            <Empty icon="note" text="Select text in the book to highlight it." />
          ) : highlights.map((h) => (
            <div key={h._id} className={`rounded-lg p-3 mb-2 ${h.page === currentPage ? 'bg-white/5' : 'bg-black/10'} border-l-2`} style={{ borderColor: HL_COLORS[h.color]?.dot }}>
              <p className="text-sm text-[#D9DEE3] italic line-clamp-3 cursor-pointer" onClick={() => onGo(h.page)}>“{h.text || 'Highlight'}”</p>
              {h.note && editing?.id !== h._id && <p className="text-xs text-[#9aa3ac] mt-1.5 bg-black/20 rounded p-2">{h.note}</p>}
              {editing?.type === 'hl' && editing.id === h._id ? (
                <div className="mt-2">
                  <textarea autoFocus value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                    rows={2} className="w-full bg-[#0e1318] border border-[#2A333B] rounded p-2 text-sm text-[#E7EBEE] focus:outline-none focus:border-gold/50" placeholder="Write a note…" />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => { onSaveHlNote(h._id, editing.text); setEditing(null); }} className="text-xs bg-gold text-[#0b0f12] px-3 py-1 rounded-full font-semibold">Save</button>
                    <button onClick={() => setEditing(null)} className="text-xs text-[#8c95a0]">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2">
                  <Swatches current={h.color} onPick={(c) => onRecolor(h._id, c)} />
                  <div className="flex items-center gap-2 text-[#7c8690]">
                    <span className="text-xs">p.{h.page}</span>
                    <button title="Note" onClick={() => setEditing({ type: 'hl', id: h._id, text: h.note || '' })} className="hover:text-[#C6CDD3]"><Icon name="note" size={14} /></button>
                    <button title="Copy quote" onClick={() => copy(h.text)} className="hover:text-[#C6CDD3]"><Icon name="book" size={14} /></button>
                    <button title="Delete" onClick={() => onRemoveHighlight(h._id)} className="hover:text-red-400"><Icon name="close" size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )))}

          {/* ---- Notes ---- */}
          {tab === 'notes' && (
            <>
              <div className="mb-3 bg-black/20 rounded-lg p-2">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2}
                  placeholder={`Add a note on page ${currentPage}…`}
                  className="w-full bg-[#0e1318] border border-[#2A333B] rounded p-2 text-sm text-[#E7EBEE] focus:outline-none focus:border-gold/50" />
                <button disabled={!newNote.trim()} onClick={() => { onAddNote(newNote.trim()); setNewNote(''); }}
                  className="mt-1 text-xs bg-gold text-[#0b0f12] px-3 py-1 rounded-full font-semibold disabled:opacity-40">Add note</button>
              </div>
              {notes.length === 0 ? (
                <Empty icon="note" text="No notes yet." />
              ) : notes.map((n) => (
                <div key={n._id} className={`rounded-lg p-3 mb-2 ${n.page === currentPage ? 'bg-white/5' : 'bg-black/10'}`}>
                  {n.quote && <p className="text-xs text-[#8c95a0] italic border-l-2 border-[#3a444d] pl-2 mb-1.5 line-clamp-2" onClick={() => onGo(n.page)}>“{n.quote}”</p>}
                  {editing?.type === 'note' && editing.id === n._id ? (
                    <>
                      <textarea autoFocus value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={2}
                        className="w-full bg-[#0e1318] border border-[#2A333B] rounded p-2 text-sm text-[#E7EBEE] focus:outline-none focus:border-gold/50" />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => { onEditNote(n._id, editing.text); setEditing(null); }} className="text-xs bg-gold text-[#0b0f12] px-3 py-1 rounded-full font-semibold">Save</button>
                        <button onClick={() => setEditing(null)} className="text-xs text-[#8c95a0]">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[#D9DEE3] cursor-pointer" onClick={() => onGo(n.page)}>{n.text}</p>
                      <div className="flex items-center justify-between mt-2 text-[#7c8690]">
                        <span className="text-xs">p.{n.page}</span>
                        <div className="flex items-center gap-2">
                          <button title="Edit" onClick={() => setEditing({ type: 'note', id: n._id, text: n.text })} className="hover:text-[#C6CDD3]"><Icon name="note" size={14} /></button>
                          <button title="Delete" onClick={() => onRemoveNote(n._id)} className="hover:text-red-400"><Icon name="close" size={14} /></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

const Empty = ({ icon, text }) => (
  <div className="p-6 text-sm text-[#7c8690] text-center mt-6">
    <Icon name={icon} size={26} className="mx-auto mb-3 opacity-50" />
    {text}
  </div>
);
