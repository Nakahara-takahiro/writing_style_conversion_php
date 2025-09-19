// プルダウンで例文を挿入
document.getElementById("exampleSelect").addEventListener("change", function() {
    const textArea = document.getElementById("inputText");
    if (this.value !== "") {
        textArea.value = this.value;
    }
});

// 自動リサイズ機能（改良版）
function autoResize(textarea) {
  if (!textarea) return;

  // 高さをリセット
  textarea.style.height = "auto";
  // スクロール高さに合わせて調整（パディング分を考慮）
  const newHeight = Math.max(textarea.scrollHeight, 120);
  textarea.style.height = newHeight + "px";

  // デバッグログ（本番環境では削除）
  console.log(
    `Resizing ${textarea.id}: scrollHeight=${textarea.scrollHeight}, newHeight=${newHeight}`
  );
}

// 文字数カウント機能
document.addEventListener("DOMContentLoaded", function () {
  const inputText = document.getElementById("inputText");
  const resultText = document.getElementById("resultText");
  const charCount = document.getElementById("charCount");

  // 文字数カウント更新
  function updateCharCount() {
    if (inputText && charCount) {
      const count = inputText.value.length;
      charCount.textContent = count + "/1000字";

      // 1000字を超えた場合の警告表示
      if (count > 1000) {
        charCount.style.color = "#d32f2f";
        charCount.style.fontWeight = "bold";
      } else if (count > 900) {
        charCount.style.color = "#ff9800";
        charCount.style.fontWeight = "bold";
      } else {
        charCount.style.color = "#666";
        charCount.style.fontWeight = "normal";
      }
    }
  }

  // 入力テキストエリアの処理
  if (inputText) {
    // 初期設定
    inputText.classList.add("auto-resize");
    updateCharCount();
    autoResize(inputText);

    // イベントリスナー
    inputText.addEventListener("input", function () {
      updateCharCount();
      autoResize(this);
    });

    inputText.addEventListener("paste", function () {
      // ペースト後に処理を実行
      setTimeout(() => {
        updateCharCount();
        autoResize(this);
      }, 10);
    });
  }

  // 結果テキストエリアの処理（修正版）
  if (resultText) {
    resultText.classList.add("auto-resize");

    // 初期リサイズを複数回実行（コンテンツが読み込まれるまで待機）
    const initialResize = () => {
      autoResize(resultText);
    };

    // 即座に実行
    initialResize();

    // 少し遅れて再実行（DOMが完全に描画された後）
    setTimeout(initialResize, 50);
    setTimeout(initialResize, 200);
    setTimeout(initialResize, 500);

    // MutationObserverは残すが、より確実な方法を併用
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData"
        ) {
          setTimeout(() => autoResize(resultText), 10);
        }
      });
    });

    observer.observe(resultText, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // 追加：フォーカスやクリック時にもリサイズを実行
    resultText.addEventListener("focus", function () {
      setTimeout(() => autoResize(this), 10);
    });

    resultText.addEventListener("click", function () {
      setTimeout(() => autoResize(this), 10);
    });
  }

  // ページ読み込み完了後に全てのテキストエリアをリサイズ
  window.addEventListener("load", function () {
    setTimeout(() => {
      if (inputText) autoResize(inputText);
      if (resultText) autoResize(resultText);
    }, 100);
  });

  // ウィンドウリサイズ時にもテキストエリアをリサイズ
  window.addEventListener("resize", function () {
    setTimeout(() => {
      if (inputText) autoResize(inputText);
      if (resultText) autoResize(resultText);
    }, 100);
  });

  // ボタンイベントリスナーを手動で設定（最後に追加）
  const copyButton = document.querySelector(
    'button[onclick="copyToClipboard()"]'
  );
  const clearButton = document.querySelector('button[onclick="clearAll()"]');

  if (copyButton) {
    // 既存のonclick属性を削除
    copyButton.removeAttribute("onclick");
    // 新しいイベントリスナーを追加
    copyButton.addEventListener("click", function (e) {
      e.preventDefault();
      copyToClipboard();
    });
  }

  if (clearButton) {
    // 既存のonclick属性を削除
    clearButton.removeAttribute("onclick");
    // 新しいイベントリスナーを追加
    clearButton.addEventListener("click", function (e) {
      e.preventDefault();
      clearAll();
    });
  }
});

// コピー機能（修正版）
function copyToClipboard() {
  const resultText = document.getElementById("resultText");
  if (!resultText) {
    console.error("結果テキストエリアが見つかりません");
    return;
  }

  if (!resultText.value.trim()) {
    if (typeof showMessage === "function") {
      showMessage("コピーする内容がありません", "error");
    }
    return;
  }

  // テキストエリアを選択
  resultText.select();
  resultText.setSelectionRange(0, 99999); // モバイル対応

  try {
    // クリップボードにコピー
    const successful = document.execCommand("copy");
    if (successful) {
      // 成功メッセージを表示
      if (typeof showMessage === "function") {
        showMessage("コピーしました！", "success");
      }
    } else {
      throw new Error("Copy command failed");
    }
  } catch (err) {
    // モダンブラウザのnavigator.clipboard API を試す
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(resultText.value)
        .then(function () {
          if (typeof showMessage === "function") {
            showMessage("コピーしました！", "success");
          }
        })
        .catch(function (err) {
          console.error("Failed to copy: ", err);
          if (typeof showMessage === "function") {
            showMessage("コピーに失敗しました", "error");
          }
        });
    } else {
      if (typeof showMessage === "function") {
        showMessage("コピーに失敗しました", "error");
      }
    }
  }

  // 選択を解除
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
}

// メッセージ表示機能
function showMessage(message, type = "info") {
  // 既存のメッセージを削除
  const existingMessage = document.querySelector(".temp-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  // メッセージ要素を作成
  const messageDiv = document.createElement("div");
  messageDiv.className = `temp-message temp-message-${type}`;
  messageDiv.textContent = message;

  // スタイルを設定
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

  // タイプに応じた背景色
  switch (type) {
    case "success":
      messageDiv.style.backgroundColor = "#4caf50";
      break;
    case "error":
      messageDiv.style.backgroundColor = "#f44336";
      break;
    default:
      messageDiv.style.backgroundColor = "#2196f3";
  }

  // DOMに追加
  document.body.appendChild(messageDiv);

  // アニメーション表示
  requestAnimationFrame(() => {
    messageDiv.style.opacity = "1";
    messageDiv.style.transform = "translateY(0)";
  });

  // 3秒後に削除
  setTimeout(() => {
    messageDiv.style.opacity = "0";
    messageDiv.style.transform = "translateY(-10px)";
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
}

// すべて消去機能（修正版）
function clearAll() {
  const inputText = document.getElementById("inputText");
  const resultText = document.getElementById("resultText");
  const charCount = document.getElementById("charCount");
  const radioButtons = document.querySelectorAll('input[name="style"]');

  if (confirm("すべての入力内容を消去しますか？")) {
    // 入力テキストエリアをクリア
    if (inputText) {
      inputText.value = "";
      // autoResize関数が定義されているかチェック
      if (typeof autoResize === "function") {
        autoResize(inputText);
      }
    }

    // 結果テキストエリアをクリア（存在する場合のみ）
    if (resultText) {
      resultText.value = "";
      if (typeof autoResize === "function") {
        autoResize(resultText);
      }
    }

    // 文字数カウントをリセット
    if (charCount) {
      charCount.textContent = "0/1000字";
      charCount.style.color = "#666";
      charCount.style.fontWeight = "normal";
    }

    // ラジオボタンの選択をクリア
    radioButtons.forEach((radio) => {
      radio.checked = false;
    });

    // 成功メッセージを表示（showMessage関数が定義されている場合）
    if (typeof showMessage === "function") {
      showMessage("すべての入力内容を消去しました", "success");
    }
  }
}

// テスト用関数（デバッグ後削除）
function testFunctions() {
  console.log("copyToClipboard function:", typeof copyToClipboard);
  console.log("clearAll function:", typeof clearAll);
  console.log("autoResize function:", typeof autoResize);
  console.log("showMessage function:", typeof showMessage);
  console.log("resultText element:", document.getElementById("resultText"));
  console.log("inputText element:", document.getElementById("inputText"));
}
