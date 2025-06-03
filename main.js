// 全域變數
const input = document.getElementById('input');
const convertBtn = document.getElementById('convert');
const copyBtn = document.getElementById('copy');
const rubyResult = document.getElementById('rubyResult');
const htmlResult = document.getElementById('htmlResult');
const statusEl = document.getElementById('status');

let tokenizer = null;
let loading = false;

// 片假名轉平假名
function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// 判斷字元是否為平假名
function isHiragana(char) {
  return /[\u3040-\u309f]/.test(char);
}

// 判斷字元是否為片假名
function isKatakana(char) {
  return /[\u30a0-\u30ff]/.test(char);
}

// 判斷字元是否為漢字
function isKanji(char) {
  return /[\u4e00-\u9faf]/.test(char);
}

// 判斷字元是否為數字
function isNumber(char) {
  return /[0-9０-９一二三四五六七八九十百千万億]/.test(char);
}

// 判斷是否為特殊符號（如「ヶ」）
function isSpecialSymbol(char) {
  return char === 'ヶ';
}

// 智能處理文字，只對漢字添加 ruby 標記
function processToken(token) {
  if (!token.reading) return token.surface_form;

  const surface = token.surface_form;
  const reading = katakanaToHiragana(token.reading);

  // 特殊處理「日本」，強制使用「にほん」讀音
  if (surface === '日本') {
    return `<ruby>${surface}<rt>にほん</rt></ruby>`;
  }

  // 特殊處理「日本語」，強制使用「にほんご」讀音
  if (surface === '日本語') {
    return `<ruby>${surface}<rt>にほんご</rt></ruby>`;
  }

  // 特殊處理數字+計數詞組合 (如 一人、二人、三冊 等)
  if (surface.length >= 2) {
    const firstChar = surface.charAt(0);
    const restChars = surface.substring(1);

    // 如果第一個字符是數字漢字，後面是計數詞
    if (isNumber(firstChar) && restChars.split('').every(isKanji)) {
      // 推算數字部分的讀音長度
      const numReadingLength = reading.length - restChars.length;
      if (numReadingLength > 0) {
        const numReading = reading.substring(0, numReadingLength);
        const counterReading = reading.substring(numReadingLength);

        return `<ruby>${firstChar}<rt>${numReading}</rt></ruby><ruby>${restChars}<rt>${counterReading}</rt></ruby>`;
      }
    }
  }

  // 特殊處理「ヶ月」「ヶ所」等常見詞彙
  if (surface.includes('ヶ月') || surface.includes('ヶ所') || surface.includes('ヶ国')) {
    // 找出「ヶ」的位置
    const kePosition = surface.indexOf('ヶ');

    // 如果「ヶ」前面是數字或漢字
    if (kePosition > 0) {
      // 前面的部分
      const prefix = surface.substring(0, kePosition);

      // 「ヶ」後面的部分
      const suffix = surface.substring(kePosition + 1);

      // 特殊處理「ヶ月」(かげつ)
      if (suffix === '月' && reading.endsWith('げつ')) {
        // 4ヶ月 -> よんかげつ，只為「月」添加平假名
        return `${prefix}ヶ<ruby>${suffix}<rt>げつ</rt></ruby>`;
      }

      // 特殊處理「ヶ所」(かしょ)
      if (suffix === '所' && reading.endsWith('しょ')) {
        // 3ヶ所 -> さんかしょ，只為「所」添加平假名
        return `${prefix}ヶ<ruby>${suffix}<rt>しょ</rt></ruby>`;
      }

      // 特殊處理「ヶ国」(かこく)
      if (suffix === '国' && reading.endsWith('こく')) {
        // 5ヶ国 -> ごかこく，只為「国」添加平假名
        return `${prefix}ヶ<ruby>${suffix}<rt>こく</rt></ruby>`;
      }

      // 一般情況：如果後面是漢字
      if (suffix && isKanji(suffix[0])) {
        // 嘗試從讀音中提取後面漢字的讀音
        const suffixToken = {
          surface_form: suffix,
          reading: reading.substring(prefix.length + 1)
        };

        // 處理後面的漢字部分
        const processedSuffix = processToken(suffixToken);

        // 組合結果
        return prefix + 'ヶ' + processedSuffix;
      }
    }
  }

  // 如果沒有漢字，直接返回原文
  if (!surface.match(/[\u4e00-\u9faf]/)) {
    return surface;
  }

  // 如果全是漢字，添加完整 ruby
  if (surface.split('').every(char => isKanji(char))) {
    return `<ruby>${surface}<rt>${reading}</rt></ruby>`;
  }

  // 處理特殊情況：動詞和形容詞
  // 檢查是否為動詞或形容詞（通常漢字在前，平假名在後）
  const firstChar = surface.charAt(0);
  if (isKanji(firstChar) && surface.length > 1) {
    // 找出所有漢字部分
    let kanjiPart = '';
    let kanaPart = '';
    let i = 0;

    // 收集開頭的所有漢字
    while (i < surface.length && isKanji(surface[i])) {
      kanjiPart += surface[i];
      i++;
    }

    // 收集剩餘的假名部分
    kanaPart = surface.substring(i);

    // 如果有漢字部分，為其添加注音
    if (kanjiPart) {
      // 從讀音中推算漢字部分的讀音
      // 假設：讀音的長度 = 漢字部分的讀音 + 假名部分的長度
      // 因此漢字部分的讀音長度 = 總讀音長度 - 假名部分長度
      const kanjiReadingLength = Math.max(0, reading.length - kanaPart.length);
      const kanjiReading = reading.substring(0, kanjiReadingLength);

      return `<ruby>${kanjiPart}<rt>${kanjiReading}</rt></ruby>${kanaPart}`;
    }
  }

  // 處理混合情況：拆分漢字和非漢字
  let result = '';
  let currentKanji = '';
  let readingIndex = 0;

  // 逐字處理
  for (let i = 0; i < surface.length; i++) {
    const char = surface[i];

    if (isKanji(char)) {
      // 累積漢字
      currentKanji += char;
    } else if (isSpecialSymbol(char)) {
      // 特殊符號「ヶ」，與前面的漢字一起處理
      if (currentKanji) {
        currentKanji += char;
      } else {
        result += char;
      }
    } else {
      // 非漢字，先處理之前累積的漢字
      if (currentKanji) {
        // 計算這些漢字對應的讀音
        // 1. 計算剩餘的讀音長度
        const remainingReading = reading.substring(readingIndex);
        // 2. 估算漢字部分的讀音長度 (每個漢字通常對應1-2個假名)
        const estimatedLength = Math.min(
          remainingReading.length,
          currentKanji.length * 2
        );
        const kanjiReading = remainingReading.substring(0, estimatedLength);

        result += `<ruby>${currentKanji}<rt>${kanjiReading}</rt></ruby>`;
        readingIndex += estimatedLength;
        currentKanji = '';
      }

      // 如果是平假名，檢查是否與讀音匹配
      if (isHiragana(char) && readingIndex < reading.length && char === reading[readingIndex]) {
        readingIndex++;
      }

      // 添加非漢字
      result += char;
    }
  }

  // 處理最後剩餘的漢字
  if (currentKanji) {
    const remainingReading = reading.substring(readingIndex);
    result += `<ruby>${currentKanji}<rt>${remainingReading}</rt></ruby>`;
  }

  return result;
}

// 載入 kuromoji 詞典
function initKuromoji() {
  // if (typeof kuromoji === 'undefined') {
  //   showStatus("kuromoji 載入失敗，請重新整理頁面", "error");
  //   return;
  // }

  showStatus("載入詞典中...", "loading");
  loading = true;

  // 使用本地字典檔案
  const dicPath = './dict/';
  kuromoji.builder({ dicPath }).build((err, _tokenizer) => {
    loading = false;
    if (err) {
      showStatus("詞典載入失敗: " + err, "error");
      return;
    }
    tokenizer = _tokenizer;
    showStatus("準備就緒", "success");
    convertBtn.disabled = false;
  });
}

// 顯示狀態訊息
function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = "status";

  if (type === "loading") {
    statusEl.classList.add("loading");
  } else if (type === "success") {
    statusEl.classList.add("success-message");
  } else if (type === "error") {
    statusEl.classList.add("error-message");
  }
}

// 轉換文字
convertBtn.onclick = function () {
  if (loading || !tokenizer) return;

  const text = input.value;
  if (!text.trim()) {
    showStatus("請輸入日文文章", "error");
    return;
  }

  showStatus("處理中...", "loading");
  convertBtn.disabled = true;

  // 使用 setTimeout 避免 UI 凍結
  setTimeout(() => {
    try {
      // 保留原始段落格式
      const paragraphs = text.split(/\n\n+/);
      let html = '';

      // 處理每個段落
      paragraphs.forEach((paragraph, index) => {
        if (!paragraph.trim()) {
          // 空段落，添加換行
          html += '<br>';
          return;
        }

        // 處理段落內的每一行
        const lines = paragraph.split(/\n/);
        const processedLines = lines.map(line => {
          if (!line.trim()) return '';

          // 處理每一行的文本
          const tokens = tokenizer.tokenize(line);
          return tokens.map(token => processToken(token)).join('');
        });

        // 將處理後的行組合成段落
        if (processedLines.length > 0) {
          if (index > 0) html += '<p></p>'; // 使用段落標籤代替 <br><br>
          html += `<p>${processedLines.join('<br>')}</p>`;
        }
      });

      // 包裹在 js-article-body div 中
      const finalHtml = `<div class="js-article-body">\n${html}\n</div>`;

      rubyResult.innerHTML = finalHtml;
      htmlResult.textContent = finalHtml;
      copyBtn.disabled = !finalHtml;
      showStatus("轉換完成", "success");

      // 自動切換到預覽標籤
      activateTab('preview');
    } catch (e) {
      showStatus("處理錯誤: " + e.message, "error");
    }

    convertBtn.disabled = false;
  }, 10);
};

// 複製功能
copyBtn.onclick = function () {
  const html = htmlResult.textContent;
  if (!html) return;

  navigator.clipboard.writeText(html)
    .then(() => {
      copyBtn.textContent = '已複製!';
      showStatus("HTML 已複製到剪貼簿", "success");
      setTimeout(() => {
        copyBtn.textContent = '複製 HTML';
        showStatus("準備就緒", "success");
      }, 1200);
    })
    .catch(err => {
      showStatus("複製失敗: " + err, "error");
    });
};

// 標籤切換
function activateTab(tabId) {
  // 移除所有標籤和內容的 active 類別
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // 添加 active 類別到選中的標籤和內容
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`${tabId}-content`).classList.add('active');
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 標籤切換
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      activateTab(tabId);
    });
  });

  // 範例按鈕點擊事件
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      input.value = text;

      if (tokenizer) {
        convertBtn.click();
      }
    });
  });

  // 範例文本
  const examples = [
    "私は東京に住んでいます。",
    "お久しぶりです。",
    "日本語を勉強しています。"
  ];

  // 點擊輸入框時，如果為空，顯示範例
  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      input.placeholder = examples[Math.floor(Math.random() * examples.length)];
    }
  });

  // 失去焦點時恢復原始提示
  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      input.placeholder = "在此貼上日文文章...";
    }
  });

  // 載入詞典
  initKuromoji();
});