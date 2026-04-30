// 口腔执业医师刷题 - 主应用逻辑

// ========== 状态管理 ==========
const STORAGE_KEY = 'dental_quiz_data';
let state = {
  answers: {},      // {questionId: selectedOption}
  wrongBook: [],    // [{questionId, chapter, ...}]
  stats: { total: 0, correct: 0 },
  history: []       // [{date, score, chapter, ...}]
};

let currentQuiz = {
  mode: '',         // 'chapter' | 'random' | 'exam' | 'wrong'
  questions: [],
  currentIndex: 0,
  answers: {},
  startTime: null,
  chapter: ''
};

// ========== 初始化 ==========
function init() {
  loadState();
  updateHomeStats();
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

// ========== 章节练习 ==========
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
  QUESTIONS.forEach(q => {
    if (!chapters[q.chapter]) chapters[q.chapter] = 0;
    chapters[q.chapter]++;
  });
  return Object.entries(chapters).map(([name, count]) => ({ name, count }));
}

function startChapterQuiz(chapter) {
  const questions = QUESTIONS.filter(q => q.chapter === chapter);
  startQuiz('chapter', questions, chapter);
}

// ========== 随机刷题 ==========
function startRandom() {
  const count = Math.min(20, QUESTIONS.length);
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, count);
  startQuiz('random', shuffled, '随机刷题');
}

// ========== 模拟考试 ==========
function startExam() {
  const count = Math.min(50, QUESTIONS.length);
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, count);
  startQuiz('exam', shuffled, '模拟考试');
}

// ========== 错题重做 ==========
function redoWrong() {
  if (state.wrongBook.length === 0) {
    alert('没有错题');
    return;
  }
  const wrongIds = state.wrongBook.map(w => w.questionId);
  const questions = QUESTIONS.filter(q => wrongIds.includes(q.id));
  startQuiz('wrong', questions, '错题重做');
}

function redoAllWrong() {
  redoWrong();
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
    chapter: title
  };
  document.getElementById('quiz-title').textContent = title;
  document.getElementById('quiz-total').textContent = questions.length;
  document.getElementById('quiz-timer').textContent = mode === 'exam' ? '00:00' : '';
  document.getElementById('btn-submit').style.display = 'none';
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

function renderQuestion() {
  const q = currentQuiz.questions[currentQuiz.currentIndex];
  const idx = currentQuiz.currentIndex;
  const total = currentQuiz.questions.length;
  
  document.getElementById('quiz-current').textContent = idx + 1;
  document.getElementById('progress-fill').style.width = ((idx + 1) / total * 100) + '%';
  document.getElementById('question-type').textContent = q.chapter || '选择题';
  document.getElementById('question-text').textContent = (idx + 1) + '. ' + q.question;
  
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
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
  if (idx === total - 1 && allAnswered) {
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'block';
  } else {
    document.getElementById('btn-next').style.display = 'block';
    document.getElementById('btn-submit').style.display = 'none';
  }
}

function selectOption(qId, optionIndex) {
  if (currentQuiz.answers[qId] !== undefined) return;
  currentQuiz.answers[qId] = optionIndex;
  renderQuestion();
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
  if (Object.keys(currentQuiz.answers).length > 0) {
    if (confirm('确定退出吗？当前进度不会保存。')) {
      clearInterval(timerInterval);
      showPage('home');
    }
  } else {
    clearInterval(timerInterval);
    showPage('home');
  }
}

// ========== 提交判分 ==========
function submitQuiz() {
  clearInterval(timerInterval);
  
  const questions = currentQuiz.questions;
  const answers = currentQuiz.answers;
  let correct = 0;
  let wrong = 0;
  const wrongQuestions = [];
  const chapterStats = {};
  
  questions.forEach(q => {
    const userAns = answers[q.id];
    const ch = q.chapter || '未分类';
    if (!chapterStats[ch]) chapterStats[ch] = { total: 0, correct: 0 };
    chapterStats[ch].total++;
    
    if (userAns === q.answer) {
      correct++;
      chapterStats[ch].correct++;
    } else {
      wrong++;
      wrongQuestions.push(q);
      // 加入错题本
      const exists = state.wrongBook.find(w => w.questionId === q.id);
      if (!exists) {
        state.wrongBook.push({ questionId: q.id, chapter: ch });
      }
    }
  });
  
  const score = Math.round(correct / questions.length * 100);
  const elapsed = Math.floor((Date.now() - currentQuiz.startTime) / 1000);
  
  // 更新统计
  state.stats.total += questions.length;
  state.stats.correct += correct;
  
  // 保存历史
  state.history.push({
    date: new Date().toISOString(),
    score,
    chapter: currentQuiz.chapter,
    total: questions.length,
    correct
  });
  
  saveState();
  
  // 显示结果
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
  `).join('') : '<div class="empty-state"><div class="empty-text">全部掌握，没有薄弱点！</div></div>';
  
  // 错题列表
  const wrongList = document.getElementById('wrong-list');
  wrongList.innerHTML = wrongQuestions.length > 0 ? wrongQuestions.map(q => `
    <div class="wrong-item" onclick="showWrongDetail(${q.id})">
      <div class="wrong-q">${q.question}</div>
      <div class="wrong-ans">
        <span class="label">你的答案：</span><span class="your">${letters[currentQuiz.answers[q.id]]}</span>
        <span class="label" style="margin-left:10px">正确答案：</span><span class="right">${letters[q.answer]}</span>
      </div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-text">全部答对！</div></div>';
  
  updateHomeStats();
  showPage('result');
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

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
  
  // 章节筛选
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
    const q = QUESTIONS.find(q => q.id === w.questionId);
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

function showWrongDetail(qId) {
  const q = QUESTIONS.find(q => q.id === qId);
  if (!q) return;
  alert(`题目：${q.question}\n\n正确答案：${letters[q.answer]}. ${q.options[q.answer]}\n\n${q.explanation ? '解析：' + q.explanation : ''}`);
}

// ========== 启动 ==========
init();
