/* =====================================================================
   EXAMPLE COURSE — copy this file to start a new course.
   ---------------------------------------------------------------------
   1. Copy to e.g. ecology.js, change the id below ('example' -> 'ecology').
   2. Fill in title, lectures and questions.
   3. Check it at <site>/#check (drop the file there; nothing is uploaded).
   4. Upload it to the courses/ folder on GitHub and add a line to courses.js:
        { id: 'ecology', file: 'ecology.js', active: true },

   Question fields
     id      unique within the course, never change it later (progress, live answers and statistics use it)
     lec     number of the lecture (key in `lectures`)
     diff    1 = easy (recall) · 2 = medium (apply a concept / short calculation) · 3 = hard (multi-step)
     topic   short label shown above the question
     q       question text; $…$ = LaTeX inline, $$…$$ = displayed; simple HTML (<b>, <i>, <br>) allowed
     opts    answer options — THE FIRST ONE IS THE CORRECT ONE (the app shuffles them for display)
             use  fixed:true, ans:<index>  to keep your own order instead
     exp     explanation, shown after answering
     src     optional: where the question comes from ("Exam 2025 · Q3")
     fig     optional: a graph, a network diagram, an image {img:'<course-id>/file.jpg'} (file in courses/<course-id>/), or a list
     expfig  optional: figure(s) shown only after answering (e.g. a slide whose labels give the answer away)
   Other question types (practice mode only; live mode uses single-choice questions):
     type:'tf'     true/false set:  statements:[ {t:r`…`, ok:true, exp:r`why`}, {t:r`…`, ok:false}, … ]
                   scoring: +1 per right judgement, -1 per wrong one, 0 if blank (never below 0)
     type:'short'  short answer:    model:r`model answer`, criteria:[r`point 1`, r`point 2`]  (students tick what they covered)
   Course options: lang:'de' gives German buttons and labels; unit:'Vorlesung' names the lectures.
   Always write texts as r`…` (backticks) so that LaTeX backslashes work. Inside $…$ write \lt and \gt
   instead of < and >. Every question must make sense on its own (questions are shuffled).
   ===================================================================== */
QUIZ.course('example', ({ r, ffl, table }) => ({

  title: 'Example course',
  description: 'A short example showing every feature of the question format.',
  unit: 'Lecture',                 // word used in labels: "Lecture 1 · …" (e.g. 'Week', 'Session')

  lectures: {
    1: 'Getting started',
    2: 'Figures and diagrams',
    9: { name: 'Exam practice', plain: true },   // plain: shown without "Lecture 9 ·"
  },

  questions: [

    { id: 'E1-01', lec: 1, diff: 1, topic: 'Plain question',
      q: r`What is $2+2$?`,
      opts: [r`4`, r`3`, r`5`, r`22`],
      exp: r`$2+2=4$.` },

    { id: 'E1-02', lec: 1, diff: 2, topic: 'Formula and table',
      q: r`A protein is made at rate $\beta$ and removed at rate $\alpha$. Its steady state is` +
         table(['', 'β', 'α'], [['value', '6 µM/h', '2 /h']]),
      opts: [r`$3\ \mu$M`, r`$12\ \mu$M`, r`$8\ \mu$M`, r`$4\ \mu$M`],
      exp: r`$y_{st}=\beta/\alpha=6/2=3\ \mu$M.`,
      src: 'Example' },

    { id: 'E2-01', lec: 2, diff: 2, topic: 'Reading a graph',
      q: r`The graph shows $\dot x=f(x)$. Which fixpoint is stable?`,
      fig: { x: [0, 3], y: [-0.45, 1.4], xl: 'x', yl: 'dx/dt', ticks: true,
             curves: [ { fn: '(x-1)*(x-2)', c: 'a' } ],                       // fn = y as a function of x (JavaScript syntax, Math functions allowed)
             pts: [ { x: 1, y: 0, lab: 'x₁', fill: 'n' }, { x: 2, y: 0, lab: 'x₂', fill: 'n' } ] },
      opts: [r`$x_1$`, r`$x_2$`, r`both`, r`neither`],
      exp: r`Stable where $f$ crosses zero going down: $f'(x_1)\lt 0$.` },

    { id: 'E2-02', lec: 2, diff: 1, topic: 'Network diagram',
      q: r`In the circuit shown, how does Y act on Z?`,
      fig: ffl('-', ''),                                                          // standard feed-forward loop; ffl('+','AND') etc.
      opts: [r`It represses Z`, r`It activates Z`, r`It has no effect`, r`It degrades X`],
      exp: r`The flat bar ⊣ means repression.` },

    { id: 'E2-03', lec: 2, diff: 1, topic: 'Free diagram',
      q: r`Which gene regulates itself?`,
      fig: { net: true, w: 440, h: 150,                                          // pixel coordinates in a 440 x 150 box
             nodes: { A: [120, 95], B: [320, 95] },
             edges: [ { a: 'A', b: 'B', t: '+' },                                 // t: '+' activation, '-' repression, 'f' dashed removal arrow
                      { a: 'B', b: 'B', t: '-', loop: 'up' } ] },                 // a === b: self-loop
      opts: [r`B`, r`A`, r`both`, r`none`],
      exp: r`B has a self-loop (negative autoregulation).` },

    { id: 'E9-01', lec: 9, diff: 3, topic: 'Own order', fixed: true, ans: 2,
      q: r`Order of options is kept here; which is the largest?`,
      opts: [r`1`, r`2`, r`3`],
      exp: r`3.` },
  ]
}));
