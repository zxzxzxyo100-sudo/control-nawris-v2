<?php
declare(strict_types=1);

/**
 * تحميل الإعدادات من api/.env (إن وُجد) ثم متغيرات البيئة.
 * لا تُكتب بيانات الاتصال داخل الكود مطلقاً.
 */
function env(string $key, ?string $default = null): ?string
{
    static $loaded = false;
    static $vars = [];

    if (!$loaded) {
        $loaded = true;
        $file = __DIR__ . '/.env';
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') continue;
                $pos = strpos($line, '=');
                if ($pos === false) continue;
                $k = trim(substr($line, 0, $pos));
                $v = trim(substr($line, $pos + 1));
                $v = trim($v, "\"'");
                $vars[$k] = $v;
            }
        }
    }

    if (array_key_exists($key, $vars)) return $vars[$key];
    $fromEnv = getenv($key);
    return $fromEnv !== false ? $fromEnv : $default;
}
