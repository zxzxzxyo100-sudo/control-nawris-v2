<?php
declare(strict_types=1);

/**
 * الموجّه الرئيسي لواجهة nawris API.
 * كل الطلبات تحت /api/ تمرّ من هنا (عبر .htaccess).
 *
 * المسارات:
 *   POST   /api/auth/login            { username, password }      → { token, user }
 *   GET    /api/me                    (توكن)                       → بيانات المستخدم
 *   GET    /api/data/{table}          (توكن) فلاتر عبر query        → صفوف
 *   POST   /api/data/{table}          (توكن) جسم JSON (إدراج/upsert)
 *   PATCH  /api/data/{table}?id=eq.N  (توكن) جسم JSON (تحديث)
 *   DELETE /api/data/{table}?id=eq.N  (توكن)                        → حذف
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

send_cors();

// الجداول المسموح الوصول إليها عبر واجهة data العامة
const ALLOWED_TABLES = [
    'settings', 'shipments', 'contact_results', 'drivers',
    'branches', 'regions', 'stores', 'wa_templates',
    'returns', 'transfers', 'contacted_log',
];

// ── تحديد المسار ───────────────────────────────────────────────────────────
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// كل ما بعد /api/
$path = preg_replace('#^.*/api/#', '', $uri);
$path = trim($path, '/');
$segments = $path === '' ? [] : explode('/', $path);

try {
    // ── تسجيل الدخول ────────────────────────────────────────────────────────
    if ($segments[0] === 'auth' && ($segments[1] ?? '') === 'login' && $method === 'POST') {
        handle_login();
    }

    // ── بيانات المستخدم الحالي ───────────────────────────────────────────────
    if ($segments[0] === 'me' && $method === 'GET') {
        $claims = require_auth();
        json_out(['user' => [
            'username' => $claims['username'] ?? '',
            'name'     => $claims['name'] ?? '',
            'role'     => $claims['role'] ?? '',
        ]]);
    }

    // ── إدارة المستخدمين (للمدير فقط) ────────────────────────────────────────
    if ($segments[0] === 'users') {
        $claims = require_auth();
        if (($claims['role'] ?? '') !== 'admin') {
            json_out(['error' => 'هذه العملية للمدير فقط'], 403);
        }
        handle_users($method);
    }

    // ── واجهة البيانات العامة ────────────────────────────────────────────────
    if ($segments[0] === 'data' && isset($segments[1])) {
        require_auth();
        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $segments[1]);
        if (!in_array($table, ALLOWED_TABLES, true)) {
            json_out(['error' => "جدول غير معروف: $table"], 404);
        }
        handle_data($table, $method);
    }

    json_out(['error' => 'مسار غير معروف'], 404);

} catch (\Throwable $e) {
    json_out(['error' => 'خطأ في الخادم', 'detail' => $e->getMessage()], 500);
}

// ════════════════════════════════════════════════════════════════════════════
// المعالجات
// ════════════════════════════════════════════════════════════════════════════

function handle_login(): void
{
    $body = read_json_body();
    $username = strtolower(trim((string)($body['username'] ?? '')));
    $password = (string)($body['password'] ?? '');
    if ($username === '' || $password === '') {
        json_out(['error' => 'اسم المستخدم وكلمة المرور مطلوبان'], 400);
    }

    $st = db()->prepare('SELECT username, name, role, password_hash, status FROM users WHERE username = ? LIMIT 1');
    $st->execute([$username]);
    $u = $st->fetch();

    if (!$u || !password_verify($password, $u['password_hash'])) {
        json_out(['error' => 'اسم المستخدم أو كلمة المرور غير صحيحة'], 401);
    }
    if (($u['status'] ?? 'active') === 'inactive') {
        json_out(['error' => 'هذا الحساب معطّل — تواصل مع المدير'], 403);
    }

    $token = make_token([
        'username' => $u['username'],
        'name'     => $u['name'],
        'role'     => $u['role'],
    ]);

    json_out(['token' => $token, 'user' => [
        'username' => $u['username'],
        'name'     => $u['name'],
        'role'     => $u['role'],
    ]]);
}

function handle_data(string $table, string $method): void
{
    switch ($method) {
        case 'GET':    data_select($table); break;
        case 'POST':   data_insert($table); break;
        case 'PATCH':  data_update($table); break;
        case 'DELETE': data_delete($table); break;
        default:       json_out(['error' => 'طريقة غير مسموحة'], 405);
    }
}

/** يبني WHERE من معاملات على نمط col=eq.value / gt / lt / like / in. */
function build_filters(array $qp): array
{
    $reserved = ['select', 'limit', 'offset', 'order'];
    $where = [];
    $binds = [];
    foreach ($qp as $rawKey => $rawVal) {
        if (in_array($rawKey, $reserved, true) || !is_string($rawVal)) continue;
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', $rawKey);
        if ($col === '') continue;
        $dot = strpos($rawVal, '.');
        if ($dot === false) continue;
        $op  = substr($rawVal, 0, $dot);
        $val = substr($rawVal, $dot + 1);
        $ph  = ':w_' . $col . '_' . count($binds);
        switch ($op) {
            case 'eq':   $where[] = "`$col` = $ph";  $binds[$ph] = ($val === 'null') ? null : $val; break;
            case 'neq':  $where[] = "`$col` != $ph"; $binds[$ph] = $val; break;
            case 'gt':   $where[] = "`$col` > $ph";  $binds[$ph] = $val; break;
            case 'lt':   $where[] = "`$col` < $ph";  $binds[$ph] = $val; break;
            case 'gte':  $where[] = "`$col` >= $ph"; $binds[$ph] = $val; break;
            case 'lte':  $where[] = "`$col` <= $ph"; $binds[$ph] = $val; break;
            case 'like': $where[] = "`$col` LIKE $ph"; $binds[$ph] = $val; break;
            case 'in':
                $vals = array_filter(array_map('trim', explode(',', trim($val, '()'))));
                $phs = [];
                foreach (array_values($vals) as $i => $v) { $p = $ph . "_$i"; $phs[] = $p; $binds[$p] = $v; }
                if ($phs) $where[] = "`$col` IN (" . implode(', ', $phs) . ')';
                break;
        }
    }
    return [$where, $binds];
}

function safe_columns(string $raw): string
{
    if (trim($raw) === '' || trim($raw) === '*') return '*';
    $cols = array_filter(array_map(
        fn($c) => '`' . preg_replace('/[^a-zA-Z0-9_]/', '', trim($c)) . '`',
        explode(',', $raw)
    ), fn($c) => $c !== '``');
    return $cols ? implode(', ', $cols) : '*';
}

function safe_order(string $raw): string
{
    $parts = array_filter(array_map('trim', explode(',', $raw)));
    $safe = [];
    foreach ($parts as $part) {
        if (preg_match('/^([a-zA-Z0-9_]+)(?:\.(asc|desc))?$/i', $part, $m)) {
            $safe[] = "`{$m[1]}` " . (isset($m[2]) ? strtoupper($m[2]) : 'ASC');
        }
    }
    return $safe ? implode(', ', $safe) : '';
}

function data_select(string $table): void
{
    $qp = $_GET;
    [$where, $binds] = build_filters($qp);
    $whereStr = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $cols   = safe_columns($qp['select'] ?? '*');
    $limit  = min(max((int)($qp['limit'] ?? 1000), 1), 5000);
    $offset = max((int)($qp['offset'] ?? 0), 0);
    $orderStr = !empty($qp['order']) && safe_order($qp['order']) ? 'ORDER BY ' . safe_order($qp['order']) : '';

    $sql = "SELECT $cols FROM `$table` $whereStr $orderStr LIMIT $limit OFFSET $offset";
    $st = db()->prepare($sql);
    $st->execute($binds);
    json_out($st->fetchAll());
}

function data_insert(string $table): void
{
    $body = read_json_body();
    $rows = isset($body[0]) ? $body : [$body];
    $rows = array_values(array_filter($rows, fn($r) => is_array($r) && count($r)));
    if (!$rows) json_out(['success' => true], 201);

    $colNames = array_values(array_filter(array_map(
        fn($c) => preg_replace('/[^a-zA-Z0-9_]/', '', (string)$c),
        array_keys($rows[0])
    )));
    if (!$colNames) json_out(['success' => true], 201);

    $colStr = '`' . implode('`, `', $colNames) . '`';
    $phStr  = ':' . implode(', :', $colNames);
    $updates = implode(', ', array_map(fn($c) => "`$c` = VALUES(`$c`)", $colNames));
    $sql = "INSERT INTO `$table` ($colStr) VALUES ($phStr) ON DUPLICATE KEY UPDATE $updates";

    $pdo = db();
    $st = $pdo->prepare($sql);
    $pdo->beginTransaction();
    try {
        foreach ($rows as $row) {
            $vals = [];
            foreach ($colNames as $c) $vals[$c] = $row[$c] ?? null;
            $st->execute($vals);
        }
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        json_out(['error' => 'فشل الإدراج: ' . $e->getMessage()], 500);
    }
    json_out(['success' => true], 201);
}

function data_update(string $table): void
{
    $body = read_json_body();
    [$where, $filterBinds] = build_filters($_GET);
    if (!$where) json_out(['error' => 'التحديث يتطلب فلتراً واحداً على الأقل'], 400);
    if (!$body)  json_out(['success' => true]);

    $setCols = [];
    $setBinds = [];
    foreach ($body as $col => $val) {
        $c = preg_replace('/[^a-zA-Z0-9_]/', '', (string)$col);
        if ($c === '') continue;
        $ph = ':s_' . $c;
        $setCols[] = "`$c` = $ph";
        $setBinds[$ph] = $val;
    }
    if (!$setCols) json_out(['success' => true]);

    $sql = "UPDATE `$table` SET " . implode(', ', $setCols) . ' WHERE ' . implode(' AND ', $where);
    $st = db()->prepare($sql);
    $st->execute(array_merge($setBinds, $filterBinds));
    json_out(['success' => true]);
}

function data_delete(string $table): void
{
    [$where, $binds] = build_filters($_GET);
    if (!$where) json_out(['error' => 'الحذف يتطلب فلتراً واحداً على الأقل'], 400);
    $sql = "DELETE FROM `$table` WHERE " . implode(' AND ', $where);
    $st = db()->prepare($sql);
    $st->execute($binds);
    json_out(['success' => true]);
}

// ── إدارة المستخدمين ─────────────────────────────────────────────────────────
function handle_users(string $method): void
{
    switch ($method) {
        case 'GET': {
            // لا تُرجع تجزئة كلمة المرور أبداً
            $st = db()->query('SELECT username, name, role, status, created_at FROM users ORDER BY created_at DESC');
            json_out($st->fetchAll());
        }
        case 'POST': {
            // إنشاء أو تحديث مستخدم. كلمة المرور تُجزّأ بـ bcrypt.
            $b = read_json_body();
            $username = strtolower(trim((string)($b['username'] ?? '')));
            $name     = trim((string)($b['name'] ?? ''));
            $role     = trim((string)($b['role'] ?? 'employee'));
            $status   = trim((string)($b['status'] ?? 'active'));
            $password = (string)($b['password'] ?? '');
            if ($username === '' || $name === '') {
                json_out(['error' => 'اسم المستخدم والاسم مطلوبان'], 400);
            }

            // هل المستخدم موجود؟
            $exists = db()->prepare('SELECT username FROM users WHERE username = ?');
            $exists->execute([$username]);
            $isNew = !$exists->fetch();

            if ($isNew) {
                if ($password === '') json_out(['error' => 'كلمة المرور مطلوبة للمستخدم الجديد'], 400);
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $st = db()->prepare(
                    'INSERT INTO users (username, name, password_hash, role, status) VALUES (?, ?, ?, ?, ?)'
                );
                $st->execute([$username, $name, $hash, $role, $status]);
            } else {
                // تحديث — كلمة المرور اختيارية
                if ($password !== '') {
                    $st = db()->prepare('UPDATE users SET name=?, role=?, status=?, password_hash=? WHERE username=?');
                    $st->execute([$name, $role, $status, password_hash($password, PASSWORD_DEFAULT), $username]);
                } else {
                    $st = db()->prepare('UPDATE users SET name=?, role=?, status=? WHERE username=?');
                    $st->execute([$name, $role, $status, $username]);
                }
            }
            json_out(['success' => true]);
        }
        case 'DELETE': {
            $username = strtolower(trim((string)($_GET['username'] ?? '')));
            if ($username === '') json_out(['error' => 'اسم المستخدم مطلوب'], 400);
            if ($username === 'admin') json_out(['error' => 'لا يمكن حذف حساب المدير الرئيسي'], 400);
            $st = db()->prepare('DELETE FROM users WHERE username = ?');
            $st->execute([$username]);
            json_out(['success' => true]);
        }
        default:
            json_out(['error' => 'طريقة غير مسموحة'], 405);
    }
}
