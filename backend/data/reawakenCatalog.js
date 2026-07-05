// Source of truth for the Reawaken program's lesson IDs — the join key that
// links a lesson to its admin-uploaded video and to a user's progress.
// The frontend renders the rich version (blurbs, practices, Sanskrit); here we
// keep just what the backend needs: stage + lesson titles for the admin video
// manager, and the set of valid IDs for validation.
const STAGES = [
  {
    key: 'awaken', title: 'Awaken',
    lessons: [
      { id: 'a1', title: 'You are not broken, you are buried', dur: '8 min' },
      { id: 'a2', title: 'The honest inventory', dur: '11 min' },
      { id: 'a3', title: 'Choosing to come back', dur: '7 min' }
    ]
  },
  {
    key: 'reset', title: 'Reset the Days',
    lessons: [
      { id: 'r1', title: 'Why structure heals', dur: '9 min' },
      { id: 'r2', title: 'The anchor morning', dur: '12 min' },
      { id: 'r3', title: 'Sleep as medicine', dur: '10 min' },
      { id: 'r4', title: 'The power of tiny wins', dur: '8 min' }
    ]
  },
  {
    key: 'restore', title: 'Restore the Body',
    lessons: [
      { id: 'b1', title: 'The body leads the mind', dur: '9 min' },
      { id: 'b2', title: 'Breath: your reset button', dur: '11 min' },
      { id: 'b3', title: 'Eating to feel alive', dur: '10 min' }
    ]
  },
  {
    key: 'still', title: 'Still the Mind',
    lessons: [
      { id: 'm1', title: 'You are not your thoughts', dur: '10 min' },
      { id: 'm2', title: 'Meeting anxiety', dur: '12 min' },
      { id: 'm3', title: 'The practice of stillness', dur: '14 min' }
    ]
  },
  {
    key: 'release', title: 'Release the Past',
    lessons: [
      { id: 'p1', title: 'Carrying what was never yours', dur: '11 min' },
      { id: 'p2', title: 'Forgiveness (including yourself)', dur: '13 min' },
      { id: 'p3', title: 'Rebuilding self-worth', dur: '10 min' }
    ]
  },
  {
    key: 'reconnect', title: 'Reconnect',
    lessons: [
      { id: 'c1', title: 'Why we withdraw', dur: '9 min' },
      { id: 'c2', title: 'Repairing what frayed', dur: '12 min' },
      { id: 'c3', title: 'Building your circle', dur: '10 min' }
    ]
  },
  {
    key: 'purpose', title: 'Rediscover Purpose',
    lessons: [
      { id: 'd1', title: 'The question of "why"', dur: '11 min' },
      { id: 'd2', title: 'Your values, your compass', dur: '12 min' },
      { id: 'd3', title: 'Goals that pull you forward', dur: '10 min' }
    ]
  },
  {
    key: 'rise', title: 'Rise & Sustain',
    lessons: [
      { id: 'u1', title: 'Making it stick', dur: '10 min' },
      { id: 'u2', title: 'Stability & foundations', dur: '12 min' },
      { id: 'u3', title: 'The life you are building', dur: '9 min' }
    ]
  }
];

const LESSON_IDS = new Set(STAGES.flatMap((s) => s.lessons.map((l) => l.id)));

module.exports = { STAGES, LESSON_IDS };
