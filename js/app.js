// 口腔执业医师刷题 - 主应用逻辑 (v3 - 动态题库版)

// ========== 配置 ==========
const BANK_URL = './data/bank.json';
const STORAGE_KEY = 'dental_quiz_v3';

// ========== 状态管理 ==========
let state = {
  answered: {},     // {questionId: selectedOption} - 所有做过的题
  wrongBook: [],    // [{questionId, chapter}]
  stats: { total: 0, correct: 0 },
  history: []       // [{date, score, chapter, total, correct}]
};

let questionBank = [];  // 从后台加载的完整题库

let currentQuiz = {
  mode: '',
  questions: [],
  currentIndex: 0,
  answers: {},
  startTime: null,
  chapter: '',
  submitted: false
};

// ========== 初始化 ==========
async function init() {
  loadState();
  updateHomeStats();
  await loadQuestionBank();
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = JSON.parse(saved);
  } catch(e) {}
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) {}
}

// ========== 从后台加载题库 ==========
async function loadQuestionBank() {
  try {
    const resp = await fetch(BANK_URL + '?t=' + Date.now());
    if (!resp.ok) throw new Error('加载失败');
    questionBank = await resp.json();
    console.log('题库加载成功:', questionBank.length, '题');
    updateBankInfo();
  } catch(e) {
    console.error('题库加载失败:', e);
    // 如果加载失败，尝试用内嵌题库
    if (typeof QUESTIONS !== 'undefined') {
      questionBank = QUESTIONS;
    }
  }
}

function updateBankInfo() {
  const el = document.getElementById('bank-info');
  if (el) el.textContent = '题库: ' + questionBank.length + '题';
}

// ========== 页面切换 ==========
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  window.scrollTo(0, 0);
}

// ========== 首页统计 ==========
function updateHomeStats() {
  document.getElementById('stat-total').textContent = state.stats.total;
  document.getElementById('stat-correct').textContent = 
    state.stats.total > 0 ? Math.round(state.stats.correct / state.stats.total * 100) + '%' : '0%';
  document.getElementById('stat-wrong').textContent = state.wrongBook.length;
}

// ========== 章节列表 ==========
function startChapter() {
  const chapters = getChapters();
  const list = document.getElementById('chapter-list');
  list.innerHTML = chapters.map(ch => `
    <div class="chapter-card" onclick="startChapterQuiz('${ch.name}')">
      <div>
        <div class="chapter-name">${ch.name}</div>
      </div>
      <span class="chapter-count">${ch.count} 题</span>
    </div>
  `).join('');
  showPage('chapters');
}

function getChapters() {
  const chapters = {};
  questionBank.forEach(q => {
    if (!chapters[q.chapter]) chapters[q.chapter] = 0;
    chapters[q.chapter]++;
  });
  return Object.entries(chapters).map(([name, count]) => ({ name, count }));
}

// ========== 章节练习（去重，每次新题） ==========
function startChapterQuiz(chapter) {
  const all = questionBank.filter(q => q.chapter === chapter);
  const unansered = getUnanseredQuestions(all);
  // 如果没做过的题不够，就用全部题
  const pool = unansered.length >= 15 ? unansered : all;
  const shuffled = shuffleArray(pool).slice(0, Math.min(15, pool.length));
  startQuiz('chapter', shuffled, chapter);
}

// ========== 随机刷题（去重） ==========
function startRandom() {
  const unansered = getUnanseredQuestions(questionBank);
  const pool = unansered.length >= 20 ? unansered : questionBank;
  const shuffled = shuffleArray(pool).slice(0, Math.min(20, pool.length));
  startQuiz('random', shuffled, '随机刷题');
}

// ========== 模拟考试（去重） ==========
function startExam() {
  const unansered = getUnanseredQuestions(questionBank);
  const pool = unansered.length >= 50 ? unansered : questionBank;
  const shuffled = shuffleArray(pool).slice(0, Math.min(50, pool.length));
  startQuiz('exam', shuffled, '模拟考试');
}

// ========== 错题重做 ==========
function redoWrong() {
  if (state.wrongBook.length === 0) {
    alert('没有错题');
    return;
  }
  const wrongIds = state.wrongBook.map(w => w.questionId);
  const questions = questionBank.filter(q => wrongIds.includes(q.id));
  startQuiz('wrong', shuffleArray(questions), '错题重做');
}

function redoAllWrong() { redoWrong(); }

// ========== 获取未做过的题 ==========
function getUnanseredQuestions(pool) {
  return pool.filter(q => state.answered[q.id] === undefined);
}

// ========== 随机打乱 ==========
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ========== 做题核心 ==========
function startQuiz(mode, questions, title) {
  if (questions.length === 0) {
    alert('没有题目');
    return;
  }
  currentQuiz = {
    mode,
    questions,
    currentIndex: 0,
    answers: {},
    startTime: Date.now(),
    chapter: title,
    submitted: false
  };
  document.getElementById('quiz-title').textContent = title;
  document.getElementById('quiz-total').textContent = questions.length;
  document.getElementById('quiz-timer').textContent = mode === 'exam' ? '00:00' : '';
  document.getElementById('btn-submit').style.display = 'none';
  document.getElementById('btn-next').style.display = 'block';
  showPage('quiz');
  renderQuestion();
  if (mode === 'exam') startTimer();
}

let timerInterval;
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - currentQuiz.startTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const sec = String(elapsed % 60).padStart(2, '0');
    document.getElementById('quiz-timer').textContent = min + ':' + sec;
  }, 1000);
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

function renderQuestion() {
  const q = currentQuiz.questions[currentQuiz.currentIndex];
  const idx = currentQuiz.currentIndex;
  const total = currentQuiz.questions.length;
  
  document.getElementById('quiz-current').textContent = idx + 1;
  document.getElementById('progress-fill').style.width = ((idx + 1) / total * 100) + '%';
  document.getElementById('question-type').textContent = q.chapter || '选择题';
  document.getElementById('question-text').textContent = (idx + 1) + '. ' + q.question;
  
  const selected = currentQuiz.answers[q.id];
  const answered = selected !== undefined;
  
  const optionsHtml = q.options.map((opt, i) => {
    let cls = 'option-item';
    if (answered) {
      cls += ' disabled';
      if (i === selected && i !== q.answer) cls += ' wrong';
      if (i === q.answer) cls += ' correct';
    }
    return `<div class="${cls}" onclick="selectOption(${q.id}, ${i})">
      <span class="option-letter">${letters[i]}</span>
      <span class="option-text">${opt}</span>
    </div>`;
  }).join('');
  
  document.getElementById('options-list').innerHTML = optionsHtml;
  
  // 显示解析
  const existingExplanation = document.querySelector('.explanation');
  if (existingExplanation) existingExplanation.remove();
  
  if (answered && q.explanation) {
    const expDiv = document.createElement('div');
    expDiv.className = 'explanation';
    expDiv.innerHTML = `<div class="explanation-title">解析</div><div class="explanation-text">${q.explanation}</div>`;
    document.getElementById('question-card').appendChild(expDiv);
  }
  
  // 按钮状态
  document.getElementById('btn-prev').style.visibility = idx > 0 ? 'visible' : 'hidden';
  
  const allAnswered = currentQuiz.questions.every(q => currentQuiz.answers[q.id] !== undefined);
  
  if (allAnswered && !currentQuiz.submitted) {
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'block';
    document.getElementById('btn-submit').textContent = '查看结果';
  } else if (idx === total - 1) {
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'block';
    document.getElementById('btn-submit').textContent = '提交';
  } else {
    document.getElementById('btn-next').style.display = 'block';
    document.getElementById('btn-submit').style.display = 'none';
  }
}

function selectOption(qId, optionIndex) {
  if (currentQuiz.answers[qId] !== undefined) return;
  if (currentQuiz.submitted) return;
  
  currentQuiz.answers[qId] = optionIndex;
  
  // 记录到全局已做题库
  state.answered[qId] = optionIndex;
  
  // 立即记录错题
  const q = currentQuiz.questions.find(q => q.id === qId);
  if (q && optionIndex !== q.answer) {
    const exists = state.wrongBook.find(w => w.questionId === qId);
    if (!exists) {
      state.wrongBook.push({ questionId: qId, chapter: q.chapter || '未分类' });
    }
  }
  
  saveState();
  renderQuestion();
  
  // 全部答完自动跳结果
  const allAnswered = currentQuiz.questions.every(q => currentQuiz.answers[q.id] !== undefined);
  if (allAnswered && !currentQuiz.submitted) {
    setTimeout(() => {
      if (!currentQuiz.submitted) submitQuiz();
    }, 1500);
  }
}

function nextQuestion() {
  if (currentQuiz.currentIndex < currentQuiz.questions.length - 1) {
    currentQuiz.currentIndex++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentQuiz.currentIndex > 0) {
    currentQuiz.currentIndex--;
    renderQuestion();
  }
}

function confirmQuit() {
  clearInterval(timerInterval);
  
  // 退出时保存已做统计
  const answered = Object.keys(currentQuiz.answers).length;
  if (answered > 0) {
    let correct = 0;
    currentQuiz.questions.forEach(q => {
      if (currentQuiz.answers[q.id] !== undefined && currentQuiz.answers[q.id] === q.answer) {
        correct++;
      }
    });
    state.stats.total += answered;
    state.stats.correct += correct;
    saveState();
    updateHomeStats();
  }
  
  showPage('home');
}

// ========== 提交判分 ==========
function submitQuiz() {
  if (currentQuiz.submitted) return;
  currentQuiz.submitted = true;
  clearInterval(timerInterval);
  
  const questions = currentQuiz.questions;
  const answers = currentQuiz.answers;
  let correct = 0;
  let wrong = 0;
  const wrongQuestions = [];
  const chapterStats = {};
  
  questions.forEach(q => {
    const userAns = answers[q.id];
    if (userAns === undefined) return;
    
    const ch = q.chapter || '未分类';
    if (!chapterStats[ch]) chapterStats[ch] = { total: 0, correct: 0 };
    chapterStats[ch].total++;
    
    if (userAns === q.answer) {
      correct++;
      chapterStats[ch].correct++;
    } else {
      wrong++;
      wrongQuestions.push(q);
      // 确保错题已记录
      const exists = state.wrongBook.find(w => w.questionId === q.id);
      if (!exists) {
        state.wrongBook.push({ questionId: q.id, chapter: ch });
      }
    }
  });
  
  const total = correct + wrong;
  const score = total > 0 ? Math.round(correct / total * 100) : 0;
  const elapsed = Math.floor((Date.now() - currentQuiz.startTime) / 1000);
  
  state.stats.total += total;
  state.stats.correct += correct;
  
  state.history.push({
    date: new Date().toISOString(),
    score,
    chapter: currentQuiz.chapter,
    total,
    correct
  });
  
  saveState();
  showResult(score, correct, wrong, elapsed, wrongQuestions, chapterStats);
}

function showResult(score, correct, wrong, elapsed, wrongQuestions, chapterStats) {
  document.getElementById('result-score').textContent = score;
  document.getElementById('result-correct').textContent = correct;
  document.getElementById('result-wrong').textContent = wrong;
  
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  document.getElementById('result-time').textContent = min + ':' + String(sec).padStart(2, '0');
  
  // 薄弱知识点
  const weakList = document.getElementById('weak-list');
  const weakChapters = Object.entries(chapterStats)
    .map(([name, s]) => ({ name, rate: s.correct / s.total, total: s.total, correct: s.correct }))
    .filter(w => w.rate < 0.8)
    .sort((a, b) => a.rate - b.rate);
  
  weakList.innerHTML = weakChapters.length > 0 ? weakChapters.map(w => `
    <div class="weak-item">
      <span class="weak-name">${w.name}</span>
      <span class="weak-rate">${Math.round(w.rate * 100)}%</span>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-text">全部掌握！</div></div>';
  
  // 错题列表
  const wrongList = document.getElementById('wrong-list');
  wrongList.innerHTML = wrongQuestions.length > 0 ? wrongQuestions.map(q => `
    <div class="wrong-item">
      <div class="wrong-q">${q.question}</div>
      <div class="wrong-ans">
        <span class="label">你的：</span><span class="your">${letters[currentQuiz.answers[q.id]]}</span>
        <span class="label" style="margin-left:10px">正确：</span><span class="right">${letters[q.answer]}</span>
      </div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-text">全部答对！</div></div>';
  
  updateHomeStats();
  showPage('result');
}

// ========== 错题本 ==========
function showWrongBook() {
  if (state.wrongBook.length === 0) {
    document.getElementById('wrong-book-list').innerHTML = 
      '<div class="empty-state"><div class="empty-icon">📖</div><div class="empty-text">还没有错题，继续保持！</div></div>';
    document.getElementById('wrong-actions').style.display = 'none';
    document.getElementById('wrong-count').textContent = '';
    showPage('wrong');
    return;
  }
  
  document.getElementById('wrong-actions').style.display = 'block';
  document.getElementById('wrong-count').textContent = state.wrongBook.length + ' 题';
  
  const chapters = [...new Set(state.wrongBook.map(w => w.chapter))];
  document.getElementById('wrong-chapters').innerHTML = chapters.map(ch => 
    `<button class="filter-btn" onclick="filterWrong('${ch}', this)">${ch}</button>`
  ).join('');
  
  renderWrongList('all');
  showPage('wrong');
}

function filterWrong(chapter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderWrongList(chapter);
}

function renderWrongList(chapter) {
  let wrongItems = state.wrongBook;
  if (chapter !== 'all') {
    wrongItems = wrongItems.filter(w => w.chapter === chapter);
  }
  
  const list = document.getElementById('wrong-book-list');
  list.innerHTML = wrongItems.map(w => {
    const q = questionBank.find(q => q.id === w.questionId);
    if (!q) return '';
    return `<div class="wrong-book-item">
      <div class="wrong-book-q">${q.question}</div>
      <div class="wrong-book-opts">
        ${q.options.map((opt, i) => {
          let cls = 'wrong-book-opt';
          if (i === q.answer) cls += ' correct';
          return `<div class="${cls} disabled">${letters[i]}. ${opt}</div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ========== 启动 ==========
init();
