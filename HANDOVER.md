# Lecture-quiz handover — one app for all lecture quizzes

As of 2026-10-28. The full handover with diagram is the Claude doc "Lecture-quiz handover"; this file carries the same essentials for any Claude session that opens this folder.

## Where things stand
- Multi-course app, built and tested with **Systems Biology** (`sysbio`, 79 questions) as first active course; `example` is an annotated template (switched off). App version `2026-10-27 20:28`.
- Folder: `C:\Users\towbi\OneDrive - Universitaet Bern\teaching\lecture-quiz_Claude` · repository `btowbin/lecture-quiz` · site `https://btowbin.github.io/lecture-quiz/`.
- Links: `…/?course=<id>` (students) · `…/?course=<id>#host` (presenter) · `…/?course=<id>#stats` (statistics) · `…/#check` (check a course file).
- Predecessor `btowbin/sysbio-quiz` (single-course app in `SysBioClaude\quiz-app`) is still online and independent; retire it once slides point to the new links.

| Path | Role |
| --- | --- |
| `index.html` | The app — generated from `dev/app.html` by `node dev/build.js`; never edit for content |
| `courses/courses.js` | List of courses with `active: true/false` |
| `courses/<id>.js` | One course: title, lectures, questions |
| `courses/example.js` | Annotated template showing every feature |
| `README.md` | User guide (adding courses, live sessions) |
| `dev/` | App source, version stamp, Playwright tests (`test.js`, `test-multi.js`) |

## How it fits together
GitHub Pages serves the files. At start the app reads `courses/courses.js` and loads each active course file. Live-quiz messages go through two public MQTT brokers (HiveMQ :8884, EMQX :8084; presenter uses both, each phone the first that answers); the room carries its course, so students scanning the QR code need not choose. Practice totals go to the Abacus counting service. No own server, no accounts, no credits.

## Integrating another lecture's quiz
1. **Get questions into `courses/<id>.js`.**
   - Old-style `questions.js` (`QUESTIONS`/`LECTURES`): wrap in `QUIZ.course('<id>', () => { …; return {title, lectures: LECTURES, questions: QUESTIONS}; });` (that is how `sysbio.js` was made). Non-numbered lecture: `{name:'…', plain:true}`.
   - Document / Moodle / Form / spreadsheet: map each question to the fields; ask the lecturer about anything ambiguous.
   - Only lecture material: write 10–15 exam-style questions per lecture.
2. **Quality rules:** correct option first; every question self-contained (no "as before" — they are shuffled); `diff` 1–3 on each; figures/diagrams where they explain a setting but never give the answer away; label curves instead of naming colours; ids permanent.
3. **Check** at `…/#check` (drop the file; lists problems, previews every question) until "No problems found". Also screenshot every figure in light and dark mode.
4. **Upload** to `courses/` (GitHub web *Add file → Upload files*, or git).
5. **Activate:** add `{ id: '<id>', file: '<id>.js', active: true }` to `courses/courses.js` (`false` = staged, hidden).
6. **Rehearse:** practise a few questions at `…/?course=<id>`; run `…/?course=<id>#host` and join from a phone.

Course ids are short and permanent (`sysbio`, `ecology`); they key links, progress, live answers and statistics. Question ids need only be unique within the course.

## Course file reference
```javascript
QUIZ.course('ecology', ({ r, ffl, table }) => ({
  title: 'Ecology',
  description: 'Exam-style questions on the Ecology lectures.',   // optional
  unit: 'Lecture',                                                // "Lecture 1 · …", or 'Week', 'Session'
  lectures: { 1: 'Populations', 2: 'Competition', 9: { name: 'Exam practice', plain: true } },
  questions: [
    { id: 'E1-01', lec: 1, diff: 2, topic: 'Logistic growth',
      q: r`A population grows as $\dot N = rN(1-N/K)$. At which $N$ is growth fastest?`,
      opts: [r`$K/2$`, r`$K$`, r`$0$`, r`$2K$`],                  // FIRST = correct
      exp: r`$rN(1-N/K)$ is maximal at $N=K/2$.`,
      src: 'Exam 2025 · Q2',                                      // optional
      fig: { x:[0,10], y:[0,1.1], xl:'N', yl:'growth', curves:[{ fn:'x*(1-x/10)/2.5', c:'a' }] } },
  ]
}));
```
- Fields: `id` (letters, digits, `-`, `_`, max 24) · `lec` (key of `lectures`) · `diff` 1 easy/recall, 2 medium/apply or short calculation, 3 hard/multi-step · `q`, `opts` (2–8), `exp` in r`…`, LaTeX `$…$`, `\lt` `\gt` instead of `<` `>` · `fixed:true, ans:i` keeps own order · `fig` one figure or a list.
- Graph: `{x:[a,b], y:[a,b], xl, yl, ticks:true, curves:[{fn:'<y(x)>'|fx:'<x(y)>', c:'a|b|c|d|ink', dash, lab, labx, laby}], pts:[{x,y,lab,fill:'n'|true}], hlines, vlines, xticks:[[v,'label']], yticks}` (JavaScript syntax: `x**2`, `exp(-x)`).
- Diagram: `{net:true, w:440, h:150, nodes:{X:[x,y], D:{x,y,kind:'sink'}}, edges:[{a:'X', b:'Y', t:'+'|'-'|'f', bend, loop:'up'}], texts:[{x,y,t,b,c}]}`; `a===b` = self-loop, `b:'@2'` = middle of edge 2.
- Helpers: `r` · `ffl('-', 'AND', ['X','Y','Z'])` feed-forward loop · `table(['', 'col'], [['row','value']])`. Course-specific helpers go inside the course function.

## Changing the app itself
Only in `dev/app.html`; then `cd dev; npm install; npx playwright install chromium` (once), `node build.js`, `node test.js; node test-multi.js` (both must print ALL CHECKS PASSED), push.
- SETTINGS: `TITLE`, `COURSE_DIR`, `BROKERS`, `TOPIC_PREFIX` (`lecture-quiz/v1/`), `STATS_URL`, `STATS_NS` (`lq-towbinlab-unibe`).
- COURSES section: `QUIZ.courses`/`QUIZ.course`, `normCourse`, `lintCourse` (checks behind `#check`), `useCourse(id)`.
- Browser storage: per course `lq.<id>.prefs|progress|host|stats`; global `lq.sid`, `lq.theme`, `lq.lastcourse`.
- MQTT topics: `lecture-quiz/v1/<ROOM>/state` (retained; carries `course`, `ver`), `/host`, `/p`, `/a`, `/s/<student>`.
- Statistics keys: `visits`, `sessions.<course>`, `q.<course>.<qid>.n|.ok` (Abacus ~30 requests/10 s; keys expire after 6 months unused).
- `test.js` uses Systems Biology ids (`L2-01`, `L2-05`, `L2-12`); `test-multi.js` serves two active courses and tests picker, per-course storage, live course switching, statistics and the check page.

- **Lecturer password:** `#host`, `#stats`, `#check` need it (`LECTURER_HASH` in `dev/app.html`; change with `node dev/set-password.js "<pw>"`; tests disable it via `window.SBQ_LECT_HASH=''`). Client-side only — a light barrier.

## Pitfalls
- Change not visible → push did not run, Pages still deploying, or cache: `git status` "up to date with origin", Actions tab green, private window.
- Course missing → `active:false`, id mismatch between `courses.js` and `QUIZ.course(...)`, or a JS error (see `#check`).
- `<` inside `$…$` breaks rendering → `\lt`. `-(x-1)**2` is invalid JS → `1-(x-1)**2`.
- Reused question shows old live answers → *Clear collected answers* in the question list.
- Students stuck at "Step 1" → network blocks both brokers; mobile data, or add a port-443 broker to `BROKERS`.
- Claude's first write to the linked computer occasionally doesn't land → verify (version stamp / `git status`) and write again. Claude cannot push; it gives git commands.

## Open items
- First live run of `lecture-quiz` on the lecture-hall network.
- Move Systems Biology links/slides to `…/?course=sysbio`; archive `sysbio-quiz`.
- Session history (End session archives answers per session).
- Re-check difficulty ratings against `#stats` once data exists.
- Optional CSV import; optional own MQTT broker on port 443; rotate unused Metered credentials.
