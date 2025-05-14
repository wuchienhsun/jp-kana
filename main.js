const input = document.getElementById('input');
const convertBtn = document.getElementById('convert');
const copyBtn = document.getElementById('copy');
const rubyResult = document.getElementById('rubyResult');
const htmlResult = document.getElementById('htmlResult');
const statusEl = document.getElementById('status');

let tokenizer = null;
let loading = false;

function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function isHiragana(char) {
  return /[\u3040-\u309f]/.test(char);
}

function isKatakana(char) {
  return /[\u30a0-\u30ff]/.test(char);
}

function isKanji(char) {
  return /[\u4e00-\u9faf]/.test(char);
}

function isNumber(char) {
  return /[0-90-９一二三四五六七八九十百千万億]/.test(char);
}

function isSpecialSymbol(char) {
  return char === 'ヶ';
}

function processToken(token) {
  if (!token.reading) return token.surface_form;
  
  const surface = token.surface_form;
  const reading = katakanaToHiragana(token.reading);
  
  if (surface.length >= 2) {
    const firstChar = surface.charAt(0);
    const restChars = surface.substring(1);
    
    if (isNumber(firstChar) && restChars.split('').every(isKanji)) {
      const numReadingLength = reading.length - restChars.length;
      if (numReadingLength > 0) {
        const numReading = reading.substring(0, numReadingLength);
        const counterReading = reading.substring(numReadingLength);
        
        return `<ruby>${firstChar}<rt>${numReading}</rt></ruby><ruby>${restChars}<rt>${counterReading}</rt></ruby>`;
      }
    }
  }
  
  if (surface.includes('ヶ月') || surface.includes('ヶ所') || surface.includes('ヶ国')) {
    const kePosition = surface.indexOf('ヶ');
    
    if (kePosition > 0) {
      const prefix = surface.substring(0, kePosition);
      
      const suffix = surface.substring(kePosition + 1);
      
      if (suffix === '月' && reading.endsWith('げつ')) {
        return `${prefix}ヶ<ruby>${suffix}<rt>げつ</rt></ruby>`;
      }
      
      if (suffix === '所' && reading.endsWith('しょ')) {
        return `${prefix}ヶ<ruby>${suffix}<rt>しょ</rt></ruby>`;
      }
      
      if (suffix === '国' && reading.endsWith('こく')) {
        return `${prefix}ヶ<ruby>${suffix}<rt>こく</rt></ruby>`;
      }
      
      if (suffix && isKanji(suffix[0])) {
        const suffixToken = {
          surface_form: suffix,
          reading: reading.substring(prefix.length + 1)
        };
        
        const processedSuffix = processToken(suffixToken);
        
        return prefix + 'ヶ' + processedSuffix;
      }
    }
  }
  
  if (!surface.match(/[\u4e00-\u9faf]/)) {
    return surface;
  }
  
  if (surface.split('').every(char => isKanji(char))) {
    return `<ruby>${surface}<rt>${reading}</rt></ruby>`;
  }
  
  const firstChar = surface.charAt(0);
  if (isKanji(firstChar) && surface.length > 1) {
    let kanjiPart = '';
    let kanaPart = '';
    let i = 0;
    
    while (i < surface.length && isKanji(surface[i])) {
      kanjiPart += surface[i];
      i++;
    }
    
    kanaPart = surface.substring(i);
    
    if (kanjiPart) {
      const kanjiReadingLength = Math.max(0, reading.length - kanaPart.length);
      const kanjiReading = reading.substring(0, kanjiReadingLength);
      
      return `<ruby>${kanjiPart}<rt>${kanjiReading}</rt></ruby>${kanaPart}`;
    }
  }
  
  let result = '';
  let currentKanji = '';
  let readingIndex = 0;
  
  for (let i = 0; i < surface.length; i++) {
    const char = surface[i];
    
    if (isKanji(char)) {
      currentKanji += char;
    } else if (isSpecialSymbol(char)) {
      if (currentKanji) {
        currentKanji += char;
      } else {
        result += char;
      }
    } else {
      if (currentKanji) {
        const remainingReading = reading.substring(readingIndex);
        const estimatedLength = Math.min(
          remainingReading.length,
          currentKanji.length * 2
        );
        const kanjiReading = remainingReading.substring(0, estimatedLength);
        
        result += `<ruby>${currentKanji}<rt>${kanjiReading}</rt></ruby>`;
        readingIndex += estimatedLength;
        currentKanji = '';
      }
      
      if (isHiragana(char) && readingIndex < reading.length && char === reading[readingIndex]) {
        readingIndex++;
      }
      
      result += char;
    }
  }
  
  if (currentKanji) {
    const remainingReading = reading.substring(readingIndex);
    result += `<ruby>${currentKanji}<rt>${remainingReading}</rt></ruby>`;
  }
  
  return result;
}

function initKuromoji() {
  if (typeof kuromoji === 'undefined') {
    showStatus("kuromoji 載入失敗，請重新整理頁面", "error");
    return;
  }
  
  showStatus("載入詞典中...", "loading");
  loading = true;
  
  kuromoji.builder({ dicPath: 'https://unpkg.com/kuromoji@0.1.2/dict/' }).build((err, _tokenizer) => {
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

convertBtn.onclick = function() {
  if (loading || !tokenizer) return;
  
  const text = input.value;
  if (!text.trim()) {
    showStatus("請輸入日文文章", "error");
    return;
  }
  
  showStatus("處理中...", "loading");
  convertBtn.disabled = true;
  
  setTimeout(() => {
    try {
      const paragraphs = text.split(/\n\n+/);
      let html = '';
      
      paragraphs.forEach((paragraph, index) => {
        if (!paragraph.trim()) {
          html += '<br>';
          return;
        }
        
        const lines = paragraph.split(/\n/);
        const processedLines = lines.map(line => {
          if (!line.trim()) return '';
          
          const tokens = tokenizer.tokenize(line);
          return tokens.map(token => processToken(token)).join('');
        });
        
        if (processedLines.length > 0) {
          if (index > 0) html += '<p></p>';
          html += `<p>${processedLines.join('<br>')}</p>`;
        }
      });
      
      const finalHtml = `<div class="js-article-body">\n${html}\n</div>`;
      
      rubyResult.innerHTML = finalHtml;
      htmlResult.textContent = finalHtml;
      copyBtn.disabled = !finalHtml;
      showStatus("轉換完成", "success");
      
      activateTab('preview');
    } catch (e) {
      showStatus("處理錯誤: " + e.message, "error");
    }
    
    convertBtn.disabled = false;
  }, 10);
};

copyBtn.onclick = function() {
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

function activateTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`${tabId}-content`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      activateTab(tabId);
    });
  });

  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      input.value = text;
      
      if (tokenizer) {
        convertBtn.click();
      }
    });
  });
  
  const examples = [
    "私は東京に住んでいます。",
    "お久しぶりです。",
    "日本語を勉強しています。"
  ];
  
  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      input.placeholder = examples[Math.floor(Math.random() * examples.length)];
    }
  });
  
  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      input.placeholder = "在此貼上日文文章...";
    }
  });
  
  initKuromoji();
}); 