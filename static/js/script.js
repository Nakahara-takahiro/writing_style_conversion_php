// 文字数カウント機能
document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const resultText = document.getElementById('resultText');
    const charCount = document.getElementById('charCount');
    
    // 自動リサイズ機能
    function autoResize(textarea) {
        // 高さをリセット
        textarea.style.height = 'auto';
        // スクロール高さに合わせて調整（パディング分を考慮）
        textarea.style.height = Math.max(textarea.scrollHeight, 120) + 'px';
    }
    
    // 文字数カウント更新
    function updateCharCount() {
        if (inputText && charCount) {
            const count = inputText.value.length;
            charCount.textContent = count + '/1000字';
            
            // 1000字を超えた場合の警告表示
            if (count > 1000) {
                charCount.style.color = '#d32f2f';
                charCount.style.fontWeight = 'bold';
            } else if (count > 900) {
                charCount.style.color = '#ff9800';
                charCount.style.fontWeight = 'bold';
            } else {
                charCount.style.color = '#666';
                charCount.style.fontWeight = 'normal';
            }
        }
    }
    
    // 入力テキストエリアの処理
    if (inputText) {
        // 初期設定
        inputText.classList.add('auto-resize');
        updateCharCount();
        autoResize(inputText);
        
        // イベントリスナー
        inputText.addEventListener('input', function() {
            updateCharCount();
            autoResize(this);
        });
        
        inputText.addEventListener('paste', function() {
            // ペースト後に処理を実行
            setTimeout(() => {
                updateCharCount();
                autoResize(this);
            }, 10);
        });
    }
    
    // 結果テキストエリアの処理
    if (resultText) {
        resultText.classList.add('auto-resize');
        autoResize(resultText);
        
        // 結果が動的に変更される場合に備えて
        const observer = new MutationObserver(function() {
            autoResize(resultText);
        });
        
        observer.observe(resultText, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
});

// コピー機能
function copyToClipboard() {
    const resultText = document.getElementById('resultText');
    if (resultText) {
        // テキストエリアを選択
        resultText.select();
        resultText.setSelectionRange(0, 99999); // モバイル対応
        
        try {
            // クリップボードにコピー
            const successful = document.execCommand('copy');
            if (successful) {
                // 成功メッセージを表示
                showMessage('コピーしました！', 'success');
            } else {
                throw new Error('Copy command failed');
            }
        } catch (err) {
            // モダンブラウザのnavigator.clipboard API を試す
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(resultText.value).then(function() {
                    showMessage('コピーしました！', 'success');
                }).catch(function(err) {
                    console.error('Failed to copy: ', err);
                    showMessage('コピーに失敗しました', 'error');
                });
            } else {
                showMessage('コピーに失敗しました', 'error');
            }
        }
        
        // 選択を解除
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }
}

// メッセージ表示機能
function showMessage(message, type = 'info') {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.temp-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // メッセージ要素を作成
    const messageDiv = document.createElement('div');
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
    switch(type) {
        case 'success':
            messageDiv.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#f44336';
            break;
        default:
            messageDiv.style.backgroundColor = '#2196f3';
    }
    
    // DOMに追加
    document.body.appendChild(messageDiv);
    
    // アニメーション表示
    requestAnimationFrame(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    });
    
    // 3秒後に削除
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}
