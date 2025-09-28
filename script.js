// Quiz engine logic
// Globals and settings
const DEFAULT_BASE_POINTS = 100;
const DEFAULT_TIME_BONUS_MAX = 50;
const STREAK_BONUS_PER = 20; // each consecutive correct adds this
const STORAGE_KEY_LEADERBOARD = 'bf007_leaderboard_v1';
const STORAGE_KEY_BADGES = 'bf007_badges_v1';

// UI elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const rulesScreen = document.getElementById('rules-screen');

const btnStart = document.getElementById('btn-start');
const btnRules = document.getElementById('btn-rules');
const btnRulesClose = document.getElementById('btn-rules-close');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const btnLeaderboardClose = document.getElementById('btn-leaderboard-close');
const btnSettings = document.getElementById('btn-settings');

const selectTimer = document.getElementById('select-timer');
const selectTotal = document.getElementById('select-total-questions');

const metaCurrent = document.getElementById('meta-current');
const metaTotal = document.getElementById('meta-total');
const metaScore = document.getElementById('meta-score');
const metaStreak = document.getElementById('meta-streak');
const timerRemaining = document.getElementById('timer-remaining');
const progressBar = document.getElementById('progress-bar');

const qText = document.getElementById('question-text');
const optionsEl = document.getElementById('options');
const feedbackEl = document.getElementById('feedback');
const btnNext = document.getElementById('btn-next');
const btnQuit = document.getElementById('btn-quit');

const resultScore = document.getElementById('result-score');
const resultCorrect = document.getElementById('result-correct');
const resultWrong = document.getElementById('result-wrong');
const resultTime = document.getElementById('result-time');
const resultBase = document.getElementById('result-base');
const resultTimeBonus = document.getElementById('result-timebonus');
const resultStreakBonus = document.getElementById('result-streakbonus');
const badgesEl = document.getElementById('badges');
const playerNameInput = document.getElementById('player-name');
const btnSaveScore = document.getElementById('btn-save-score');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnHome = document.getElementById('btn-home');

const leaderboardList = document.getElementById('leaderboard-list');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnClearLeaderboard = document.getElementById('btn-clear-leaderboard');

let settings = {
  timePerQuestion: parseInt(selectTimer.value,10),
  totalQuestions: parseInt(selectTotal.value,10)
};

// quiz runtime state
let pool = [];
let currentIndex = 0;
let currentQuestion = null;
let score = 0;
let streak = 0;
let correctCount = 0;
let wrongCount = 0;
let basePointsTotal = 0;
let timeBonusTotal = 0;
let streakBonusTotal = 0;
let perQuestionStartTime = 0;
let totalTimeSpent = 0;

let timer = null;
let remaining = 0;

function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function startGame(){
  settings.timePerQuestion = parseInt(selectTimer.value,10);
  settings.totalQuestions = parseInt(selectTotal.value,10);

  // prepare pool by shuffling global QUESTIONS
  pool = shuffleArray([...QUESTIONS]).slice(0, settings.totalQuestions);
  currentIndex = 0;
  score = 0; streak = 0; correctCount = 0; wrongCount = 0;
  basePointsTotal = 0; timeBonusTotal = 0; streakBonusTotal = 0; totalTimeSpent = 0;

  // UI
  metaTotal.textContent = settings.totalQuestions;
  metaScore.textContent = score;
  metaStreak.textContent = streak;
  startScreen.classList.add('hidden');
  leaderboardScreen.classList.add('hidden');
  rulesScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  quizScreen.classList.remove('hidden');

  nextQuestion();
}

function endGame(){
  // stop timer
  clearInterval(timer);

  // fill result UI
  resultScore.textContent = score;
  resultCorrect.textContent = correctCount;
  resultWrong.textContent = wrongCount;
  resultTime.textContent = totalTimeSpent + 's';
  resultBase.textContent = basePointsTotal;
  resultTimeBonus.textContent = timeBonusTotal;
  resultStreakBonus.textContent = streakBonusTotal;

  // badges
  renderBadges(checkAndUnlockBadges());

  // show result
  quizScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
}

function nextQuestion(){
  clearInterval(timer);
  feedbackEl.textContent = '';
  btnNext.disabled = true;

  if(currentIndex >= pool.length){
    endGame();
    return;
  }

  currentQuestion = pool[currentIndex];
  metaCurrent.textContent = currentIndex+1;
  qText.textContent = currentQuestion.question;

  // render options
  optionsEl.innerHTML = '';
  currentQuestion.options.forEach((opt, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.setAttribute('data-idx', idx);
    btn.innerHTML = `<span class="opt-label">${String.fromCharCode(65+idx)}</span><div class="opt-text">${opt}</div>`;
    btn.addEventListener('click', ()=> selectOption(idx, btn));
    optionsEl.appendChild(btn);
  });

  // timer init
  remaining = settings.timePerQuestion;
  timerRemaining.textContent = remaining;
  progressBar.style.width = '100%';
  perQuestionStartTime = Math.floor(Date.now()/1000);

  timer = setInterval(()=>{
    remaining--;
    timerRemaining.textContent = Math.max(0, remaining);
    const pct = (remaining/settings.timePerQuestion)*100;
    progressBar.style.width = pct + '%';
    if(remaining <= 0){
      clearInterval(timer);
      onTimeOut();
    }
  }, 1000);
}

function disableOptions(){
  const optionButtons = optionsEl.querySelectorAll('.option');
  optionButtons.forEach(b=> b.classList.add('disabled'));
}

function selectOption(selectedIdx, btnEl){
  clearInterval(timer);
  const correctIdx = currentQuestion.answer;
  const timeTaken = Math.floor(Date.now()/1000) - perQuestionStartTime;
  totalTimeSpent += timeTaken;

  // disable further choices
  disableOptions();

  // show feedback and compute scoring
  if(selectedIdx === correctIdx){
    // correct
    correctCount++;
    streak++;
    const base = DEFAULT_BASE_POINTS;
    basePointsTotal += base;
    // time bonus proportional
    const timeBonus = Math.max(0, Math.floor(((settings.timePerQuestion - timeTaken)/settings.timePerQuestion) * DEFAULT_TIME_BONUS_MAX));
    timeBonusTotal += timeBonus;
    // streak bonus
    const streakBonus = (streak > 1) ? ((streak-1) * STREAK_BONUS_PER) : 0;
    streakBonusTotal += streakBonus;
    const totalGain = base + timeBonus + streakBonus;
    score += totalGain;

    // UI highlight
    btnEl.classList.add('correct');
    // highlight correct option (in case same)
    const allBtns = optionsEl.querySelectorAll('.option');
    allBtns[correctIdx].classList.add('correct');

    feedbackEl.innerHTML = `✅ সঠিক! +${base} বেস + ${timeBonus} টাইম বোনাস + ${streakBonus} স্ট্রিক = <strong>+${totalGain}</strong>`;
  } else {
    // wrong
    wrongCount++;
    // reset streak
    streak = 0;
    // show correct and wrong
    const allBtns = optionsEl.querySelectorAll('.option');
    allBtns[selectedIdx].classList.add('wrong');
    allBtns[currentQuestion.answer].classList.add('correct');

    feedbackEl.innerHTML = `❌ ভুল! সঠিক উত্তর: <strong>${currentQuestion.options[currentQuestion.answer]}</strong>`;
  }

  // update UI
  metaScore.textContent = score;
  metaStreak.textContent = streak;

  // enable next
  btnNext.disabled = false;
}

function onTimeOut(){
  // time up: treat as wrong and move on after brief pause
  disableOptions();
  const allBtns = optionsEl.querySelectorAll('.option');
  allBtns[currentQuestion.answer].classList.add('correct');
  feedbackEl.innerHTML = `⏱️ সময় শেষ! সঠিক উত্তর: <strong>${currentQuestion.options[currentQuestion.answer]}</strong>`;
  wrongCount++;
  streak = 0;
  metaStreak.textContent = streak;
  btnNext.disabled = false;
}

// next button moves pointer
btnNext.addEventListener('click', ()=>{
  currentIndex++;
  nextQuestion();
});

// quit button goes home
btnQuit.addEventListener('click', ()=>{
  clearInterval(timer);
  quizScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

// start
btnStart.addEventListener('click', startGame);

btnRules.addEventListener('click', ()=>{
  rulesScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
});
btnRulesClose.addEventListener('click', ()=>{
  rulesScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

btnLeaderboard.addEventListener('click', ()=>{
  renderLeaderboard();
  leaderboardScreen.classList.remove('hidden');
  startScreen.classList.add('hidden');
});
btnLeaderboardClose && btnLeaderboardClose.addEventListener('click', ()=>{
  leaderboardScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

btnPlayAgain.addEventListener('click', ()=>{
  resultScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

btnHome.addEventListener('click', ()=>{
  resultScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

// Save score to leaderboard
btnSaveScore.addEventListener('click', ()=>{
  const name = (playerNameInput.value || 'Anonymous').trim();
  const lb = loadLeaderboard();
  const entry = {
    name,
    score,
    correct: correctCount,
    wrong: wrongCount,
    time: totalTimeSpent,
    date: new Date().toISOString()
  };
  lb.push(entry);
  // sort desc and keep top 50
  lb.sort((a,b)=> b.score - a.score);
  saveLeaderboard(lb.slice(0,50));
  renderLeaderboard();
  alert('স্কোর সেভ হয়েছে!');
});

// Leaderboard functions
function loadLeaderboard(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return [];}
}
function saveLeaderboard(arr){
  localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(arr));
}
function renderLeaderboard(){
  const lb = loadLeaderboard();
  leaderboardList.innerHTML = '';
  if(lb.length===0){
    leaderboardList.innerHTML = '<li>কোনও রেকর্ড নেই</li>';
    return;
  }
  lb.forEach((e, idx)=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>#${idx+1} ${escapeHtml(e.name)}</strong> — ${e.score} পয়েন্ট</div><div class="muted small">${e.correct}✓ ${e.wrong}✗ • ${e.time}s</div>`;
    leaderboardList.appendChild(li);
  });
}
btnExport.addEventListener('click', ()=>{
  const data = loadLeaderboard();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'bf007_leaderboard.json';
  a.click();
  URL.revokeObjectURL(url);
});
btnImport.addEventListener('click', ()=>{
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      try{
        const parsed = JSON.parse(ev.target.result);
        if(Array.isArray(parsed)){
          saveLeaderboard(parsed.slice(0,50));
          renderLeaderboard();
          alert('Import সফল হয়েছে');
        }else alert('অবৈধ ফাইল');
      }catch(err){ alert('ফাইল পার্সিং ত্রুটি'); }
    };
    reader.readAsText(file);
  };
  input.click();
});
btnClearLeaderboard.addEventListener('click', ()=>{
  if(confirm('লিডারবোর্ড মুছে ফেলতে চান?')) { localStorage.removeItem(STORAGE_KEY_LEADERBOARD); renderLeaderboard(); }
});

// Badges / Achievements
const BADGE_DEFINITIONS = [
  { id:'first_play', title:'প্রথম খেলা', desc:'প্রথমবার খেলা খেলেছেন', criteria: state => true },
  { id:'score_1000', title:'স্কোর 1000+', desc:'একবারে 1000 বা বেশি স্কোর', criteria: state => state.score >= 1000 },
  { id:'perfect_round', title:'পারফেক্ট!', desc:'সমস্ত প্রশ্ন সঠিক', criteria: state => state.correct === state.total },
  { id:'speedy', title:'দ্রুত পদক্ষেপ', desc:'গড় সময় 5s-এর কম', criteria: state => (state.total>0) && ((state.time / state.total) <= 5) },
  { id:'streak_5', title:'স্ট্রিক 5', desc:'একবারে 5 স্ট্রিক', criteria: state => state.maxStreak >= 5 }
];

function loadBadges(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY_BADGES) || '[]'); }catch(e){ return []; }
}
function saveBadges(arr){ localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(arr)); }

function checkAndUnlockBadges(){
  // evaluate based on last game
  const prevBadges = loadBadges();
  const earned = [...prevBadges];
  const state = {
    score, correct: correctCount, wrong: wrongCount, total: pool.length,
    time: totalTimeSpent,
    maxStreak: getMaxStreakFromSession() // simplistic: approximate by streakBonusTotal / STREAK_BONUS_PER etc
  };
  BADGE_DEFINITIONS.forEach(b=>{
    if(!earned.includes(b.id) && b.criteria(state)){
      earned.push(b.id);
    }
  });
  saveBadges(earned);
  return earned;
}

function getMaxStreakFromSession(){
  // best-effort: derive from streakBonusTotal
  if(streakBonusTotal <= 0) return 0;
  // if each (streak-1) * STREAK_BONUS_PER accumulated => solve approx
  return Math.max(1, Math.floor((streakBonusTotal / STREAK_BONUS_PER) + 1));
}

function renderBadges(badgeIds){
  badgesEl.innerHTML = '';
  if(!badgeIds || badgeIds.length===0){
    badgesEl.innerHTML = '<div class="muted">কোনও অ্যাচিভমেন্ট নেই</div>';
    return;
  }
  badgeIds.forEach(id=>{
    const def = BADGE_DEFINITIONS.find(b=>b.id===id);
    if(def){
      const el = document.createElement('div');
      el.className = 'badge';
      el.title = def.desc;
      el.textContent = def.title;
      badgesEl.appendChild(el);
    }
  });
}

// small escape util
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// simple helper: when finishing game, some badges rely on maxStreak which we approximated — optionally refine later

// Utility: when results screen shown, compute derived stats (maxStreak tracked during session?)
/* NOTE: For this simple demo we didn't keep per-question history.
   To extend: record answers[] with timestamps to compute exact metrics. */

// simple UX: allow Start Screen's settings to be toggled via settings button
btnSettings.addEventListener('click', ()=>{
  startScreen.classList.toggle('hidden');
  rulesScreen.classList.add('hidden');
  leaderboardScreen.classList.add('hidden');
});

// small guard: if user refreshes mid-quiz, no persistence; can be extended

// initialize leaderbaord render on load
renderLeaderboard();

// Accessibility: keyboard support for option selection
document.addEventListener('keydown', (e)=>{
  if(quizScreen.classList.contains('hidden')) return;
  const k = e.key;
  if(['1','2','3','4','a','A','b','B','c','C','d','D'].includes(k)){
    const idx = (k>='1' && k<='4') ? Number(k)-1 : (['a','A'].includes(k)?0: ['b','B'].includes(k)?1: ['c','C'].includes(k)?2:3);
    const btn = optionsEl.querySelector(`.option[data-idx="${idx}"]`);
    if(btn && !btn.classList.contains('disabled')) btn.click();
  }
});
