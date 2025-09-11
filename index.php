<?php
require_once __DIR__ . '/dotenv.php';
loadEnv(__DIR__ . '/.env');

$api_key = getenv('API_KEY');
$resultText = '';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $text = trim($_POST["text"] ?? '');
    $style = trim($_POST["style"] ?? '');

    if ($text !== '' && $style !== '') {
        // 1000字制限サーバー側でもチェック
        if (mb_strlen($text, 'UTF-8') > 1000) {
            $resultText = "入力は1000字以内にしてください。";
        } else {
            $prompt = "次の文章を「" . $style . "」の文体に変換してください:\n" . $text;

            $data = [
                "model" => "gpt-4.1-mini",
                "messages" => [
                    ["role" => "system", "content" => "あなたは文章変換の専門家です。"],
                    ["role" => "user", "content" => $prompt]
                ]
            ];

            $ch = curl_init("https://api.openai.com/v1/chat/completions");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    "Content-Type: application/json",
                    "Authorization: Bearer $api_key"
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data, JSON_UNESCAPED_UNICODE)
            ]);

            $response = curl_exec($ch);
            curl_close($ch);

            $result = json_decode($response, true);
            if (isset($result["choices"][0]["message"]["content"])) {
                $resultText = $result["choices"][0]["message"]["content"];
            } else {
                $resultText = "エラーが発生しました。再度お試しください。";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <title>文章変換アプリ</title>
    <link rel="stylesheet" href="static/css/style.css">
</head>

<body>
    <div class="container">
        <h1>文章変換アプリ</h1>

        <form method="post" class="form-box">
            <h2>文章を入力してください（最大1000字）</h2>
            <div class="textarea-wrapper">
                <textarea id="inputText" name="text" rows="5" cols="40" maxlength="2000"
                    placeholder="ここに文章を入力してください..." required><?=
                                                                isset($_POST["text"]) ? htmlspecialchars($_POST["text"], ENT_QUOTES, 'UTF-8') : ''
                                                                ?></textarea>
                <div id="charCount" class="char-count">0/1000字</div>
            </div>
            <div class="radio-group">
                <label><input type="radio" name="style" value="営業メール" required <?= (($_POST["style"] ?? '') === '営業メール') ? 'checked' : '' ?>>営業メール</label>
                <label><input type="radio" name="style" value="プレスリリース" <?= (($_POST["style"] ?? '') === '公式文書/プレスリリース') ? 'checked' : '' ?>>公式文書/プレスリリース</label>
                <label><input type="radio" name="style" value="インフルエンサー" <?= (($_POST["style"] ?? '') === 'インフルエンサー') ? 'checked' : '' ?>>インフルエンサー</label>
                <label><input type="radio" name="style" value="戦国武将" <?= (($_POST["style"] ?? '') === '戦国武将') ? 'checked' : '' ?>>戦国武将</label>
                <label><input type="radio" name="style" value="LINE公式アカウントのメッセージ" <?= (($_POST["style"] ?? '') === 'LINE公式アカウントのメッセージ') ? 'checked' : '' ?>>LINE公式アカウントのメッセージ</label>
                <label><input type="radio" name="style" value="ライトノベル" <?= (($_POST["style"] ?? '') === 'ライトノベル') ? 'checked' : '' ?>>ライトノベル</label>
                <label><input type="radio" name="style" value="ホラー小説" <?= (($_POST["style"] ?? '') === 'ホラー小説') ? 'checked' : '' ?>>ホラー小説</label>
                       
            </div>

            <button type="submit" class="btn">変換する</button>
        </form>

        <?php if ($resultText !== ''): ?>
            <div class="result-box">
                <h2>変換結果</h2>
                <textarea id="resultText" rows="5" readonly><?= htmlspecialchars($resultText, ENT_QUOTES, 'UTF-8') ?></textarea><br>
                <button type="button" class="btn" onclick="copyToClipboard()">コピーする</button>
            </div>
        <?php endif; ?>
    </div>

    <script src="static/js/script.js"></script>
</body>

</html>