<?php
session_start();

// ファイルパスの設定（ドキュメントルート外の設定ファイルを読み込み）
require_once dirname(__DIR__, 2) . '/config/dotenv_wsc.php';
loadEnv(dirname(__DIR__, 2) . '/config/.env');

// セキュリティヘッダーの設定
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\';');
header('Referrer-Policy: strict-origin-when-cross-origin');

// APIキーの取得と検証
$api_key = getenv('API_KEY');
if (!$api_key) {
    error_log('API_KEY not found in environment variables');
    die('システム設定エラー');
}

$resultText = '';
$errorMessage = '';

// POSTが空ならフォーム初期化（リロードでエラーにならないようにする）
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    $_POST = [];
}

// 許可されたスタイルのホワイトリスト
$allowedStyles = [
    '営業メール',
    'プレスリリース',
    'インフルエンサー',
    '戦国武将',
    'LINE公式アカウントのメッセージ',
    'ライトノベル',
    'ホラー小説'
];

// レート制限機能（IPベース + セッションベース）
function checkRateLimit()
{
    $maxRequests = 10; // 10分間の最大リクエスト数
    $timeWindow = 600; // 10分
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // セッションベースの制限
    if (!isset($_SESSION['requests'])) {
        $_SESSION['requests'] = [];
    }

    // IPベースの制限（簡易版 - 本格運用時はRedisやDBを推奨）
    $tempFile = sys_get_temp_dir() . '/rate_limit_' . md5($clientIp);
    $ipRequests = [];
    if (file_exists($tempFile)) {
        $ipRequests = json_decode(file_get_contents($tempFile), true) ?? [];
    }

    $now = time();

    // 古いリクエストを削除
    $_SESSION['requests'] = array_filter($_SESSION['requests'], function ($time) use ($now, $timeWindow) {
        return ($now - $time) < $timeWindow;
    });

    $ipRequests = array_filter($ipRequests, function ($time) use ($now, $timeWindow) {
        return ($now - $time) < $timeWindow;
    });

    // 制限チェック
    if (count($_SESSION['requests']) >= $maxRequests || count($ipRequests) >= $maxRequests) {
        return false;
    }

    // リクエスト記録
    $_SESSION['requests'][] = $now;
    $ipRequests[] = $now;
    file_put_contents($tempFile, json_encode($ipRequests));

    return true;
}

// CSRFトークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 入力値サニタイズ関数
function sanitizeInput($input)
{
    return trim(htmlspecialchars($input, ENT_QUOTES, 'UTF-8'));
}

// 入力値検証関数
function validateText($text)
{
    if ($text === '') {
        return "文章を入力してください。";
    }
    if (mb_strlen($text, 'UTF-8') > 1000) {
        return "入力は1000字以内にしてください。";
    }
    // 危険な文字列のチェック
    $dangerousPatterns = [
        '/<script/i',
        '/javascript:/i',
        '/on\w+\s*=/i',
        '/eval\s*\(/i'
    ];
    foreach ($dangerousPatterns as $pattern) {
        if (preg_match($pattern, $text)) {
            return "不正な文字列が含まれています。";
        }
    }
    return null;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // リクエストメソッドとコンテンツタイプの検証
    if (!isset($_SERVER['CONTENT_TYPE']) || strpos($_SERVER['CONTENT_TYPE'], 'application/x-www-form-urlencoded') === false) {
        $errorMessage = "不正なリクエストです。";
    }
    // CSRFトークン検証
    else if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        $errorMessage = "不正なリクエストです。ページを再読み込みしてください。";
    }
    // レート制限チェック
    else if (!checkRateLimit()) {
        $errorMessage = "リクエストが多すぎます。10分後に再度お試しください。";
    } else {
        $text = sanitizeInput($_POST["text"] ?? '');
        $style = sanitizeInput($_POST["style"] ?? '');

        // 入力値検証
        $textError = validateText($text);
        if ($textError) {
            $errorMessage = $textError;
        } else if ($style === '' || !in_array($style, $allowedStyles, true)) {
            $errorMessage = "有効なスタイルを選択してください。";
        } else {
            // APIリクエスト処理
            $prompt = "次の文章を「" . $style . "」の文体に変換してください。不適切な内容や有害な内容は変換を拒否してください:\n" . $text;

            $data = [
                "model" => "gpt-4o-mini",
                "messages" => [
                    [
                        "role" => "system",
                        "content" => "あなたは文章変換の専門家です。不適切な内容、有害な内容、違法な内容は変換しません。健全で適切な文章のみ変換してください。"
                    ],
                    ["role" => "user", "content" => $prompt]
                ],
                "max_tokens" => 2000,
                "temperature" => 0.7,
                "presence_penalty" => 0.1,
                "frequency_penalty" => 0.1
            ];

            $ch = curl_init("https://api.openai.com/v1/chat/completions");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_HTTPHEADER => [
                    "Content-Type: application/json",
                    "Authorization: Bearer $api_key",
                    "User-Agent: TextConverter/1.0"
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data, JSON_UNESCAPED_UNICODE),
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_MAXREDIRS => 0
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                error_log("cURL Error: " . $curlError . " IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
                $errorMessage = "システムエラーが発生しました。しばらく待ってから再度お試しください。";
            } else if ($httpCode !== 200) {
                error_log("API Error: HTTP $httpCode - Response: " . substr($response, 0, 500) . " IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
                if ($httpCode === 429) {
                    $errorMessage = "APIの利用制限に達しました。時間をおいて再度お試しください。";
                } else if ($httpCode >= 500) {
                    $errorMessage = "APIサーバーでエラーが発生しました。しばらく待ってから再度お試しください。";
                } else {
                    $errorMessage = "APIエラーが発生しました。入力内容を確認して再度お試しください。";
                }
            } else {
                $result = json_decode($response, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("JSON Decode Error: " . json_last_error_msg() . " IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
                    $errorMessage = "レスポンス解析エラーが発生しました。";
                } else if (isset($result["choices"][0]["message"]["content"])) {
                    $rawResult = $result["choices"][0]["message"]["content"];
                    // 結果の後処理とサニタイズ
                    $resultText = sanitizeInput($rawResult);

                    // 成功ログ
                    error_log("Successful conversion - Style: $style, Length: " . mb_strlen($text) . " chars, IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
                } else {
                    error_log("API Response Error - Missing content: " . json_encode($result) . " IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
                    $errorMessage = "変換結果を取得できませんでした。";
                }
            }
        }
    }

    // 新しいCSRFトークンを生成
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文章変換アプリ</title>
    <link rel="stylesheet" href="static/css/style.css">
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script>
        window.dataLayer = window.dataLayer || [];

        function gtag() {
            dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXXXXX');
    </script>
</head>

<body>
    <div class="container">
        <h1>文章変換アプリ</h1>
<p><a href="https://koto-ictclub.net/">制作:光都ICTクラブ</a></p>
        <?php if ($errorMessage !== ''): ?>
            <div class="error-box" style="color: #d32f2f; padding: 12px; margin: 15px 0; border: 1px solid #d32f2f; border-radius: 4px; background-color: #ffeaea;">
                <strong>エラー:</strong> <?= $errorMessage ?>
            </div>
        <?php endif; ?>

        <form method="post" class="form-box" enctype="application/x-www-form-urlencoded">
            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">

            <h2>文章を入力してください（最大1000字）</h2>
            <div class="textarea-wrapper">
                <textarea id="inputText" name="text" cols="50" maxlength="1000"
                    placeholder="ここに文章を入力してください..."
                    required
                    autocomplete="off"><?= isset($_POST["text"]) ? sanitizeInput($_POST["text"]) : '' ?></textarea>
                <div id="charCount" class="char-count">0/1000字</div>
            </div>
        <!-- 🔹 例文プルダウン -->
        <label for="exampleSelect">例文を選択:</label>
        <select id="exampleSelect">
            <option value="">--選択してください--</option>
            <option value="これはサンプル文1です。">サンプル文1</option>
            <option value="これはサンプル文2です。">サンプル文2</option>
        </select>
            <div class="radio-group">
                <h3>変換スタイルを選択:</h3>
                <div class="radio-grid">
                    <?php foreach ($allowedStyles as $styleOption): ?>
                        <label class="radio-item">
                            <input type="radio" name="style" value="<?= htmlspecialchars($styleOption, ENT_QUOTES, 'UTF-8') ?>"
                                required
                                <?= (isset($_POST["style"]) && $_POST["style"] === $styleOption) ? 'checked' : '' ?>>
                            <span><?= htmlspecialchars($styleOption, ENT_QUOTES, 'UTF-8') ?></span>
                        </label>
                    <?php endforeach; ?>
                </div>
            </div>

            <button type="submit" class="btn">変換する</button>
        </form>

        <?php if ($resultText !== ''): ?>
            <div class="result-box">
                <h2>変換結果</h2>
                <textarea id="resultText" readonly><?= $resultText ?></textarea><br>
                <button type="button" class="btn secondary" onclick="copyToClipboard()">コピーする</button>
                <button type="button" class="btn secondary" onclick="clearAll()">すべて消去</button>
            </div>
        <?php endif; ?>
    </div>

    <script src="static/js/script.js"></script>
</body>

</html>