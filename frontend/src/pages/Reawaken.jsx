import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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
    n: 1, key: 'awaken', dim: null, title: 'Awaken', sanskrit: 'Jāgṛti',
    tagline: 'Face where you are — with honesty and hope.',
    practice: 'A 5-minute "honest inventory" — name where you are without judgment.',
    lessons: [
      { id: 'a1', title: 'You are not broken, you are buried', dur: '8 min', blurb: 'Why feeling lost is a beginning, not an end.' },
      { id: 'a2', title: 'The honest inventory', dur: '11 min', blurb: 'Seeing your life clearly, without shame.' },
      { id: 'a3', title: 'Choosing to come back', dur: '7 min', blurb: 'The one decision everything else rests on.' }
    ]
  },
  {
    n: 2, key: 'reset', dim: 'structure', title: 'Reset the Days', sanskrit: 'Dinacharyā',
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
    n: 3, key: 'restore', dim: 'vitality', title: 'Restore the Body', sanskrit: 'Prāṇa',
    tagline: 'Bring energy back through movement, food, and breath.',
    practice: 'A daily 10-minute walk + one nourishing meal.',
    lessons: [
      { id: 'b1', title: 'The body leads the mind', dur: '9 min', blurb: 'Why motion changes emotion.' },
      { id: 'b2', title: 'Breath: your reset button', dur: '11 min', blurb: 'Prāṇāyāma to calm the nervous system.' },
      { id: 'b3', title: 'Eating to feel alive', dur: '10 min', blurb: 'Simple, sustainable nourishment.' }
    ]
  },
  {
    n: 4, key: 'still', dim: 'mind', title: 'Still the Mind', sanskrit: 'Dhyāna',
    tagline: 'Quiet anxiety, loosen the grip of thoughts, find stillness.',
    practice: '10 minutes of guided meditation, daily.',
    lessons: [
      { id: 'm1', title: 'You are not your thoughts', dur: '10 min', blurb: 'Watching the mind instead of drowning in it.' },
      { id: 'm2', title: 'Meeting anxiety', dur: '12 min', blurb: 'Tools for the moments that overwhelm you.' },
      { id: 'm3', title: 'The practice of stillness', dur: '14 min', blurb: 'A meditation you can return to for life.' }
    ]
  },
  {
    n: 5, key: 'release', dim: 'worth', title: 'Release the Past', sanskrit: 'Kṣamā',
    tagline: 'Heal old wounds, rebuild self-worth, let go.',
    practice: 'Write a letter you never send. Then a list of what you forgive.',
    lessons: [
      { id: 'p1', title: 'Carrying what was never yours', dur: '11 min', blurb: 'Setting down inherited pain.' },
      { id: 'p2', title: 'Forgiveness (including yourself)', dur: '13 min', blurb: 'Freedom is on the other side of letting go.' },
      { id: 'p3', title: 'Rebuilding self-worth', dur: '10 min', blurb: 'Becoming your own steady ground.' }
    ]
  },
  {
    n: 6, key: 'reconnect', dim: 'connection', title: 'Reconnect', sanskrit: 'Saṅga',
    tagline: 'Rebuild the bonds that hold a life together.',
    practice: 'Reach out to one person this week — a message, a call.',
    lessons: [
      { id: 'c1', title: 'Why we withdraw', dur: '9 min', blurb: 'Isolation and the way back to people.' },
      { id: 'c2', title: 'Repairing what frayed', dur: '12 min', blurb: 'Honest, brave reconnection.' },
      { id: 'c3', title: 'Building your circle', dur: '10 min', blurb: 'Finding people who bring you to life.' }
    ]
  },
  {
    n: 7, key: 'purpose', dim: 'purpose', title: 'Rediscover Purpose', sanskrit: 'Dharma',
    tagline: 'Find meaning, values, and something to move toward.',
    practice: 'Name your top 3 values and one small goal aligned with them.',
    lessons: [
      { id: 'd1', title: 'The question of "why"', dur: '11 min', blurb: 'Meaning as the engine of recovery.' },
      { id: 'd2', title: 'Your values, your compass', dur: '12 min', blurb: 'Deciding what your life is for.' },
      { id: 'd3', title: 'Goals that pull you forward', dur: '10 min', blurb: 'Turning direction into daily action.' }
    ]
  },
  {
    n: 8, key: 'rise', dim: 'stability', title: 'Rise & Sustain', sanskrit: 'Utthāna',
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

/* --------- Life Wheel (radar chart) --------- */
const LifeWheel = ({ scores }) => {
  const size = 320, cx = size / 2, cy = size / 2, R = 120;
  const n = DIMENSIONS.length;
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = DIMENSIONS.map((d, i) => pt(i, (scores[d.key] / 5) * R).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
      {[0.25, 0.5, 0.75, 1].map((f, k) => (
        <polygon key={k} points={DIMENSIONS.map((_, i) => pt(i, R * f).join(',')).join(' ')} fill="none" stroke="#e6dcc6" strokeWidth="1" />
      ))}
      {DIMENSIONS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e6dcc6" strokeWidth="1" />; })}
      <polygon points={poly} fill="rgba(224,137,43,0.25)" stroke="#c8a04a" strokeWidth="2" />
      {DIMENSIONS.map((d, i) => {
        const [x, y] = pt(i, R + 16);
        return <text key={d.key} x={x} y={y} fontSize="8.5" fill="#6b5f4f" textAnchor="middle" dominantBaseline="middle">{d.label.split(' ')[0]}</text>;
      })}
    </svg>
  );
};

/* --------- Lesson modal (video placeholder) --------- */
const LessonModal = ({ stage, lesson, done, onToggle, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
    <div className="card max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="aspect-video bg-gradient-to-br from-maroon-dark to-maroon grid place-items-center relative">
        <div className="mandala absolute inset-0 opacity-[0.08]" />
        <div className="relative text-center text-cream">
          <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-gold/90 text-maroon-dark grid place-items-center text-2xl">▶</div>
          <p className="text-sm text-cream/70">Video lesson · {lesson.dur}</p>
          <p className="text-xs text-cream/50 mt-1">(AI-generated video — to be added by admin)</p>
        </div>
      </div>
      <div className="p-6">
        <span className="eyebrow">{stage.title}</span>
        <h3 className="font-display text-2xl font-semibold text-maroon mt-1">{lesson.title}</h3>
        <p className="text-ink-soft mt-2">{lesson.blurb}</p>
        <div className="divider-gold my-4" />
        <p className="text-sm text-ink"><span className="font-semibold text-maroon">This stage's practice:</span> {stage.practice}</p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onToggle(lesson.id)} className={done ? 'btn btn-outline' : 'btn btn-gold'}>
            {done ? '✓ Completed — undo' : 'Mark as complete'}
          </button>
          <button onClick={onClose} className="btn btn-outline">Close</button>
        </div>
      </div>
    </div>
  </div>
);

/* ============================ Page ============================ */
const Reawaken = () => {
  const [data, setData] = useState(load());
  const [view, setView] = useState(data.scores ? 'plan' : 'intro'); // intro | assess | plan
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(data.answers || {});
  const [activeLesson, setActiveLesson] = useState(null);

  useEffect(() => save(data), [data]);

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
    setData((prev) => ({ ...prev, scores, answers }));
    setView('plan');
  };
  const toggleLesson = (id) => {
    setData((prev) => {
      const done = new Set(prev.done || []);
      done.has(id) ? done.delete(id) : done.add(id);
      return { ...prev, done: [...done] };
    });
  };
  const retake = () => { setAnswers({}); setStep(0); setView('assess'); };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ===== INTRO ===== */}
      {view === 'intro' && (
        <>
          <header className="relative overflow-hidden bg-gradient-to-b from-maroon-dark via-maroon to-[#7d2636] text-cream">
            <div className="mandala animate-spin-slow absolute -top-40 left-1/2 -translate-x-1/2 w-[680px] h-[680px] opacity-[0.08]" />
            <div className="relative max-w-4xl mx-auto px-6 pt-36 pb-24 text-center">
              <p className="eyebrow text-gold mb-4">॥ A Guided Journey ॥</p>
              <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] mb-6">
                Reawaken
                <span className="block text-gold-light italic text-4xl md:text-5xl mt-2">Your path back to life</span>
              </h1>
              <p className="text-lg md:text-xl text-cream/80 max-w-2xl mx-auto leading-relaxed">
                If life has slipped off track — the fog, the numbness, the lost momentum — this is a step-by-step
                video program to rebuild it, one stage at a time. Ancient wisdom, made practical.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button onClick={() => setView('assess')} className="btn btn-gold">Take the free Life Compass →</button>
                <a href="#curriculum" className="btn btn-outline-light">See the 8 stages</a>
              </div>
            </div>
            <div className="h-16 bg-gradient-to-b from-transparent to-cream" />
          </header>

          <main className="flex-1 bg-cream">
            <section className="max-w-6xl mx-auto px-6 py-16">
              <div className="text-center mb-12">
                <p className="eyebrow mb-2">How it works</p>
                <h2 className="font-display text-4xl font-semibold text-maroon">A journey shaped around you</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: '🧭', t: '1 · Life Compass', d: 'A short, honest assessment maps where you are across 8 areas of life and reveals what to focus on first.' },
                  { icon: '🗺️', t: '2 · Your Roadmap', d: 'A personalized path through 8 stages — reordered so your hardest areas get the right support first.' },
                  { icon: '🎥', t: '3 · Guided Videos', d: 'Short video lessons, a daily practice, and reflection for each stage — with progress you can see.' }
                ].map((c) => (
                  <div key={c.t} className="card p-7">
                    <div className="text-3xl mb-3">{c.icon}</div>
                    <h3 className="font-display text-xl font-semibold text-maroon mb-2">{c.t}</h3>
                    <p className="text-ink-soft text-sm leading-relaxed">{c.d}</p>
                  </div>
                ))}
              </div>
            </section>

            <Curriculum roadmap={STAGES} doneSet={doneSet} onOpen={() => setView('assess')} preview />

            <SafetyNote />
          </main>
        </>
      )}

      {/* ===== ASSESSMENT ===== */}
      {view === 'assess' && (
        <main className="flex-1 bg-cream pt-28 pb-16">
          <div className="max-w-xl mx-auto px-6">
            <div className="text-center mb-8">
              <p className="eyebrow mb-1">Life Compass</p>
              <h1 className="font-display text-3xl font-semibold text-maroon">Where are you right now?</h1>
              <p className="text-ink-soft text-sm mt-2">Answer honestly — there are no wrong answers. {step + 1} of {DIMENSIONS.length}</p>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 mb-8 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-saffron to-gold transition-all" style={{ width: `${((step + 1) / DIMENSIONS.length) * 100}%` }} />
            </div>

            <div className="card p-8 text-center">
              <span className="eyebrow">{DIMENSIONS[step].label}</span>
              <p className="font-display text-2xl text-maroon mt-2 mb-8 leading-snug">“{DIMENSIONS[step].q}”</p>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} onClick={() => setAnswers({ ...answers, [DIMENSIONS[step].key]: v })}
                    className={`flex-1 py-4 rounded-xl border-2 font-display text-xl transition-all ${answers[DIMENSIONS[step].key] === v ? 'border-gold bg-gold/15 text-maroon scale-105' : 'border-gold/25 text-ink-soft hover:border-gold/50'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-ink-soft/70 mt-2 px-1">
                <span>Strongly disagree</span><span>Strongly agree</span>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => (step === 0 ? setView('intro') : setStep(step - 1))} className="btn btn-outline">← Back</button>
              {step < DIMENSIONS.length - 1 ? (
                <button disabled={!answers[DIMENSIONS[step].key]} onClick={() => setStep(step + 1)} className="btn btn-primary disabled:opacity-40">Next →</button>
              ) : (
                <button disabled={!answers[DIMENSIONS[step].key]} onClick={submitAssessment} className="btn btn-gold disabled:opacity-40">See my roadmap ✨</button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ===== PLAN / ROADMAP ===== */}
      {view === 'plan' && data.scores && (
        <main className="flex-1 bg-cream">
          <div className="relative bg-gradient-to-b from-maroon-dark to-maroon text-cream pt-32 pb-16 overflow-hidden">
            <div className="mandala absolute -right-20 -top-12 w-80 h-80 opacity-[0.07]" />
            <div className="relative max-w-5xl mx-auto px-6">
              <p className="eyebrow text-gold mb-2">Your Life Compass</p>
              <h1 className="font-display text-4xl md:text-5xl font-semibold">Your personalized roadmap</h1>
              <div className="grid md:grid-cols-2 gap-8 mt-8 items-center">
                <div className="card bg-cream/95 p-4"><LifeWheel scores={data.scores} /></div>
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-display text-5xl font-bold text-gold">{overall}%</span>
                    <span className="text-cream/70">overall life balance</span>
                  </div>
                  <p className="text-cream/80 text-sm mb-4">Start here — the areas that need you most right now:</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {focus.map((f) => <span key={f.key} className="pill bg-gold/20 text-gold-light border border-gold/30">{f.label}</span>)}
                  </div>
                  <div className="flex gap-3">
                    <a href="#roadmap" className="btn btn-gold">Begin the journey</a>
                    <button onClick={retake} className="btn btn-outline-light">Retake compass</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {progress > 0 && (
            <div className="max-w-5xl mx-auto px-6 -mt-6">
              <div className="card p-4 flex items-center gap-4">
                <span className="text-sm text-ink-soft whitespace-nowrap">Program progress</span>
                <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-saffron to-gold" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-maroon">{progress}%</span>
              </div>
            </div>
          )}

          <Curriculum roadmap={roadmap} doneSet={doneSet} focus={focus} onLesson={(stage, lesson) => setActiveLesson({ stage, lesson })} />
          <SafetyNote />
        </main>
      )}

      {activeLesson && (
        <LessonModal stage={activeLesson.stage} lesson={activeLesson.lesson} done={doneSet.has(activeLesson.lesson.id)}
          onToggle={toggleLesson} onClose={() => setActiveLesson(null)} />
      )}

      <Footer />
    </div>
  );
};

/* --------- Curriculum / roadmap list --------- */
const Curriculum = ({ roadmap, doneSet, focus = [], onLesson, onOpen, preview }) => {
  const [open, setOpen] = useState(null);
  const focusKeys = new Set(focus.map((f) => f.key));
  return (
    <section id={preview ? 'curriculum' : 'roadmap'} className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <p className="eyebrow mb-2">{preview ? 'The Curriculum' : 'Your Roadmap'}</p>
        <h2 className="font-display text-4xl font-semibold text-maroon">The 8 Stages Back to Life</h2>
        {preview && <p className="text-ink-soft mt-3 max-w-xl mx-auto">Each stage is a hurdle to move through — with short videos, a practice, and reflection.</p>}
      </div>

      <div className="space-y-4">
        {roadmap.map((s, idx) => {
          const isOpen = open === s.key;
          const stageDone = s.lessons.every((l) => doneSet.has(l.id));
          const isFocus = focusKeys.has(s.dim);
          return (
            <div key={s.key} className={`card overflow-hidden ${isFocus ? 'ring-2 ring-gold/40' : ''}`}>
              <button onClick={() => setOpen(isOpen ? null : s.key)} className="w-full flex items-center gap-4 p-5 text-left">
                <span className={`grid place-items-center h-12 w-12 rounded-full flex-shrink-0 font-display text-xl ${stageDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gradient-to-br from-maroon to-maroon-dark text-gold'}`}>
                  {stageDone ? '✓' : idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl font-semibold text-maroon">{s.title}</h3>
                    <span className="text-xs text-gold italic">{s.sanskrit}</span>
                    {isFocus && <span className="pill bg-saffron/15 text-saffron text-[0.6rem]">Focus first</span>}
                  </div>
                  <p className="text-sm text-ink-soft truncate">{s.tagline}</p>
                </div>
                <span className="text-ink-soft/60 flex-shrink-0">{s.lessons.length} lessons {isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-gold/10 pt-3">
                  {s.lessons.map((l) => {
                    const done = doneSet.has(l.id);
                    return (
                      <div key={l.id}
                        onClick={() => (preview ? onOpen() : onLesson(s, l))}
                        className="flex items-center gap-3 py-2.5 cursor-pointer group">
                        <span className={`h-7 w-7 rounded-full grid place-items-center text-xs flex-shrink-0 ${done ? 'bg-gold text-maroon-dark' : 'bg-sand text-maroon'}`}>{done ? '✓' : '▶'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-maroon font-medium group-hover:text-saffron transition-colors">{l.title}</p>
                          <p className="text-xs text-ink-soft truncate">{l.blurb}</p>
                        </div>
                        <span className="text-xs text-ink-soft/60 flex-shrink-0">{l.dur}</span>
                      </div>
                    );
                  })}
                  <p className="mt-3 text-xs text-ink bg-sand rounded-lg p-3"><span className="font-semibold text-maroon">Practice:</span> {s.practice}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="text-center mt-10">
          <button onClick={onOpen} className="btn btn-primary">Start with the free Life Compass</button>
        </div>
      )}
    </section>
  );
};

const SafetyNote = () => (
  <section className="max-w-4xl mx-auto px-6 pb-16">
    <div className="card border-l-4 border-saffron p-5 text-sm text-ink-soft">
      <p className="font-semibold text-maroon mb-1">A gentle, important note</p>
      This program supports personal growth and is <span className="font-medium">not a substitute for professional medical or
      mental-health care</span>. If you are struggling severely or in crisis, please reach out to a professional or a helpline —
      in India: <span className="text-maroon">KIRAN 1800-599-0019</span> (24/7) or <span className="text-maroon">iCall 9152987821</span>.
      You deserve support. 🙏
    </div>
  </section>
);

export default Reawaken;
