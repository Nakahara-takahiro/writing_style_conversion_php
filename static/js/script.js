// 文字数カウント（全角1000字制限）
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("inputText");
  const counter = document.getElementById("charCount");

  if (textarea && counter) {
    textarea.addEventListener("input", () => {
      const length = [...textarea.value].length; // サロゲートペア対応
      counter.textContent = `${length}/1000字`;

      if (length > 1000) {
        counter.style.color = "red";
        textarea.value = [...textarea.value].slice(0, 1000).join(""); // 強制切り捨て
      } else {
        counter.style.color = "#666";
      }
    });
  }
});

// コピー機能
function copyToClipboard() {
  const textarea = document.getElementById("resultText");
  textarea.select();
  document.execCommand("copy");
  alert("コピーしました！");
}
