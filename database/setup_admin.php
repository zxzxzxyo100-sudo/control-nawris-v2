<?php
declare(strict_types=1);

/**
 * سكربت إعداد لمرة واحدة — ينشئ أول مستخدم مدير بكلمة مرور مجزّأة (bcrypt).
 * شغّله من المتصفح:  https://موقعك/database/setup_admin.php?key=SETUP_KEY
 * ثم احذف الملف فوراً بعد نجاحه.
 *
 * عدّل القيم التالية قبل التشغيل:
 */
const SETUP_KEY      = 'CHANGE_THIS_SETUP_KEY'; // مفتاح حماية مؤقت
const ADMIN_USERNAME = 'admin';
const ADMIN_NAME     = 'المدير';
const ADMIN_PASSWORD = 'admin123';              // غيّرها بعد أول دخول

require_once __DIR__ . '/../api/db.php';

header('Content-Type: text/plain; charset=utf-8');

if (($_GET['key'] ?? '') !== SETUP_KEY) {
    http_response_code(403);
    exit("مرفوض: مفتاح الإعداد غير صحيح.\n");
}

$hash = password_hash(ADMIN_PASSWORD, PASSWORD_DEFAULT);

$st = db()->prepare(
    'INSERT INTO users (username, name, password_hash, role, status)
     VALUES (?, ?, ?, "admin", "active")
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash),
                             role = "admin", status = "active"'
);
$st->execute([ADMIN_USERNAME, ADMIN_NAME, $hash]);

echo "تم إنشاء/تحديث المدير بنجاح:\n";
echo "  المستخدم: " . ADMIN_USERNAME . "\n";
echo "  كلمة المرور: " . ADMIN_PASSWORD . "\n\n";
echo "⚠️ احذف هذا الملف الآن، وغيّر كلمة المرور بعد أول دخول.\n";
