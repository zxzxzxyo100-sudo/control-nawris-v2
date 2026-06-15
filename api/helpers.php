<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

/** ترويسات CORS موحّدة + معالجة طلب OPTIONS المسبق. */
function send_cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** استجابة JSON موحّدة ثم إنهاء التنفيذ. */
function json_out($payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** قراءة جسم الطلب JSON كمصفوفة. */
function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** إنشاء/تحقق توكن جلسة بسيط موقّع (HMAC) — يعمل على الاستضافة المشتركة بلا حالة. */
function make_token(array $claims, int $ttlSeconds = 86400): string
{
    $claims['exp'] = time() + $ttlSeconds;
    $payload = base64_encode(json_encode($claims, JSON_UNESCAPED_UNICODE));
    $sig = hash_hmac('sha256', $payload, env('APP_SECRET', 'change-me'));
    return $payload . '.' . $sig;
}

/** يُرجع claims التوكن إن كان صالحاً وغير منتهٍ، وإلا null. */
function verify_token(?string $token): ?array
{
    if (!$token || strpos($token, '.') === false) return null;
    [$payload, $sig] = explode('.', $token, 2);
    $expected = hash_hmac('sha256', $payload, env('APP_SECRET', 'change-me'));
    if (!hash_equals($expected, $sig)) return null;
    $claims = json_decode(base64_decode($payload), true);
    if (!is_array($claims) || ($claims['exp'] ?? 0) < time()) return null;
    return $claims;
}

/** يستخرج التوكن من ترويسة الطلب. */
function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_X_AUTH_TOKEN']
        ?? trim(str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    return $h !== '' ? $h : null;
}

/** يفرض وجود مستخدم مسجّل دخول، ويُرجع claims أو يوقف بـ 401. */
function require_auth(): array
{
    $claims = verify_token(bearer_token());
    if (!$claims) json_out(['error' => 'غير مصرّح — سجّل الدخول'], 401);
    return $claims;
}
