(() => {
  // ===== 定数 =====
  const MAX_LENGTH = 1000;
  const MIN_HEIGHT = 120;
  const MESSAGE_DURATION = 3000;

  // ===== ユーティリティ =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  //自動リサイズ
  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, MIN_HEIGHT)}px`;
  };

  //入力文字カウント
  const updateCharCount = (input, counter) => {
    if (!input || !counter) return;
    const len = input.value.length;
    counter.textContent = `${len}/${MAX_LENGTH}字`;

    if (len > MAX_LENGTH) {
      counter.style.color = "#d32f2f";
      counter.style.fontWeight = "bold";
    } else if (len > MAX_LENGTH * 0.9) {
      counter.style.color = "#ff9800";
      counter.style.fontWeight = "bold";
    } else {
      counter.style.color = "#666";
      counter.style.fontWeight = "normal";
    }
  };

  //一時メッセージ表示
  const showMessage = (msg, type = "info") => {
    $(".temp-message")?.remove();

    const div = document.createElement("div");
    div.className = `temp-message temp-message-${type}`;
    div.textContent = msg;
    Object.assign(div.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 20px",
      borderRadius: "8px",
      color: "#fff",
      fontWeight: "bold",
      zIndex: 10000,
      opacity: 0,
      transform: "translateY(-10px)",
      transition: "all .3s ease",
      maxWidth: "300px",
      wordWrap: "break-word",
      backgroundColor:
        type === "success" ? "#4caf50" : type === "error" ? "#f44336" : "#2196f3",
    });

    document.body.appendChild(div);

    requestAnimationFrame(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      div.style.opacity = "0";
      div.style.transform = "translateY(-10px)";
      setTimeout(() => div.remove(), 300);
    }, MESSAGE_DURATION);
  };

  // 変換テキストをクリップボードにコピー
  const copyToClipboard = async () => {
    const result = $("#resultText");
    if (!result || !result.value.trim()) {
      showMessage("コピーする内容がありません", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(result.value);
      showMessage("コピーしました！", "success");
    } catch {
      // フォールバック
      result.select();
      result.setSelectionRange(0, 99999);
      if (document.execCommand("copy")) {
        showMessage("コピーしました！", "success");
      } else {
        showMessage("コピーに失敗しました", "error");
      }
      window.getSelection()?.removeAllRanges();
    }
  };

  //入力クリア
  const clearInputText = () => {
    const input = $("#inputText");
    if (!input) return;
    input.value = "";
    updateCharCount(input, $("#charCount"));
    autoResize(input);
  };

  //全クリア
  const clearAll = () => {
    if (!confirm("すべての入力内容を消去しますか？")) return;

    ["#inputText", "#resultText"].forEach((sel) => {
      const el = $(sel);
      if (el) {
        el.value = "";
        autoResize(el);
      }
    });

    const count = $("#charCount");
    if (count) {
      count.textContent = `0/${MAX_LENGTH}字`;
      count.style.color = "#666";
      count.style.fontWeight = "normal";
    }

    $$('input[name="style"]').forEach((r) => (r.checked = false));
    showMessage("すべての入力内容を消去しました", "success");
  };

  // ===== 初期化 =====
  document.addEventListener("DOMContentLoaded", () => {
    const input = $("#inputText");
    const result = $("#resultText");
    const count = $("#charCount");

    // 例文プルダウン
    $("#exampleSelect")?.addEventListener("change", (e) => {
      if (e.target.value) input.value = e.target.value;
      updateCharCount(input, count);
      autoResize(input);
    });

    // 入力欄
    if (input) {
      input.classList.add("auto-resize");
      updateCharCount(input, count);
      autoResize(input);

      ["input", "paste"].forEach((ev) =>
        input.addEventListener(ev, () =>
          setTimeout(() => {
            updateCharCount(input, count);
            autoResize(input);
          }, 10)
        )
      );
    }

    // 結果欄
    if (result) {
      result.classList.add("auto-resize");
      ["", 50, 200, 500].forEach((t) => setTimeout(() => autoResize(result), t));

      const obs = new MutationObserver(() => setTimeout(() => autoResize(result), 10));
      obs.observe(result, { childList: true, subtree: true, characterData: true });

      ["focus", "click"].forEach((ev) =>
        result.addEventListener(ev, () => setTimeout(() => autoResize(result), 10))
      );
    }

    // ウィンドウイベント
    ["load", "resize"].forEach((ev) =>
      window.addEventListener(ev, () => [input, result].forEach(autoResize))
    );

    // ボタン
    $("#clearInputBtn")?.addEventListener("click", clearInputText);
    $("#copyBtn")?.addEventListener("click", copyToClipboard);
    $("#clearAllBtn")?.addEventListener("click", clearAll);
  });
})();
