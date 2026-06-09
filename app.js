// ====== 應用程序主邏輯 ======

// 常量
const API_BASE_URL = 'https://api.dictionaryapi.dev/api/v1/entries/english';
const STORAGE_KEY = 'wordCardData';

// DOM 元素
const navBtns = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');
const flashcard = document.getElementById('flashcard');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const autoFillBtn = document.getElementById('auto-fill-btn');
const wordForm = document.getElementById('word-form');
const loadingOverlay = document.getElementById('loading');
const toast = document.getElementById('toast');

// 狀態
let currentWordIndex = 0;
let words = [];
let isFlipped = false;

// ====== 初始化 ======
document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    setupEventListeners();
    renderWordsList();
    updateCardDisplay();
    updateStats();
});

function setupEventListeners() {
    // 頁面導航
    navBtns.forEach(btn => {
        btn.addEventListener('click', handlePageNavigation);
    });

    // 卡片翻轉
    flashcard.addEventListener('click', flipCard);

    // 卡片控制
    prevBtn.addEventListener('click', previousWord);
    nextBtn.addEventListener('click', nextWord);

    // 表單提交
    wordForm.addEventListener('submit', handleFormSubmit);

    // 自動填入
    autoFillBtn.addEventListener('click', handleAutoFill);

    // 鍵盤快捷鍵
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ====== 頁面導航 ======
function handlePageNavigation(e) {
    const pageName = e.target.dataset.page;
    
    // 更新導航按鈕
    navBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // 更新頁面顯示
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}-page`).classList.add('active');

    // 重置卡片
    if (pageName === 'learn') {
        isFlipped = false;
        flashcard.classList.remove('flipped');
    }
}

// ====== 卡片翻轉 ======
function flipCard() {
    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped');
}

// ====== 導航功能 ======
function previousWord() {
    if (words.length === 0) return;
    currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
    updateCardDisplay();
}

function nextWord() {
    if (words.length === 0) return;
    currentWordIndex = (currentWordIndex + 1) % words.length;
    updateCardDisplay();
}

// ====== 更新卡片顯示 ======
function updateCardDisplay() {
    if (words.length === 0) {
        document.getElementById('word-english').textContent = 'No Words';
        document.getElementById('word-translation').textContent = '請在管理頁面新增單字';
        document.getElementById('word-pos').textContent = '-';
        document.getElementById('word-example').textContent = '-';
        document.getElementById('word-etymology').textContent = '-';
        document.getElementById('current-index').textContent = '0';
        document.getElementById('total-count').textContent = '0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    prevBtn.disabled = false;
    nextBtn.disabled = false;

    // 重置翻轉狀態
    isFlipped = false;
    flashcard.classList.remove('flipped');

    const word = words[currentWordIndex];
    document.getElementById('word-english').textContent = word.english;
    document.getElementById('word-translation').textContent = word.translation || '-';
    document.getElementById('word-pos').textContent = word.pos || '-';
    document.getElementById('word-example').textContent = word.example || '-';
    document.getElementById('word-etymology').textContent = word.etymology || '-';

    // 更新計數
    document.getElementById('current-index').textContent = currentWordIndex + 1;
    document.getElementById('total-count').textContent = words.length;
}

// ====== 表單提交 ======
function handleFormSubmit(e) {
    e.preventDefault();

    const english = document.getElementById('input-english').value.trim();
    const translation = document.getElementById('input-translation').value.trim();
    const pos = document.getElementById('input-pos').value.trim();
    const example = document.getElementById('input-example').value.trim();
    const etymology = document.getElementById('input-etymology').value.trim();

    if (!english || !translation) {
        showToast('請填入英文單字和翻譯', 'error');
        return;
    }

    // 檢查是否重複
    if (words.some(w => w.english.toLowerCase() === english.toLowerCase())) {
        showToast('此單字已存在', 'error');
        return;
    }

    const newWord = {
        id: Date.now(),
        english,
        translation,
        pos,
        example,
        etymology
    };

    words.push(newWord);
    saveWords();
    renderWordsList();
    updateStats();
    wordForm.reset();
    showToast('✨ 單字新增成功', 'success');

    // 如果在學習頁面，更新顯示
    const learnPage = document.getElementById('learn-page');
    if (learnPage.classList.contains('active')) {
        currentWordIndex = words.length - 1;
        updateCardDisplay();
    }
}

// ====== 自動填入 API 功能 ======
async function handleAutoFill() {
    const english = document.getElementById('input-english').value.trim();

    if (!english) {
        showToast('請先輸入英文單字', 'error');
        return;
    }

    showLoading(true);

    try {
        const data = await fetchWordData(english);
        
        if (!data) {
            showToast('查無此單字，請手動填入', 'error');
            showLoading(false);
            return;
        }

        // 填入翻譯
        const meanings = data.meanings;
        if (meanings && meanings.length > 0) {
            // 查找中文定義
            const definition = meanings[0].definitions?.[0]?.definition || '';
            if (definition) {
                document.getElementById('input-translation').value = definition;
            }

            // 填入詞性
            const partOfSpeech = meanings[0].partOfSpeech || '';
            if (partOfSpeech) {
                document.getElementById('input-pos').value = partOfSpeech;
            }

            // 填入例句
            const example = meanings[0].definitions?.[0]?.example || '';
            if (example) {
                document.getElementById('input-example').value = example;
            }
        }

        // 填入字根分析
        const etymology = data.etymology || '';
        if (etymology) {
            document.getElementById('input-etymology').value = etymology;
        } else {
            // 如果沒有字根分析，嘗試從origin獲取
            const origin = data.origin || '';
            if (origin) {
                document.getElementById('input-etymology').value = origin;
            }
        }

        showToast('✨ 已自動填入單字信息', 'success');
    } catch (error) {
        console.error('API Error:', error);
        showToast('API 查詢失敗，請檢查網絡連接', 'error');
    } finally {
        showLoading(false);
    }
}

// ====== API 請求 ======
async function fetchWordData(word) {
    try {
        const response = await fetch(`${API_BASE_URL}/${word.toLowerCase()}`);
        
        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

// ====== 刪除單字 ======
function deleteWord(id) {
    if (confirm('確定要刪除此單字嗎？')) {
        words = words.filter(w => w.id !== id);
        
        // 調整當前索引
        if (currentWordIndex >= words.length) {
            currentWordIndex = Math.max(0, words.length - 1);
        }

        saveWords();
        renderWordsList();
        updateCardDisplay();
        updateStats();
        showToast('單字已刪除', 'success');
    }
}

// ====== 渲染單字列表 ======
function renderWordsList() {
    const wordsList = document.getElementById('words-list');
    
    if (words.length === 0) {
        wordsList.innerHTML = '<div class="empty-message">還沒有新增任何單字，開始新增吧！</div>';
        return;
    }

    wordsList.innerHTML = words.map(word => `
        <div class="word-item">
            <div class="word-info">
                <h3>${escapeHtml(word.english)}</h3>
                <p><strong>翻譯：</strong> ${escapeHtml(word.translation)}</p>
                ${word.pos ? `<p><strong>詞性：</strong> ${escapeHtml(word.pos)}</p>` : ''}
                ${word.example ? `<p><strong>例句：</strong> ${escapeHtml(word.example)}</p>` : ''}
            </div>
            <div class="word-item-actions">
                <button class="delete-btn" onclick="deleteWord(${word.id})">🗑️ 刪除</button>
            </div>
        </div>
    `).join('');
}

// ====== 存儲管理 ======
function saveWords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function loadWords() {
    const stored = localStorage.getItem(STORAGE_KEY);
    words = stored ? JSON.parse(stored) : [];
}

// ====== 統計更新 ======
function updateStats() {
    document.getElementById('total-words').textContent = words.length;
    document.getElementById('total-count').textContent = words.length;
}

// ====== UI 工具函數 ======
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // 清除隱藏類
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ====== 鍵盤快捷鍵 ======
function handleKeyboardShortcuts(e) {
    const learnPage = document.getElementById('learn-page');
    
    if (!learnPage.classList.contains('active')) return;

    if (e.key === 'ArrowLeft') {
        previousWord();
    } else if (e.key === 'ArrowRight') {
        nextWord();
    } else if (e.key === ' ') {
        e.preventDefault();
        flipCard();
    }
}
