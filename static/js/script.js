(() => {
  // ===== ユーティリティ =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // 自動リサイズ
  function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.max(textarea.scrollHeight, 120);
    textarea.style.height = newHeight + "px";
    // console.log(`[autoResize] ${textarea.id}: ${newHeight}`);
  }

  // 文字数カウント
  function updateCharCount(input, counter) {
    if (!input || !counter) return;
    const count = input.value.length;
    counter.textContent = `${count}/1000字`;
    if (count > 1000) {
      counter.style.color = "#d32f2f";
      counter.style.fontWeight = "bold";
    } else if (count > 900) {
      counter.style.color = "#ff9800";
      counter.style.fontWeight = "bold";
    } else {
      counter.style.color = "#666";
      counter.style.fontWeight = "normal";
    }
  }

  // コピー機能
  function copyToClipboard() {
    const resultText = $("#resultText");
    if (!resultText || !resultText.value.trim()) {
      showMessage?.("コピーする内容がありません", "error");
      return;
    }
    // 旧API
    resultText.select();
    resultText.setSelectionRange(0, 99999);
    try {
      if (document.execCommand("copy")) {
        showMessage?.("コピーしました！", "success");
      }
    } catch {
      // 新API
      navigator.clipboard?.writeText(resultText.value)
        .then(() => showMessage?.("コピーしました！", "success"))
        .catch(() => showMessage?.("コピーに失敗しました", "error"));
    }
    window.getSelection?.().removeAllRanges();
  }

  // 入力クリア
  function clearInputText() {
    const input = $("#inputText");
    input.value = "";
    updateCharCount(input, $("#charCount"));
  }

  // 全クリア
  function clearAll() {
    if (!confirm("すべての入力内容を消去しますか？")) return;
    const input = $("#inputText");
    const result = $("#resultText");
    const count = $("#charCount");

    [input, result].forEach((el) => {
      if (el) {
        el.value = "";
        autoResize(el);
      }
    });

    if (count) {
      count.textContent = "0/1000字";
      count.style.color = "#666";
      count.style.fontWeight = "normal";
    }
    $$('input[name="style"]').forEach((r) => (r.checked = false));
    showMessage?.("すべての入力内容を消去しました", "success");
  }

  // メッセージ表示
  function showMessage(message, type = "info") {
    $(".temp-message")?.remove();
    const div = document.createElement("div");
    div.className = `temp-message temp-message-${type}`;
    div.textContent = message;
    div.style.cssText = `
      position: fixed; top:20px; right:20px; padding:12px 20px;
      border-radius:8px; color:#fff; font-weight:bold; z-index:10000;
      opacity:0; transform:translateY(-10px); transition:all .3s ease;
      max-width:300px; word-wrap:break-word;
    `;
    div.style.backgroundColor =
      type === "success" ? "#4caf50" : type === "error" ? "#f44336" : "#2196f3";
    document.body.appendChild(div);
    requestAnimationFrame(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      div.style.opacity = "0";
      div.style.transform = "translateY(-10px)";
      setTimeout(() => div.remove(), 300);
    }, 3000);
  }

  // ===== 初期化 =====
  document.addEventListener("DOMContentLoaded", () => {
    const input = $("#inputText");
    const result = $("#resultText");
    const count = $("#charCount");

    // プルダウン
    $("#exampleSelect")?.addEventListener("change", (e) => {
      if (e.target.value) input.value = e.target.value;
      updateCharCount(input, count);
      autoResize(input);
    });

    // 入力テキスト
    if (input) {
      input.classList.add("auto-resize");
      updateCharCount(input, count);
      autoResize(input);
      input.addEventListener("input", () => {
        updateCharCount(input, count);
        autoResize(input);
      });
      input.addEventListener("paste", () =>
        setTimeout(() => {
          updateCharCount(input, count);
          autoResize(input);
        }, 10)
      );
    }

    // 結果テキスト
    if (result) {
      result.classList.add("auto-resize");
      ["", 50, 200, 500].forEach((t) =>
        setTimeout(() => autoResize(result), t)
      );
      const obs = new MutationObserver(() =>
        setTimeout(() => autoResize(result), 10)
      );
      obs.observe(result, { childList: true, subtree: true, characterData: true });
      ["focus", "click"].forEach((ev) =>
        result.addEventListener(ev, () =>
          setTimeout(() => autoResize(result), 10)
        )
      );
    }

    // グローバルイベント
    window.addEventListener("load", () => {
      [input, result].forEach((el) => el && autoResize(el));
    });
    window.addEventListener("resize", () => {
      [input, result].forEach((el) => el && autoResize(el));
    });

    // ボタン
    $("#clearInputBtn")?.addEventListener("click", clearInputText);
    $('button[onclick="copyToClipboard()"]')?.addEventListener("click", copyToClipboard);
    $('button[onclick="clearAll()"]')?.addEventListener("click", clearAll);
  });
})();
