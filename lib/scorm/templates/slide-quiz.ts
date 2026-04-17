import type { SCORMBuilderData, SCORMSlide, SCORMQuizQuestion } from '../types';

/**
 * Generate the CSS for the SCORM player.
 */
export function generateStyleCss(accent: string): string {
  return `
:root { --accent: ${accent}; --accent-light: ${accent}22; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1a1a2e; }
body { display: flex; flex-direction: column; }

/* ─── Top bar ───────────────────────────────────────────── */
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: #111827; color: #fff; font-size: 14px; flex-shrink: 0; }
.topbar .title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topbar .counter { font-size: 12px; opacity: 0.7; }

/* ─── Progress bar ──────────────────────────────────────── */
.progress-wrap { height: 4px; background: #e5e7eb; flex-shrink: 0; }
.progress-bar { height: 100%; background: var(--accent); transition: width 0.3s ease; }

/* ─── Slide area ────────────────────────────────────────── */
.slide-area { flex: 1; overflow-y: auto; padding: 32px 24px; max-width: 900px; margin: 0 auto; width: 100%; }
.slide-area h1, .slide-area h2, .slide-area h3 { margin-bottom: 12px; }
.slide-area p { line-height: 1.7; margin-bottom: 12px; }
.slide-area img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
.slide-area ul, .slide-area ol { margin-left: 24px; margin-bottom: 12px; }
.slide-area li { margin-bottom: 4px; line-height: 1.6; }

/* ─── Quiz block ────────────────────────────────────────── */
.quiz-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-top: 24px; }
.quiz-block .prompt { font-weight: 600; margin-bottom: 16px; font-size: 15px; }
.quiz-block .option { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 8px; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-size: 14px; }
.quiz-block .option:hover { background: var(--accent-light); border-color: var(--accent); }
.quiz-block .option.selected { background: var(--accent-light); border-color: var(--accent); font-weight: 500; }
.quiz-block .option.correct { background: #d1fae5; border-color: #10b981; }
.quiz-block .option.incorrect { background: #fee2e2; border-color: #ef4444; }
.quiz-block .option input[type="radio"] { accent-color: var(--accent); }
.quiz-block .fill-input { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
.quiz-block .feedback { margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
.quiz-block .feedback.correct { background: #d1fae5; color: #065f46; }
.quiz-block .feedback.incorrect { background: #fee2e2; color: #991b1b; }

/* ─── Summary / results ────────────────────────────────── */
.summary { text-align: center; padding: 48px 24px; }
.summary .score-circle { display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 50%; font-size: 32px; font-weight: 700; margin-bottom: 16px; }
.summary .score-circle.passed { background: #d1fae5; color: #065f46; }
.summary .score-circle.failed { background: #fee2e2; color: #991b1b; }
.summary h2 { margin-bottom: 8px; }
.summary p { color: #6b7280; }

/* ─── Navigation ────────────────────────────────────────── */
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; flex-shrink: 0; }
.nav-btn { padding: 8px 20px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; font-size: 14px; cursor: pointer; transition: all 0.15s; }
.nav-btn:hover { background: #f3f4f6; }
.nav-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.nav-btn.primary:hover { opacity: 0.9; }
.nav-btn:disabled { opacity: 0.4; cursor: default; }
`;
}

/**
 * Render a quiz question as HTML.
 */
function renderQuizHtml(q: SCORMQuizQuestion, idx: number): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let body = '';
  if (q.type === 'mcq' && q.options) {
    body = q.options
      .map(
        (o) =>
          `<div class="option" data-qid="${q.id}" data-val="${esc(o.id)}" data-correct="${o.correct}" onclick="selectOption(this)">
            <input type="radio" name="q-${q.id}" /> ${esc(o.text)}
          </div>`
      )
      .join('\n');
  } else if (q.type === 'true_false') {
    body = ['True', 'False']
      .map(
        (v) =>
          `<div class="option" data-qid="${q.id}" data-val="${v.toLowerCase()}" data-correct="${v.toLowerCase() === q.answer}" onclick="selectOption(this)">
            <input type="radio" name="q-${q.id}" /> ${v}
          </div>`
      )
      .join('\n');
  } else if (q.type === 'fill_blank') {
    body = `<input type="text" class="fill-input" data-qid="${q.id}" data-answer="${esc(q.answer || '')}" placeholder="Type your answer..." onkeyup="fillAnswer(this)" />`;
  }

  return `
<div class="quiz-block" id="quiz-${q.id}">
  <div class="prompt">${idx + 1}. ${esc(q.prompt)}</div>
  ${body}
  <div class="feedback" id="fb-${q.id}" style="display:none"></div>
</div>`;
}

/**
 * Generate the main index.html content for a slide+quiz SCORM package.
 */
export function generateIndexHtml(data: SCORMBuilderData): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Build slide content objects for the JS runtime
  const allSlides: { title: string; html: string; quizId: string | null }[] = data.slides.map((s) => ({
    title: s.title,
    html: s.html + (s.quiz ? renderQuizHtml(s.quiz, 0) : ''),
    quizId: s.quiz?.id || null,
  }));

  // If there are standalone quiz questions, create a final "Quiz" slide
  if (data.quizQuestions.length > 0) {
    const quizHtml = data.quizQuestions.map((q, i) => renderQuizHtml(q, i)).join('\n');
    allSlides.push({
      title: 'Assessment',
      html: `<h2>Assessment</h2><p>Answer the following questions to complete this module.</p>${quizHtml}`,
      quizId: null,
    });
  }

  // Collect all quiz questions for scoring
  const allQuestions: SCORMQuizQuestion[] = [
    ...data.slides.filter((s) => s.quiz).map((s) => s.quiz!),
    ...data.quizQuestions,
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${esc(data.title)}</title>
  <link rel="stylesheet" href="style.css"/>
  <script src="scorm-api.js"><\/script>
</head>
<body>
  <div class="topbar">
    <span class="title">${esc(data.title)}</span>
    <span class="counter" id="counter"></span>
  </div>
  ${data.settings.showProgress ? '<div class="progress-wrap"><div class="progress-bar" id="progress" style="width:0%"></div></div>' : ''}
  <div class="slide-area" id="slide-area"></div>
  <div class="nav-bar">
    <button class="nav-btn" id="btn-prev" onclick="prevSlide()">&#8592; Previous</button>
    <button class="nav-btn primary" id="btn-next" onclick="nextSlide()">Next &#8594;</button>
  </div>

<script>
(function() {
  "use strict";

  var slides = ${JSON.stringify(allSlides)};
  var questions = ${JSON.stringify(allQuestions.map((q) => ({ id: q.id, type: q.type, answer: q.answer, points: q.points, options: q.options })))};
  var passingScore = ${data.settings.passingScore};
  var freeNav = ${data.settings.freeNavigation};
  var totalSlides = slides.length;
  var currentSlide = 0;
  var answers = {};  // qid → { value, correct }
  var furthestSlide = 0;
  var completed = false;

  // Restore position from suspend data
  SCORM.initialize();
  var saved = SCORM.getSuspendData();
  if (saved && typeof saved === "object") {
    currentSlide = saved.slide || 0;
    answers = saved.answers || {};
    furthestSlide = saved.furthest || 0;
    completed = saved.completed || false;
  }

  function render() {
    var slide = slides[currentSlide];
    document.getElementById("slide-area").innerHTML = slide.html;
    document.getElementById("counter").textContent = (currentSlide + 1) + " / " + totalSlides;

    // Progress
    var pct = totalSlides > 1 ? ((currentSlide) / (totalSlides - 1)) * 100 : 100;
    var bar = document.getElementById("progress");
    if (bar) bar.style.width = pct + "%";
    SCORM.setProgress(pct / 100);

    // Nav buttons
    document.getElementById("btn-prev").disabled = currentSlide === 0;
    var isLast = currentSlide === totalSlides - 1;
    var btn = document.getElementById("btn-next");
    btn.textContent = isLast ? (questions.length > 0 ? "Submit" : "Finish") : "Next →";
    btn.disabled = false;

    // Restore previously selected answers
    Object.keys(answers).forEach(function(qid) {
      var a = answers[qid];
      // MCQ / true-false
      var opts = document.querySelectorAll('[data-qid="' + qid + '"].option');
      opts.forEach(function(opt) {
        if (opt.getAttribute("data-val") === a.value) {
          opt.classList.add("selected");
          opt.querySelector("input[type=radio]").checked = true;
        }
      });
      // Fill blank
      var inp = document.querySelector('input.fill-input[data-qid="' + qid + '"]');
      if (inp) inp.value = a.value || "";
    });

    SCORM.setLocation(String(currentSlide));
    save();
  }

  function save() {
    SCORM.setSuspendData({ slide: currentSlide, answers: answers, furthest: furthestSlide, completed: completed });
    SCORM.commit();
  }

  // ─── Quiz interaction handlers (called from onclick/onkeyup in HTML) ───────

  window.selectOption = function(el) {
    var qid = el.getAttribute("data-qid");
    var val = el.getAttribute("data-val");
    var correct = el.getAttribute("data-correct") === "true";

    // Deselect siblings
    var siblings = document.querySelectorAll('[data-qid="' + qid + '"].option');
    siblings.forEach(function(s) { s.classList.remove("selected", "correct", "incorrect"); });

    el.classList.add("selected");
    el.querySelector("input[type=radio]").checked = true;
    answers[qid] = { value: val, correct: correct };

    // Show feedback
    showFeedback(qid, correct);
    save();
  };

  window.fillAnswer = function(el) {
    var qid = el.getAttribute("data-qid");
    var expected = el.getAttribute("data-answer").toLowerCase().trim();
    var val = el.value;
    var correct = val.toLowerCase().trim() === expected;
    answers[qid] = { value: val, correct: correct };
    save();
  };

  function showFeedback(qid, correct) {
    var fb = document.getElementById("fb-" + qid);
    if (!fb) return;
    var q = questions.find(function(x) { return x.id === qid; });
    var msg = correct ? "Correct!" : "Incorrect.";
    if (q) {
      // Find the question's feedback from the original data if embedded in the HTML
    }
    fb.style.display = "block";
    fb.className = "feedback " + (correct ? "correct" : "incorrect");
    fb.textContent = msg;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  window.nextSlide = function() {
    if (currentSlide === totalSlides - 1) {
      // Final slide — submit / finish
      finishCourse();
      return;
    }
    currentSlide++;
    if (currentSlide > furthestSlide) furthestSlide = currentSlide;
    render();
  };

  window.prevSlide = function() {
    if (currentSlide > 0) {
      currentSlide--;
      render();
    }
  };

  function finishCourse() {
    if (completed) return;
    completed = true;

    if (questions.length === 0) {
      // No quiz — just mark complete
      SCORM.setScore(100, 100, 0);
      SCORM.setCompleted(true);
      showSummary(100, true);
      return;
    }

    // Calculate score
    var totalPoints = 0;
    var earnedPoints = 0;
    questions.forEach(function(q) {
      totalPoints += q.points;
      var a = answers[q.id];
      if (a && a.correct) earnedPoints += q.points;
    });

    var pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    var passed = pct >= passingScore;

    SCORM.setScore(pct, 100, 0);
    SCORM.setProgress(1);
    SCORM.setCompleted(passed);
    save();

    showSummary(pct, passed);
  }

  function showSummary(pct, passed) {
    var area = document.getElementById("slide-area");
    area.innerHTML =
      '<div class="summary">' +
        '<div class="score-circle ' + (passed ? "passed" : "failed") + '">' + pct + '%</div>' +
        '<h2>' + (passed ? "Congratulations!" : "Not quite there") + '</h2>' +
        '<p>' + (passed ? "You have successfully completed this module." : "You did not reach the passing score of " + passingScore + "%. You may review and retry.") + '</p>' +
      '</div>';
    document.getElementById("counter").textContent = "Complete";
    var bar = document.getElementById("progress");
    if (bar) bar.style.width = "100%";
    document.getElementById("btn-next").disabled = true;
  }

  // ─── Cleanup on unload ─────────────────────────────────────────────────────
  window.addEventListener("beforeunload", function() {
    save();
    SCORM.terminate();
  });

  // ─── Boot ──────────────────────────────────────────────────────────────────
  render();
})();
<\/script>
</body>
</html>`;
}
