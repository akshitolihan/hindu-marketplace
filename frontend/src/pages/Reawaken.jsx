import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

// The video player pulls in Vidstack — lazy-load it so it only ships when a
// visitor actually opens a lesson, keeping the main bundle lean.
const LessonPlayer = lazy(() => import('../components/reawaken/LessonPlayer'));

/* =========================================================================
   "Reawaken" — a guided, AI-led program to help people rebuild their life.
   Flow:  Intro  →  Pre-assessment (Life Compass)  →  Personalized roadmap
   Everything is stored locally so a returning user sees their plan + progress.
   ========================================================================= */

// Pre-assessment: 8 statements, one per life dimension, rated 1–5 (higher = healthier).
const DIMENSIONS = [
  { key: 'vitality', label: 'Energy & Vitality', q: 'I have the physical energy to get through my day.' },
  { key: 'mind', label: 'Mind & Emotions', q: 'My mind feels calm and clear, not overwhelmed or anxious.' },
  { key: 'structure', label: 'Daily Structure', q: 'My days have a routine and rhythm I can rely on.' },
  { key: 'worth', label: 'Self-Worth', q: 'I feel good about who I am.' },
  { key: 'connection', label: 'Relationships', q: 'I feel connected to people who care about me.' },
  { key: 'purpose', label: 'Purpose & Direction', q: 'I have a sense of direction and things to look forward to.' },
  { key: 'stability', label: 'Stability', q: 'My responsibilities and finances feel under control.' },
  { key: 'peace', label: 'Inner Peace', q: 'I feel a sense of inner peace or spiritual grounding.' }
];

// The 8-stage journey. Each stage targets a dimension; low-scoring dimensions
// are surfaced first in the personalized roadmap.
const STAGES = [
  {
    n: 1, key: 'awaken', dim: null, title: 'Awaken', sanskrit: 'Jāgṛti', glyph: '☀',
    tagline: 'Face where you are — with honesty and hope.',
    practice: 'A 5-minute "honest inventory" — name where you are without judgment.',
    lessons: [
      { id: 'a1', title: 'You are not broken, you are buried', dur: '8 min', blurb: 'Why feeling lost is a beginning, not an end.' },
      { id: 'a2', title: 'The honest inventory', dur: '11 min', blurb: 'Seeing your life clearly, without shame.' },
      { id: 'a3', title: 'Choosing to come back', dur: '7 min', blurb: 'The one decision everything else rests on.' }
    ]
  },
  {
    n: 2, key: 'reset', dim: 'structure', title: 'Reset the Days', sanskrit: 'Dinacharyā', glyph: '☼',
    tagline: 'Rebuild the scaffolding of a life: sleep, mornings, small wins.',
    practice: 'Design a 3-step morning ritual and a fixed sleep time.',
    lessons: [
      { id: 'r1', title: 'Why structure heals', dur: '9 min', blurb: 'How routine quietly rebuilds a shattered mind.' },
      { id: 'r2', title: 'The anchor morning', dur: '12 min', blurb: 'A morning ritual you can keep on your worst day.' },
      { id: 'r3', title: 'Sleep as medicine', dur: '10 min', blurb: 'Fixing the foundation everything stands on.' },
      { id: 'r4', title: 'The power of tiny wins', dur: '8 min', blurb: 'Momentum from the smallest possible steps.' }
    ]
  },
  {
    n: 3, key: 'restore', dim: 'vitality', title: 'Restore the Body', sanskrit: 'Prāṇa', glyph: '❋',
    tagline: 'Bring energy back through movement, food, and breath.',
    practice: 'A daily 10-minute walk + one nourishing meal.',
    lessons: [
      { id: 'b1', title: 'The body leads the mind', dur: '9 min', blurb: 'Why motion changes emotion.' },
      { id: 'b2', title: 'Breath: your reset button', dur: '11 min', blurb: 'Prāṇāyāma to calm the nervous system.' },
      { id: 'b3', title: 'Eating to feel alive', dur: '10 min', blurb: 'Simple, sustainable nourishment.' }
    ]
  },
  {
    n: 4, key: 'still', dim: 'mind', title: 'Still the Mind', sanskrit: 'Dhyāna', glyph: '☾',
    tagline: 'Quiet anxiety, loosen the grip of thoughts, find stillness.',
    practice: '10 minutes of guided meditation, daily.',
    lessons: [
      { id: 'm1', title: 'You are not your thoughts', dur: '10 min', blurb: 'Watching the mind instead of drowning in it.' },
      { id: 'm2', title: 'Meeting anxiety', dur: '12 min', blurb: 'Tools for the moments that overwhelm you.' },
      { id: 'm3', title: 'The practice of stillness', dur: '14 min', blurb: 'A meditation you can return to for life.' }
    ]
  },
  {
    n: 5, key: 'release', dim: 'worth', title: 'Release the Past', sanskrit: 'Kṣamā', glyph: '❁',
    tagline: 'Heal old wounds, rebuild self-worth, let go.',
    practice: 'Write a letter you never send. Then a list of what you forgive.',
    lessons: [
      { id: 'p1', title: 'Carrying what was never yours', dur: '11 min', blurb: 'Setting down inherited pain.' },
      { id: 'p2', title: 'Forgiveness (including yourself)', dur: '13 min', blurb: 'Freedom is on the other side of letting go.' },
      { id: 'p3', title: 'Rebuilding self-worth', dur: '10 min', blurb: 'Becoming your own steady ground.' }
    ]
  },
  {
    n: 6, key: 'reconnect', dim: 'connection', title: 'Reconnect', sanskrit: 'Saṅga', glyph: '✦',
    tagline: 'Rebuild the bonds that hold a life together.',
    practice: 'Reach out to one person this week — a message, a call.',
    lessons: [
      { id: 'c1', title: 'Why we withdraw', dur: '9 min', blurb: 'Isolation and the way back to people.' },
      { id: 'c2', title: 'Repairing what frayed', dur: '12 min', blurb: 'Honest, brave reconnection.' },
      { id: 'c3', title: 'Building your circle', dur: '10 min', blurb: 'Finding people who bring you to life.' }
    ]
  },
  {
    n: 7, key: 'purpose', dim: 'purpose', title: 'Rediscover Purpose', sanskrit: 'Dharma', glyph: '✧',
    tagline: 'Find meaning, values, and something to move toward.',
    practice: 'Name your top 3 values and one small goal aligned with them.',
    lessons: [
      { id: 'd1', title: 'The question of "why"', dur: '11 min', blurb: 'Meaning as the engine of recovery.' },
      { id: 'd2', title: 'Your values, your compass', dur: '12 min', blurb: 'Deciding what your life is for.' },
      { id: 'd3', title: 'Goals that pull you forward', dur: '10 min', blurb: 'Turning direction into daily action.' }
    ]
  },
  {
    n: 8, key: 'rise', dim: 'stability', title: 'Rise & Sustain', sanskrit: 'Utthāna', glyph: '✺',
    tagline: 'Build stability and momentum that lasts.',
    practice: 'Set up one system for money, one for health, one for growth.',
    lessons: [
      { id: 'u1', title: 'Making it stick', dur: '10 min', blurb: 'Habits that survive hard days.' },
      { id: 'u2', title: 'Stability & foundations', dur: '12 min', blurb: 'Money, work, and calm order.' },
      { id: 'u3', title: 'The life you are building', dur: '9 min', blurb: 'Becoming who you were meant to be.' }
    ]
  }
];

const ALL_LESSONS = STAGES.flatMap((s) => s.lessons.map((l) => l.id));
const STORE = 'reawaken_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
const save = (d) => localStorage.setItem(STORE, JSON.stringify(d));

/* --------- A small ornamental "ॐ" wordmark --------- */
const Om = ({ className = '' }) => <span className={`font-display ${className}`}>ॐ</span>;

/* --------- A calming verse block --------- */
const Verse = () => (
  <section className="relative bg-sand/70 border-y border-gold/15 py-14 overflow-hidden">
    <div className="mandala absolute -left-16 top-1/2 -translate-y-1/2 w-64 h-64 opacity-[0.05]" />
    <div className="relative max-w-2xl mx-auto px-6 text-center">
      <p className="text-3xl text-gold/80 mb-4">❝</p>
      <p className="font-display text-2xl md:text-3xl text-maroon leading-snug">
        उद्धरेदात्मनात्मानं नात्मानमवसादयेत्
      </p>
      <p className="text-ink-soft italic mt-3 max-w-xl mx-auto">
        “Lift yourself by your own self; never let yourself sink. For the self alone is the friend of the self.”
      </p>
      <p className="eyebrow mt-4">Bhagavad Gītā · 6.5</p>
    </div>
  </section>
);

/* --------- Life Wheel (radar chart) — soft gradient + glow + vertex dots --------- */
const LifeWheel = ({ scores }) => {
  const size = 340, cx = size / 2, cy = size / 2, R = 122;
  const n = DIMENSIONS.length;
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = DIMENSIONS.map((d, i) => pt(i, (scores[d.key] / 5) * R).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[19rem] mx-auto">
      <defs>
        <radialGradient id="lw-fill" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#e4c97e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e0892b" stopOpacity="0.32" />
        </radialGradient>
        <filter id="lw-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* concentric guide rings */}
      {[0.25, 0.5, 0.75, 1].map((f, k) => (
        <polygon key={k} points={DIMENSIONS.map((_, i) => pt(i, R * f).join(',')).join(' ')}
          fill="none" stroke="#dcccae" strokeWidth="1" opacity={0.7} />
      ))}
      {/* spokes */}
      {DIMENSIONS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2d6bd" strokeWidth="1" />; })}
      {/* the score shape */}
      <g className="animate-wheel-in" filter="url(#lw-glow)">
        <polygon points={poly} fill="url(#lw-fill)" stroke="#c8a04a" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      {/* vertex dots */}
      {DIMENSIONS.map((d, i) => { const [x, y] = pt(i, (scores[d.key] / 5) * R); return <circle key={d.key} cx={x} cy={y} r="3.2" fill="#a5762b" />; })}
      {/* labels */}
      {DIMENSIONS.map((d, i) => {
        const [x, y] = pt(i, R + 18);
        return <text key={d.key} x={x} y={y} fontSize="9.5" fill="#6b5f4f" fontWeight="600" textAnchor="middle" dominantBaseline="middle">{d.label.split(' ')[0]}</text>;
      })}
    </svg>
  );
};

/* --------- The video player area (shared by the watch view) --------- */
const PlayerFallback = ({ lesson, label = "Loading player…" }) => (
  <div className="w-full h-full bg-gradient-to-br from-maroon-dark to-maroon grid place-items-center relative">
    <div className="mandala animate-spin-slow absolute inset-0 m-auto w-[120%] h-[120%] opacity-[0.07]" />
    <div className="relative text-center text-cream px-6">
      <div className="relative mx-auto mb-4 h-20 w-20 grid place-items-center">
        <span className="absolute inset-0 rounded-full bg-gold/30 animate-breathe" />
        <span className="relative h-16 w-16 rounded-full bg-gold/90 text-maroon-dark grid place-items-center text-2xl">▶</span>
      </div>
      <p className="text-sm text-cream/75">Guided video · {lesson.dur}</p>
      <p className="text-xs text-cream/50 mt-1">{label}</p>
    </div>
  </div>
);

const Player = ({ lesson, videoUrl, onEnded }) => {
  if (!videoUrl) return <PlayerFallback lesson={lesson} label="Coming soon — this lesson's video is being prepared." />;
  return (
    <Suspense fallback={<PlayerFallback lesson={lesson} />}>
      <LessonPlayer title={lesson.title} src={videoUrl} onEnded={onEnded} />
    </Suspense>
  );
};

/* --------- Circular progress ring for the playlist footer --------- */
const ProgressRing = ({ percent, size = 52, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-gold)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (percent / 100) * c}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      <defs>
        <linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6b64d" />
          <stop offset="100%" stopColor="#e0892b" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/* --------- Immersive "theater" watch view: player + a premium playlist --------- */
const Watch = ({ playlist, activeId, videos, doneSet, progress, onSelect, onToggle, onBack }) => {
  const idx = Math.max(0, playlist.findIndex((p) => p.lesson.id === activeId));
  const current = playlist[idx];
  const [collapsed, setCollapsed] = useState(() => new Set());
  if (!current) return null;
  const prev = playlist[idx - 1];
  const next = playlist[idx + 1];
  const { stage, lesson } = current;
  const done = doneSet.has(lesson.id);

  // Group the flat playlist into stage sections for the sidebar.
  const sections = [];
  playlist.forEach((p, i) => {
    const last = sections[sections.length - 1];
    if (!last || last.stage.key !== p.stage.key) sections.push({ stage: p.stage, items: [{ ...p, i }] });
    else last.items.push({ ...p, i });
  });
  const toggleSection = (key) => setCollapsed((c) => {
    const n = new Set(c); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  return (
    <main className="flex-1 relative bg-[#0e0d12] text-cream pt-20">
      {/* ambient warmth */}
      <div className="pointer-events-none absolute -top-10 left-1/4 w-[40rem] h-[40rem] rounded-full bg-gold/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-24 w-[32rem] h-[32rem] rounded-full bg-saffron/[0.05] blur-3xl" />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* top bar */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onBack} className="group inline-flex items-center gap-2 text-sm font-medium rounded-full bg-white/5 border border-white/10 text-cream/85 px-4 py-1.5 hover:bg-white/10 transition-colors">
            <span className="transition-transform group-hover:-translate-x-0.5">←</span> Back to roadmap
          </button>
          <p className="hidden sm:flex items-center gap-2 text-xs text-cream/50">
            <span className="text-gold">{stage.glyph}</span>{stage.title}
            <span className="text-white/20">·</span> Lesson {idx + 1} of {playlist.length}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* ---- Player + details ---- */}
          <div className="animate-fade-up min-w-0">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
              <Player lesson={lesson} videoUrl={videos[lesson.id]} onEnded={() => next && onSelect(next.lesson.id)} />
            </div>

            <div className="mt-6">
              <p className="text-[0.7rem] uppercase tracking-[0.2em] font-semibold text-gold flex items-center gap-2">
                <span>{stage.glyph}</span>{stage.title}
                <span className="text-gold/60 italic normal-case tracking-normal font-normal">· {stage.sanskrit}</span>
              </p>
              <h1 className="font-display text-2xl md:text-[2rem] font-semibold text-cream mt-2 leading-tight">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-cream/55">
                <span className="inline-flex items-center gap-1.5">🕐 {lesson.dur}</span>
                <span className="inline-flex items-center gap-1.5">📶 Guided lesson</span>
                <span className="inline-flex items-center gap-1.5 text-gold/80">✦ {stage.title}</span>
                {done && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs px-2.5 py-0.5 border border-emerald-400/20">✓ Completed</span>}
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={() => onToggle(lesson.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${done ? 'bg-white/8 text-cream/80 border border-white/15 hover:bg-white/12' : 'bg-gradient-to-br from-gold to-[#d4922f] text-[#2a1608] hover:brightness-105'}`}>
                  {done ? '↺ Mark as not done' : '✓ Mark as complete'}
                </button>
                <button disabled={!prev} onClick={() => prev && onSelect(prev.lesson.id)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-cream/85 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-white/5">← Previous</button>
                <button disabled={!next} onClick={() => next && onSelect(next.lesson.id)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-cream/85 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-white/5">Next lesson →</button>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 mt-6 relative overflow-hidden">
                <Om className="absolute -right-3 -bottom-4 text-7xl text-gold/[0.07] select-none" />
                <p className="relative text-cream/70 leading-relaxed">{lesson.blurb}</p>
                <div className="h-px bg-gradient-to-r from-gold/30 to-transparent my-4" />
                <div className="relative flex gap-3">
                  <span className="text-gold text-lg leading-none">❋</span>
                  <p className="text-sm text-cream/75"><span className="font-semibold text-gold">This stage's practice — </span>{stage.practice}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Playlist sidebar ---- */}
          <aside className="lg:sticky lg:top-24 self-start animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
                <span className="font-display text-lg font-semibold text-cream">Lessons</span>
                <span className="text-xs text-cream/45">{doneSet.size}/{playlist.length} done</span>
              </div>

              <div className="max-h-[62vh] overflow-y-auto reawaken-scroll">
                {sections.map((sec) => {
                  const isOpen = !collapsed.has(sec.stage.key);
                  const secDone = sec.items.filter((it) => doneSet.has(it.lesson.id)).length;
                  return (
                    <div key={sec.stage.key} className="border-b border-white/[0.06] last:border-0">
                      <button onClick={() => toggleSection(sec.stage.key)}
                        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-white/[0.03] transition-colors">
                        <span className="text-gold text-sm">{sec.stage.glyph}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-cream truncate">{sec.stage.title}</span>
                          <span className="block text-[0.68rem] text-cream/40">{secDone}/{sec.items.length} · {sec.stage.sanskrit}</span>
                        </span>
                        <span className={`text-cream/40 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                      </button>

                      {isOpen && sec.items.map((it) => {
                        const active = it.lesson.id === activeId;
                        const ldone = doneSet.has(it.lesson.id);
                        const hasVideo = !!videos[it.lesson.id];
                        return (
                          <button key={it.lesson.id} disabled={!hasVideo && !ldone}
                            onClick={() => onSelect(it.lesson.id)}
                            className={`group w-full flex items-center gap-3 pl-5 pr-4 py-2.5 text-left transition-colors ${active ? 'bg-gold/[0.12]' : 'hover:bg-white/[0.04]'} ${!hasVideo && !ldone ? 'cursor-not-allowed' : ''}`}>
                            {/* status icon */}
                            <span className="flex-shrink-0">
                              {ldone ? (
                                <span className="grid place-items-center h-6 w-6 rounded-full bg-gradient-to-br from-gold to-[#d4922f] text-[#2a1608] text-xs font-bold">✓</span>
                              ) : active ? (
                                <span className="grid place-items-center h-6 w-6 rounded-full border-2 border-gold text-gold text-[0.6rem]">▶</span>
                              ) : hasVideo ? (
                                <span className="grid place-items-center h-6 w-6 rounded-full border border-white/25 text-cream/55 text-[0.6rem] group-hover:border-gold/60 group-hover:text-gold transition-colors">▶</span>
                              ) : (
                                <span className="grid place-items-center h-6 w-6 rounded-full border border-white/10 text-cream/25 text-[0.7rem]">🔒</span>
                              )}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className={`block text-sm leading-snug line-clamp-2 ${active ? 'text-gold font-medium' : ldone ? 'text-cream/70' : hasVideo ? 'text-cream/90' : 'text-cream/35'}`}>
                                {it.lesson.title}
                              </span>
                              {!hasVideo && !ldone && <span className="block text-[0.66rem] text-cream/30 mt-0.5">coming soon</span>}
                            </span>
                            <span className="flex-shrink-0 text-[0.7rem] text-cream/40 tabular-nums">{it.lesson.dur}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* course progress footer */}
              <div className="flex items-center gap-4 px-5 py-4 border-t border-white/10 bg-white/[0.02]">
                <div className="relative grid place-items-center">
                  <ProgressRing percent={progress} />
                  <span className="absolute text-[0.7rem] font-semibold text-cream">{progress}%</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-cream">Course Progress</p>
                  <p className="text-xs text-cream/50">{doneSet.size} of {playlist.length} lessons completed</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* blend the dark theater smoothly into the maroon footer */}
      <div className="h-28 mt-12 bg-gradient-to-b from-[#0e0d12] to-maroon-dark" />
    </main>
  );
};

/* ============================ Page ============================ */
const Reawaken = () => {
  const { user } = useAuth();
  const [data, setData] = useState(load());
  const [videos, setVideos] = useState({});
  const [view, setView] = useState(data.scores ? 'plan' : 'intro'); // intro | assess | plan | watch
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(data.answers || {});
  const [watchId, setWatchId] = useState(null);

  useEffect(() => save(data), [data]);

  // Best-effort push of a logged-in user's plan to the server (survives across
  // devices). Falls back silently to localStorage-only when logged out/offline.
  const pushServer = (d) => {
    if (!user) return;
    api.put('/reawaken/progress', {
      scores: d.scores || null,
      answers: d.answers || null,
      completedLessons: d.done || []
    }).catch(() => {});
  };

  // Load the admin-set lesson videos (public — no auth needed).
  useEffect(() => {
    let alive = true;
    api.get('/reawaken/course').then((r) => { if (alive) setVideos(r.data.videos || {}); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // For a logged-in user, adopt any plan saved server-side; if they have a local
  // plan but nothing is saved yet, push the local one up.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.get('/reawaken/progress').then((r) => {
      if (!alive) return;
      const s = r.data || {};
      if (s.scores) {
        const merged = { scores: s.scores, answers: s.answers || {}, done: s.completedLessons || [] };
        setData(merged);
        setAnswers(s.answers || {});
        setView('plan');
      } else if (data.scores) {
        pushServer(data);
      }
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const doneSet = useMemo(() => new Set(data.done || []), [data.done]);
  const overall = data.scores ? Math.round((Object.values(data.scores).reduce((a, b) => a + b, 0) / (DIMENSIONS.length * 5)) * 100) : 0;
  const progress = Math.round((doneSet.size / ALL_LESSONS.length) * 100);

  // Focus areas = the 3 lowest-scoring dimensions.
  const focus = useMemo(() => {
    if (!data.scores) return [];
    return [...DIMENSIONS].sort((a, b) => data.scores[a.key] - data.scores[b.key]).slice(0, 3);
  }, [data.scores]);

  // Roadmap order: stage 1 first, then stages whose dimension is a focus area, then the rest.
  const roadmap = useMemo(() => {
    if (!data.scores) return STAGES;
    const focusKeys = new Set(focus.map((f) => f.key));
    const first = STAGES.filter((s) => s.n === 1);
    const prioritized = STAGES.filter((s) => s.n !== 1 && focusKeys.has(s.dim));
    const rest = STAGES.filter((s) => s.n !== 1 && !focusKeys.has(s.dim));
    return [...first, ...prioritized, ...rest];
  }, [data.scores, focus]);

  const submitAssessment = () => {
    const scores = {};
    DIMENSIONS.forEach((d) => { scores[d.key] = answers[d.key] || 3; });
    const next = { ...data, scores, answers };
    setData(next);
    pushServer(next);
    setView('plan');
    window.scrollTo(0, 0);
  };
  const toggleLesson = (id) => {
    const done = new Set(data.done || []);
    done.has(id) ? done.delete(id) : done.add(id);
    const next = { ...data, done: [...done] };
    setData(next);
    pushServer(next);
  };
  const retake = () => { setAnswers({}); setStep(0); setView('assess'); window.scrollTo(0, 0); };

  // Flat playlist (in roadmap order) that the watch view pages through.
  const playlist = useMemo(() => roadmap.flatMap((s) => s.lessons.map((l) => ({ stage: s, lesson: l }))), [roadmap]);
  const openWatch = (id) => {
    setWatchId(id || playlist[0]?.lesson.id);
    setView('watch');
    window.scrollTo(0, 0);
  };

  const answered = answers[DIMENSIONS[step].key];

  return (
    <div className={`min-h-screen flex flex-col ${view === 'watch' ? 'bg-maroon-dark' : ''}`}>
      <Navbar />

      {/* ===== INTRO ===== */}
      {view === 'intro' && (
        <>
          <header className="relative overflow-hidden bg-gradient-to-b from-maroon-dark via-maroon to-[#7d2636] text-cream">
            {/* layered ambient motion */}
            <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-gold/20 blur-3xl animate-breathe" />
            <div className="mandala animate-spin-slow absolute -top-48 left-1/2 -translate-x-1/2 w-[720px] h-[720px] opacity-[0.09]" />
            <div className="mandala animate-spin-rev absolute -bottom-56 -left-40 w-[560px] h-[560px] opacity-[0.05]" />

            <div className="relative max-w-4xl mx-auto px-6 pt-36 pb-28 text-center animate-fade-up">
              <div className="ornament mb-6"><span className="text-lg">ॐ</span></div>
              <p className="eyebrow text-gold mb-5">A Guided Journey Back to Life</p>
              <h1 className="font-display text-6xl md:text-8xl font-semibold leading-[0.95] mb-6">
                Reawaken
                <span className="block text-gradient-gold italic text-4xl md:text-6xl mt-3 font-medium">your path back to life</span>
              </h1>
              <p className="text-lg md:text-xl text-cream/80 max-w-2xl mx-auto leading-relaxed">
                When life slips off track — the fog, the numbness, the lost momentum — this is a gentle, step-by-step
                video journey to rebuild it, one stage at a time. Ancient wisdom, made practical.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button onClick={() => setView('assess')} className="btn btn-gold">Take the free Life Compass →</button>
                <a href="#curriculum" className="btn btn-outline-light">Explore the 8 stages</a>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-cream/60 tracking-wide">
                <span>✦ 8 guided stages</span>
                <span>✦ 25 short lessons</span>
                <span>✦ A plan shaped around you</span>
              </div>
            </div>
            <div className="h-20 bg-gradient-to-b from-transparent to-cream" />
          </header>

          <main className="flex-1 bg-cream">
            <section className="max-w-6xl mx-auto px-6 py-20">
              <div className="text-center mb-14">
                <p className="eyebrow mb-2">How it works</p>
                <h2 className="font-display text-4xl md:text-5xl font-semibold text-maroon">A journey shaped around you</h2>
                <div className="ornament mt-4"><span>✦</span></div>
              </div>
              <div className="relative grid md:grid-cols-3 gap-7">
                {/* connecting path behind the medallions (desktop) */}
                <div className="hidden md:block absolute top-[3.25rem] left-[16%] right-[16%] h-px border-t-2 border-dashed border-gold/30" />
                {[
                  { icon: '🧭', n: '1', t: 'Life Compass', d: 'A short, honest assessment maps where you are across 8 areas of life — and reveals what to tend to first.' },
                  { icon: '🗺️', n: '2', t: 'Your Roadmap', d: 'A personalized path through 8 stages, reordered so your hardest areas get the right support first.' },
                  { icon: '🎥', n: '3', t: 'Guided Videos', d: 'Short video lessons, a daily practice, and gentle reflection for each stage — with progress you can see.' }
                ].map((c, i) => (
                  <div key={c.t} className="relative card card-hover p-8 text-center animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="relative mx-auto mb-5 h-[3.25rem] w-[3.25rem] -mt-11">
                      <div className="h-full w-full rounded-full bg-gradient-to-br from-gold-light to-gold text-maroon-dark grid place-items-center font-display text-2xl font-semibold shadow-[0_8px_20px_-8px_rgba(200,160,74,0.8)] ring-4 ring-cream">{c.n}</div>
                    </div>
                    <div className="text-3xl mb-3">{c.icon}</div>
                    <h3 className="font-display text-xl font-semibold text-maroon mb-2">{c.t}</h3>
                    <p className="text-ink-soft text-sm leading-relaxed">{c.d}</p>
                  </div>
                ))}
              </div>
            </section>

            <Verse />

            <Curriculum roadmap={STAGES} doneSet={doneSet} onOpen={() => setView('assess')} preview />

            <SafetyNote />
          </main>
        </>
      )}

      {/* ===== ASSESSMENT ===== */}
      {view === 'assess' && (
        <main className="flex-1 relative bg-gradient-to-b from-sand/60 to-cream pt-28 pb-20 overflow-hidden">
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-gold/12 blur-3xl animate-breathe" />
          <div className="mandala animate-spin-slow absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 opacity-[0.06]" />

          <div className="relative max-w-xl mx-auto px-6">
            <div className="text-center mb-8">
              <p className="eyebrow mb-2">The Life Compass</p>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-maroon">Where are you right now?</h1>
              <p className="text-ink-soft text-sm mt-2">Breathe, and answer honestly — there are no wrong answers.</p>
            </div>

            {/* progress: dots + slim bar */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {DIMENSIONS.map((d, i) => (
                <span key={d.key} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-saffron' : i < step || answers[d.key] ? 'w-1.5 bg-gold' : 'w-1.5 bg-black/10'}`} />
              ))}
            </div>
            <p className="text-center text-xs text-ink-soft/70 mb-6">Question {step + 1} of {DIMENSIONS.length}</p>

            <div key={step} className="card p-8 md:p-10 text-center animate-fade-up relative overflow-hidden">
              <Om className="absolute -right-4 -top-5 text-8xl text-gold/[0.07] select-none" />
              <span className="eyebrow">{DIMENSIONS[step].label}</span>
              <p className="font-display text-2xl md:text-[1.75rem] text-maroon mt-3 mb-9 leading-snug">“{DIMENSIONS[step].q}”</p>
              <div className="flex justify-between items-end gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((v) => {
                  const sel = answered === v;
                  return (
                    <button key={v} onClick={() => setAnswers({ ...answers, [DIMENSIONS[step].key]: v })}
                      className={`flex-1 aspect-square max-w-[3.75rem] mx-auto rounded-full border-2 font-display text-xl transition-all duration-200 ${sel ? 'border-gold bg-gradient-to-br from-gold-light to-gold text-maroon-dark scale-110 shadow-[0_10px_24px_-10px_rgba(200,160,74,0.9)]' : 'border-gold/30 text-ink-soft hover:border-gold hover:bg-gold/5'}`}>
                      {v}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-ink-soft/70 mt-3 px-1">
                <span>Not at all</span><span>Completely</span>
              </div>
            </div>

            <div className="flex justify-between mt-7">
              <button onClick={() => (step === 0 ? setView('intro') : setStep(step - 1))} className="btn btn-outline">← Back</button>
              {step < DIMENSIONS.length - 1 ? (
                <button disabled={!answered} onClick={() => setStep(step + 1)} className="btn btn-primary disabled:opacity-40">Next →</button>
              ) : (
                <button disabled={!answered} onClick={submitAssessment} className="btn btn-gold disabled:opacity-40">Reveal my roadmap ✦</button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ===== PLAN / ROADMAP ===== */}
      {view === 'plan' && data.scores && (
        <main className="flex-1 bg-cream">
          <div className="relative bg-gradient-to-b from-maroon-dark via-maroon to-[#7a2333] text-cream pt-32 pb-24 overflow-hidden">
            <div className="pointer-events-none absolute -top-10 right-10 w-[30rem] h-[30rem] rounded-full bg-gold/15 blur-3xl animate-breathe" />
            <div className="mandala animate-spin-slow absolute -right-24 -top-16 w-96 h-96 opacity-[0.07]" />
            <div className="relative max-w-5xl mx-auto px-6">
              <p className="eyebrow text-gold mb-2">Your Life Compass</p>
              <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight">Your personalized roadmap</h1>
              <div className="grid md:grid-cols-2 gap-10 mt-10 items-center">
                <div className="relative mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gold/15 blur-2xl animate-breathe" />
                  <div className="relative rounded-full bg-cream/95 p-5 shadow-[var(--shadow-lift)] ring-1 ring-gold/30">
                    <LifeWheel scores={data.scores} />
                  </div>
                </div>
                <div className="animate-fade-up">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-display text-6xl font-bold text-gradient-gold">{overall}%</span>
                    <span className="text-cream/70 leading-tight">overall<br />life balance</span>
                  </div>
                  <p className="text-cream/80 text-sm mb-4">Start where it matters most — the areas asking for your care right now:</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {focus.map((f) => <span key={f.key} className="pill bg-gold/20 text-gold-light border border-gold/30">{f.label}</span>)}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => openWatch(playlist[0]?.lesson.id)} className="btn btn-gold">▶ Begin the journey</button>
                    <button onClick={retake} className="btn btn-outline-light">Retake compass</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-b from-transparent to-cream" />
          </div>

          {progress > 0 && (
            <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-10">
              <div className="card p-5 flex items-center gap-4">
                <span className="text-gold text-lg">❋</span>
                <span className="text-sm text-ink-soft whitespace-nowrap font-medium">Program progress</span>
                <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-saffron to-gold transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-maroon">{progress}%</span>
              </div>
            </div>
          )}

          <Curriculum roadmap={roadmap} doneSet={doneSet} focus={focus} onLesson={(stage, lesson) => openWatch(lesson.id)} />
          <SafetyNote />
        </main>
      )}

      {/* ===== WATCH (playlist player) ===== */}
      {view === 'watch' && (
        <Watch
          playlist={playlist}
          activeId={watchId}
          videos={videos}
          doneSet={doneSet}
          progress={progress}
          onSelect={(id) => { setWatchId(id); window.scrollTo(0, 0); }}
          onToggle={toggleLesson}
          onBack={() => setView('plan')}
        />
      )}

      <Footer />
    </div>
  );
};

/* --------- Curriculum / roadmap list — a vertical "journey path" --------- */
const Curriculum = ({ roadmap, doneSet, focus = [], onLesson, onOpen, preview }) => {
  const [open, setOpen] = useState(null);
  const focusKeys = new Set(focus.map((f) => f.key));
  return (
    <section id={preview ? 'curriculum' : 'roadmap'} className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <p className="eyebrow mb-2">{preview ? 'The Curriculum' : 'Your Roadmap'}</p>
        <h2 className="font-display text-4xl md:text-5xl font-semibold text-maroon">The 8 Stages Back to Life</h2>
        {preview && <p className="text-ink-soft mt-3 max-w-xl mx-auto">Each stage is a gentle threshold to cross — with short videos, a daily practice, and reflection.</p>}
      </div>

      {/* the journey path */}
      <div className="relative">
        <div className="absolute left-[1.4rem] top-4 bottom-4 w-px bg-gradient-to-b from-gold/50 via-gold/25 to-transparent" />
        <div className="space-y-4">
          {roadmap.map((s, idx) => {
            const isOpen = open === s.key;
            const stageDone = s.lessons.every((l) => doneSet.has(l.id));
            const isFocus = focusKeys.has(s.dim);
            return (
              <div key={s.key} className="relative pl-14">
                {/* medallion on the path */}
                <span className={`absolute left-0 top-3 grid place-items-center h-11 w-11 rounded-full flex-shrink-0 font-display text-lg ring-4 ring-cream z-10 ${stageDone ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-maroon to-maroon-dark text-gold'} ${isFocus && !stageDone ? 'shadow-[0_0_0_3px_rgba(224,137,43,0.35)]' : ''}`}>
                  {stageDone ? '✓' : idx + 1}
                </span>
                <div className={`card overflow-hidden transition-shadow ${isFocus ? 'ring-1 ring-gold/40' : ''} ${isOpen ? 'shadow-[var(--shadow-lift)]' : ''}`}>
                  <button onClick={() => setOpen(isOpen ? null : s.key)} className="w-full flex items-center gap-3 p-5 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gold">{s.glyph}</span>
                        <h3 className="font-display text-xl font-semibold text-maroon">{s.title}</h3>
                        <span className="text-xs text-gold italic">{s.sanskrit}</span>
                        {isFocus && <span className="pill bg-saffron/15 text-saffron text-[0.6rem]">Focus first</span>}
                      </div>
                      <p className="text-sm text-ink-soft truncate mt-0.5">{s.tagline}</p>
                    </div>
                    <span className="text-xs text-ink-soft/60 flex-shrink-0 flex items-center gap-1.5">
                      <span className="hidden sm:inline">{s.lessons.length} lessons</span>
                      <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gold/10 pt-2 animate-fade-up">
                      {s.lessons.map((l) => {
                        const done = doneSet.has(l.id);
                        return (
                          <div key={l.id}
                            onClick={() => (preview ? onOpen() : onLesson(s, l))}
                            className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg cursor-pointer group hover:bg-sand/60 transition-colors">
                            <span className={`h-8 w-8 rounded-full grid place-items-center text-xs flex-shrink-0 transition-colors ${done ? 'bg-gold text-maroon-dark' : 'bg-sand text-maroon group-hover:bg-gold/25'}`}>{done ? '✓' : '▶'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-maroon font-medium group-hover:text-saffron transition-colors">{l.title}</p>
                              <p className="text-xs text-ink-soft truncate">{l.blurb}</p>
                            </div>
                            <span className="text-xs text-ink-soft/60 flex-shrink-0">{l.dur}</span>
                          </div>
                        );
                      })}
                      <div className="mt-3 flex gap-3 text-xs text-ink bg-sand/80 rounded-xl p-3.5">
                        <span className="text-gold text-base leading-none">❋</span>
                        <p><span className="font-semibold text-maroon">Practice — </span>{s.practice}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {preview && (
        <div className="text-center mt-12">
          <button onClick={onOpen} className="btn btn-primary">Start with the free Life Compass →</button>
        </div>
      )}
    </section>
  );
};

const SafetyNote = () => (
  <section className="max-w-3xl mx-auto px-6 pb-20">
    <div className="card border-l-4 border-saffron p-5 text-sm text-ink-soft leading-relaxed">
      <p className="font-semibold text-maroon mb-1 flex items-center gap-2"><span className="text-saffron">♡</span> A gentle, important note</p>
      This program supports personal growth and is <span className="font-medium">not a substitute for professional medical or
      mental-health care</span>. If you are struggling severely or in crisis, please reach out to a professional or a helpline —
      in India: <span className="text-maroon font-medium">KIRAN 1800-599-0019</span> (24/7) or <span className="text-maroon font-medium">iCall 9152987821</span>.
      You deserve support. 🙏
    </div>
  </section>
);

export default Reawaken;
