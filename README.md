# Lecture quizzes

One web app for several courses. The app (`index.html`) stays the same; each course is a separate question file in `courses/`, and `courses/courses.js` says which courses are switched on.

* **Practice** – students pick a course, lectures and difficulty, answer, get feedback and explanations. Progress stays in their browser.
* **Live** – the presenter view shows a QR code; students answer on their phones; you reveal the solution and the class result.
* **Statistics** – anonymous totals per course and per question (`…/?course=<id>#stats`).
* **Check** – `…/#check` validates and previews a course file before you upload it.

Web address (after setup): `https://btowbin.github.io/lecture-quiz/`

| Link | What it opens |
| --- | --- |
| `…/lecture-quiz/` | Course picker (or the course directly if only one is active) |
| `…/lecture-quiz/?course=sysbio` | One course's start page — give this link to the students of that course |
| `…/lecture-quiz/?course=sysbio#host` | Presenter view for that course (put it on the projector) |
| `…/lecture-quiz/?course=sysbio#stats` | Practice statistics of that course |
| `…/lecture-quiz/#check` | Check a course file before uploading |

## Add or update a course (no programming tools needed)

1. **Write the file.** Copy `courses/example.js` (it explains every field), rename it (e.g. `ecology.js`), change the id in `QUIZ.course('ecology', …)` and fill in title, lectures and questions. The first option of every question is the correct one.
2. **Check it.** Open `…/lecture-quiz/#check` and drop the file there. It lists problems (missing correct answer, LaTeX errors, broken formulas, duplicate ids) and shows every question as students will see it. Nothing is uploaded.
3. **Upload it.** On GitHub: open the repository → folder `courses` → *Add file → Upload files* → drop the file → *Commit changes*. Uploading a file with the same name replaces the old version.
4. **Activate it.** In `courses/courses.js` (pencil icon on GitHub) add a line, then *Commit changes*:
   ```js
   { id: 'ecology', file: 'ecology.js', active: true },
   ```
   `active: false` hides a course without deleting it.

Changes are live about 1–2 minutes after the commit (students may need to reload).

Question types: single choice (default), true/false sets (`type:'tf'`) and short answers with self-assessment (`type:'short'`) — the last two are practice-only. Figures can be drawn from formulas, circuit diagrams, or images (`fig:{img:'<course-id>/file.jpg'}` with the file in `courses/<course-id>/`; `expfig` = shown after answering). A course with `lang:'de'` gets German buttons and labels.

Rules that keep questions good: every question must make sense on its own (they are shuffled); ids never change once students have used them; write `\lt` / `\gt` instead of `<` / `>` inside formulas.

## Lecturer password

A small **Lecturer** link at the bottom of the start pages asks for the password and opens a menu with the presenter view and statistics of every course and the course checker (the direct links `…#host`, `…#stats`, `…#check`, `…#lecturer` ask for it too). The login is remembered per browser; *Log out* is in the menu. It is a light barrier, not real security: the page is public and the password hash is readable in the code. Change it with `node dev/set-password.js "<new password>"` (then commit and push `index.html` and `dev/app.html`); an empty password `""` switches it off.

## Instant polls

*Lecturer → Instant poll* (or `…/#poll`) lets you ask a question on the spot, independent of any course. Create a **class** once (e.g. "Systems Biology Mon"): it gets its own permanent room code and QR code, kept in your browser, so students can come back to the same room every week and just see the next question without scanning again. Three types: **Choice** (type the answers, or leave them empty so students simply vote A, B, C… — 2 to 8 answers), **Number** (students type a number; the reveal shows a histogram with mean and median) and **Word / phrase** (the reveal shows a word cloud; "Gene" and "gene" count as one). Students can change their answer until you reveal. For **Choice** questions you can mark the correct answer (click ✓ next to it, or put `*` before it in *Add several…*): the reveal then has two steps — Space shows the answers/distribution, Space again shows the correct answer (students get ✓ / ✗ feedback). **Prepared questions:** write them before the lecture (*Add several…* — one per line, `Question | answer | answer`, `#num …`, `#word …` — or *☆ Save for later* in the compose form), then start any of them with one click, via *Prepared* (P) during a poll, or *Next: …* (Space) after a reveal. Prepared questions belong to a **class** and are organised by **lecture** (folders): add a lecture with *+ Lecture*, or put `## Lecture 3` on its own line in *Add several…* to start a lecture; *Copy* brings the lectures of another class into this one. *Next: …* stays within the lecture. Everything is kept in the presenter's browser. Keys: Space = reveal / next, N = new poll, Q = QR code, F = fullscreen. *Download all results (CSV)* is in the compose screen. The student page can be English or German (EN/DE switch per class). Poll results are stored only in the browser of the presenter computer.

## Prepared lectures

*Lecturer → Prepare lecture* (or `…/#lecture`) builds a whole lecture in advance: an ordered list of **polls** (choice, number, word cloud, optionally with a correct answer) and **quiz questions** of a course, presented one after another in **one room**. A lecture has its own permanent room code and QR code (kept in your browser), so students scan once and stay in the room while the lecture switches between polls and quiz questions; the phones show whichever comes next.

1. **Create** a lecture (name, course the quiz questions come from, language of the poll pages). The QR code is shown right away; students who scan it early see a waiting screen.
2. **Fill the list.** *Add poll* (form; ✓ marks a correct answer), *Add several polls…* (same one-per-line syntax as the Instant poll: `Question | answer | *correct`, `#num …`, `#word …`) and *Add quiz questions…* (click questions of the course; click again to remove; filter by lecture and difficulty). Reorder with ↑ ↓, *Edit* polls in place, ✕ removes an item.
3. **Present.** *Start lecture ▶* (or ▶ on any item to start there). **Space / →** steps through *question → reveal → (solution, polls with a correct answer) → next item*; `←` goes back, `R` reveals, `E` shows the explanation of a quiz question, `P` pauses (phones show the waiting screen, Space resumes where you were), `L` lists the items (jump to any), `Q` QR code, `F` fullscreen. *← Edit* returns to the editor without closing the room. After the last item an end-of-lecture dialog offers the results.
4. **Results & backup.** *Results (CSV)* has every answer of every item; *Clear answers* empties them before the next run; *Download JSON* saves the lecture (list, room code, course) and *Load from file (JSON)* on the lecture list restores it, e.g. on another laptop (the room code is kept if it is free).

Everything is stored in the presenter's browser (`lq.lectures`, `lq.lecture.<id>`); the JSON file is the backup. The existing live quiz presenter and Instant poll are unchanged. Quiz items need the lecture's course to be active; true/false and short-answer questions are practice-only and cannot be added.

## Running a live session

1. Open `…/?course=<id>#host` on the lecture computer. A QR code and a room code appear; the room code is remembered, so the QR code can stay on your slides.
2. **Choose questions…** – lectures, difficulty, random or hand-picked, how many, order (and the course, if several are active).
3. Students scan the code; **Space** reveals the answer and the class result, **Space** again goes on. Keys: `←` back, `E` explanation, `L` question list (+ CSV download), `Q` QR code, `F` fullscreen.
4. **End session ■** returns to the start page. Collected answers are kept per course until *Clear collected answers* (question list).

Live messages travel through two free public MQTT brokers (HiveMQ, EMQX): no account, no credits. The presenter status line says *Room online* when they are reachable. Students are anonymous; answers are kept only in the presenter's browser.

## For app changes (Claude / developers)

The app source is `dev/app.html` (+ `dev/poll.js` for instant polls, `dev/lecture.js` for prepared lectures); `node dev/build.js` stamps the version and writes `index.html`. Tests: `cd dev && npm install && npx playwright install chromium && node test.js && node test-multi.js && node test-lecture.js` (`test.js` covers practice through all Systems Biology questions + live mode with 7 students on local brokers; `test-multi.js` covers course picker, per-course storage, live course switching and the check page; `test-lecture.js` covers prepared lectures: editor, JSON export/import, and a mixed poll/quiz run with two phones). Settings at the top of the script: `TITLE`, `COURSE_DIR`, `BROKERS`, `TOPIC_PREFIX`, `STATS_URL`, `STATS_NS`. Helpers available in course files: `r` (raw text), `ffl()` (feed-forward-loop diagram), `table()`.
