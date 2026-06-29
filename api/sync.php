<?php
declare(strict_types=1);

/**
 * مزامنة الطرود المتأخرة من backoffice الخارجي إلى جدول shipments.
 *
 * المصدر: GET https://backoffice.nawris.algoriza.com/external-api/orders/delayed/with-captain
 * المصادقة: هيدر  X-API-KEY: <key>
 * الترقيم: بالمؤشر (cursor) — نتابع next_cursor حتى ينتهي.
 *
 * التشغيل:
 *   1) من سطر الأوامر (للـ Cron):   php /path/to/api/sync.php
 *   2) عبر المتصفح/curl بمفتاح حماية:  /api/sync.php?key=SYNC_SECRET
 *
 * إعدادات .env المطلوبة:
 *   NAWRIS_API_URL      = https://backoffice.nawris.algoriza.com/external-api/orders/delayed/with-captain
 *   NAWRIS_API_KEY      = <مفتاح X-API-KEY الخاص بك>
 *   NAWRIS_API_PER_PAGE = 500            (اختياري)
 *   NAWRIS_API_DELAY    = 2              (اختياري — فلتر أيام التأخير؛ اتركه فارغاً لجلب الكل)
 *   SYNC_SECRET         = <سلسلة عشوائية> (تُطلب فقط عند التشغيل عبر المتصفح)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// ── حماية التشغيل ────────────────────────────────────────────────────────────
$isCli = (PHP_SAPI === 'cli');
if (!$isCli) {
    header('Content-Type: application/json; charset=utf-8');
    $secret = env('SYNC_SECRET', '');
    if ($secret === '' || ($_GET['key'] ?? '') !== $secret) {
        http_response_code(403);
        echo json_encode(['error' => 'غير مصرّح — مفتاح المزامنة مطلوب'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ── الإعدادات ────────────────────────────────────────────────────────────────
$apiUrl  = env('NAWRIS_API_URL', 'https://backoffice.nawris.algoriza.com/external-api/orders/delayed/with-captain');
$apiKey  = env('NAWRIS_API_KEY', '');
$perPage = (int) (env('NAWRIS_API_PER_PAGE', '500'));
$delay   = env('NAWRIS_API_DELAY', '');               // فارغ = بلا فلتر
if ($perPage < 1 || $perPage > 500) $perPage = 500;

if ($apiKey === '') {
    out(['error' => 'NAWRIS_API_KEY غير مضبوط في api/.env'], 500, $isCli);
}

// ── تحويل الحالة العربية إلى حالة النظام ─────────────────────────────────────
const STATUS_MAP = [
    'مع المندوب'        => 'with_driver',
    'مؤجلة مع المندوب'  => 'with_driver',
    'مرتجع'             => 'returned',
    'مرتجع مع المندوب'  => 'returned',
    'في الشركة'         => 'in_company',
    'تم التسليم'        => 'delivered',
    'محول'              => 'transferred',
];

function map_status(?string $raw): string
{
    $raw = trim((string) $raw);
    return STATUS_MAP[$raw] ?? 'with_driver';
}

// ── ذاكرة مؤقتة لربط المناديب (اسم → id) لتفادي تكرار الاستعلام ───────────────
$driverCache = [];

function resolve_driver_id(PDO $pdo, ?string $name, ?string $branch): ?int
{
    global $driverCache;
    $name = trim((string) $name);
    if ($name === '') return null;
    if (isset($driverCache[$name])) return $driverCache[$name];

    $st = $pdo->prepare('SELECT id FROM drivers WHERE name = ? LIMIT 1');
    $st->execute([$name]);
    $id = $st->fetchColumn();

    if ($id === false) {
        $ins = $pdo->prepare('INSERT INTO drivers (name, branch_name) VALUES (?, ?)');
        $ins->execute([$name, trim((string) $branch) ?: null]);
        $id = (int) $pdo->lastInsertId();
    }
    $driverCache[$name] = (int) $id;
    return (int) $id;
}

// ── طلب HTTP واحد للـ API ────────────────────────────────────────────────────
function fetch_page(string $url, string $apiKey, array $params): array
{
    $full = $url . '?' . http_build_query(array_filter($params, fn($v) => $v !== '' && $v !== null));
    $ch = curl_init($full);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => [
            'X-API-KEY: ' . $apiKey,
            'Accept: application/json',
        ],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        throw new RuntimeException("فشل الاتصال بالـ API: $err");
    }
    if ($code < 200 || $code >= 300) {
        throw new RuntimeException("الـ API أرجع رمز $code: " . substr((string) $body, 0, 300));
    }
    $json = json_decode((string) $body, true);
    if (!is_array($json)) {
        throw new RuntimeException('رد الـ API ليس JSON صالحاً');
    }
    return $json;
}

// ── جملة الإدراج/التحديث (upsert) على tracking_code ──────────────────────────
function upsert_stmt(PDO $pdo): PDOStatement
{
    $sql = "INSERT INTO shipments
              (tracking_code, customer_name, customer_phone, driver_id,
               branch_name, region_name, status, delay_days,
               api_source, external_id, upload_date)
            VALUES
              (:tracking_code, :customer_name, :customer_phone, :driver_id,
               :branch_name, :region_name, :status, :delay_days,
               :api_source, :external_id, :upload_date)
            ON DUPLICATE KEY UPDATE
               customer_name  = VALUES(customer_name),
               customer_phone = VALUES(customer_phone),
               driver_id      = VALUES(driver_id),
               branch_name    = VALUES(branch_name),
               region_name    = VALUES(region_name),
               status         = VALUES(status),
               delay_days     = VALUES(delay_days),
               api_source     = VALUES(api_source),
               external_id    = VALUES(external_id)";
    return $pdo->prepare($sql);
}

// ── الحلقة الرئيسية ──────────────────────────────────────────────────────────
$pdo   = db();
$stmt  = upsert_stmt($pdo);
$today = date('Y-m-d');

$cursor      = null;
$pages       = 0;
$seen        = 0;
$upserted    = 0;
$skipped     = 0;
$statusCount = [];
$maxPages    = 200; // حاجز أمان ضد الحلقة اللانهائية

try {
    do {
        $json = fetch_page($apiUrl, $apiKey, [
            'per_page'   => $perPage,
            'delay_days' => $delay,
            'cursor'     => $cursor,
        ]);

        $rows = $json['data'] ?? [];
        $pages++;

        $pdo->beginTransaction();
        foreach ($rows as $r) {
            $seen++;
            $code = trim((string) ($r['code'] ?? ''));
            if ($code === '') { $skipped++; continue; }

            $status = map_status($r['status'] ?? '');
            $statusCount[$status] = ($statusCount[$status] ?? 0) + 1;

            $branch = $r['current_branch'] ?? null;
            $driverId = resolve_driver_id($pdo, $r['captain'] ?? null, $branch);

            $phone = preg_replace('/\D/', '', (string) ($r['receiver_phone'] ?? ''));

            $stmt->execute([
                ':tracking_code'  => $code,
                ':customer_name'  => trim((string) ($r['receiver_name'] ?? '')) ?: null,
                ':customer_phone' => $phone ?: null,
                ':driver_id'      => $driverId,
                ':branch_name'    => trim((string) ($branch ?? '')) ?: null,
                ':region_name'    => trim((string) ($r['government'] ?? '')) ?: null,
                ':status'         => $status,
                ':delay_days'     => (int) ($r['delay_days'] ?? 0),
                ':api_source'     => 'nawris_backoffice',
                ':external_id'    => $code,
                ':upload_date'    => $today,
            ]);
            $upserted++;
        }
        $pdo->commit();

        $cursor = $json['next_cursor'] ?? null;
    } while ($cursor && $pages < $maxPages);

} catch (\Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    out([
        'error'    => 'فشلت المزامنة',
        'detail'   => $e->getMessage(),
        'progress' => compact('pages', 'seen', 'upserted', 'skipped'),
    ], 500, $isCli);
}

out([
    'success'    => true,
    'synced_at'  => date('c'),
    'pages'      => $pages,
    'seen'       => $seen,
    'upserted'   => $upserted,
    'skipped'    => $skipped,
    'by_status'  => $statusCount,
], 200, $isCli);

// ── إخراج موحّد (CLI أو HTTP) ────────────────────────────────────────────────
function out(array $payload, int $status, bool $isCli): void
{
    if ($isCli) {
        fwrite(STDOUT, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
        exit($status >= 400 ? 1 : 0);
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
