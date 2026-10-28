/* =====================================================================
   COURSE: Dummy example 101 (id 'dummy101')
   A small placeholder course to see how the site looks with several courses.
   Switch it off in courses.js (active: false) or delete it when no longer needed.
   ===================================================================== */
QUIZ.course('dummy101', ({ r, ffl }) => ({

  title: 'Dummy example 101',
  description: 'A small placeholder course with a few easy questions — just to show how the site works with several courses.',
  unit: 'Lecture',

  lectures: {
    1: 'Numbers',
    2: 'Graphs and circuits',
  },

  questions: [

    { id: 'D1-01', lec: 1, diff: 1, topic: 'Addition',
      q: r`What is $3+4$?`,
      opts: [r`7`, r`6`, r`8`, r`12`],
      exp: r`$3+4=7$.` },

    { id: 'D1-02', lec: 1, diff: 2, topic: 'Doubling',
      q: r`A culture doubles every hour. Starting from 100 cells, how many cells are there after 3 hours?`,
      opts: [r`800`, r`300`, r`600`, r`400`],
      exp: r`$100\cdot2^3=800$.` },

    { id: 'D1-03', lec: 1, diff: 3, topic: 'Half-life',
      q: r`A protein has a half-life of 2 h. What fraction is left after 6 h without new production?`,
      opts: [r`1/8`, r`1/3`, r`1/6`, r`1/4`],
      exp: r`6 h are three half-lives: $(1/2)^3=1/8$.` },

    { id: 'D2-01', lec: 2, diff: 1, topic: 'Reading a graph',
      q: r`The graph shows $y=x^2$. What is $y$ at $x=2$?`,
      fig: { x: [0, 3], y: [0, 9.5], xl: 'x', yl: 'y', ticks: true,
             curves: [ { fn: 'x**2', c: 'b', lab: 'y = x²', labx: 2.5, laby: 0.9 } ],
             pts: [ { x: 2, y: 4, fill: 'n' } ] },
      opts: [r`4`, r`2`, r`8`, r`6`],
      exp: r`$2^2=4$.` },

    { id: 'D2-02', lec: 2, diff: 2, topic: 'Circuit diagram',
      q: r`In the circuit shown, which gene represses Z?`,
      fig: ffl('-', ''),
      opts: [r`Y`, r`X`, r`Both X and Y`, r`None`],
      exp: r`The bar ⊣ from Y to Z means repression; X activates Z.` },
  ]
}));
