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

## Running a live session

1. Open `…/?course=<id>#host` on the lecture computer. A QR code and a room code appear; the room code is remembered, so the QR code can stay on your slides.
2. **Choose questions…** – lectures, difficulty, random or hand-picked, how many, order (and the course, if several are active).
3. Students scan the code; **Space** reveals the answer and the class result, **Space** again goes on. Keys: `←` back, `E` explanation, `L` question list (+ CSV download), `Q` QR code, `F` fullscreen.
4. **End session ■** returns to the start page. Collected answers are kept per course until *Clear collected answers* (question list).

Live messages travel through two free public MQTT brokers (HiveMQ, EMQX): no account, no credits. The presenter status line says *Room online* when they are reachable. Students are anonymous; answers are kept only in the presenter's browser.

## For app changes (Claude / developers)

The app source is `dev/app.html`; `node dev/build.js` stamps the version and writes `index.html`. Tests: `cd dev && npm install && npx playwright install chromium && node test.js && node test-multi.js` (`test.js` covers practice through all Systems Biology questions + live mode with 7 students on local brokers; `test-multi.js` covers course picker, per-course storage, live course switching and the check page). Settings at the top of the script: `TITLE`, `COURSE_DIR`, `BROKERS`, `TOPIC_PREFIX`, `STATS_URL`, `STATS_NS`. Helpers available in course files: `r` (raw text), `ffl()` (feed-forward-loop diagram), `table()`.
