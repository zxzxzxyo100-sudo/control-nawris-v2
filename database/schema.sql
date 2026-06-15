-- ══════════════════════════════════════════════════════════════════════════
-- nawris v2 — مخطط قاعدة بيانات نظيف
-- شغّله في phpMyAdmin على قاعدة البيانات الجديدة
-- ══════════════════════════════════════════════════════════════════════════
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── المستخدمون (تسجيل دخول آمن من جهة الخادم) ───────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `username`      VARCHAR(50)  NOT NULL,
  `name`          VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          VARCHAR(50)  NOT NULL DEFAULT 'employee',
  `permissions`   TEXT,
  `status`        VARCHAR(20)  NOT NULL DEFAULT 'active',
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── الإعدادات (مفتاح/قيمة) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── الطرود ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `shipments` (
  `id`                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tracking_code`      VARCHAR(100) NOT NULL,
  `customer_name`      VARCHAR(255),
  `customer_phone`     VARCHAR(50),
  `driver_id`          INT UNSIGNED DEFAULT NULL,
  `branch_name`        VARCHAR(100),
  `responsible_branch` VARCHAR(100),
  `region_name`        VARCHAR(100),
  `status`             VARCHAR(50)  DEFAULT 'with_driver',
  `delay_days`         INT          DEFAULT 0,
  `upload_date`        DATE,
  `api_source`         VARCHAR(50)  DEFAULT 'manual',
  `external_id`        VARCHAR(100),
  `created_at`         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_tracking_code`   (`tracking_code`),
  INDEX      `idx_status`         (`status`),
  INDEX      `idx_status_delay`   (`status`, `delay_days` DESC),
  INDEX      `idx_upload_date`    (`upload_date`),
  INDEX      `idx_branch_name`    (`branch_name`),
  INDEX      `idx_customer_phone` (`customer_phone`),
  INDEX      `idx_driver_id`      (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── نتائج التواصل ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contact_results` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `shipment_id`   VARCHAR(100),
  `tracking_code` VARCHAR(100),
  `result`        VARCHAR(50),
  `note`          TEXT,
  `updated_by`    VARCHAR(100),
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_tracking_code` (`tracking_code`),
  INDEX      `idx_shipment_id`  (`shipment_id`),
  INDEX      `idx_result`       (`result`),
  INDEX      `idx_updated_by`   (`updated_by`),
  INDEX      `idx_updated_at`   (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── المناديب ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drivers` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(100) NOT NULL,
  `phone`       VARCHAR(50),
  `branch_name` VARCHAR(100),
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_branch_name` (`branch_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── جداول مرجعية ثابتة ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `regions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stores` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wa_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `content` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── المرتجعات ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `returns` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tracking_code`  VARCHAR(100),
  `customer_name`  VARCHAR(255),
  `customer_phone` VARCHAR(50),
  `driver_name`    VARCHAR(100),
  `branch_name`    VARCHAR(100),
  `status`         VARCHAR(50),
  `delay_days`     INT DEFAULT 0,
  `note`           TEXT,
  `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tracking_code` (`tracking_code`),
  INDEX `idx_status`        (`status`),
  INDEX `idx_branch_name`   (`branch_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── التحويلات ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transfers` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tracking_code` VARCHAR(100),
  `customer_name` VARCHAR(255),
  `from_branch`   VARCHAR(100),
  `to_branch`     VARCHAR(100),
  `status`        VARCHAR(50),
  `delay_days`    INT DEFAULT 0,
  `note`          TEXT,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tracking_code` (`tracking_code`),
  INDEX `idx_status`        (`status`),
  INDEX `idx_from_branch`   (`from_branch`),
  INDEX `idx_to_branch`     (`to_branch`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── سجل التواصل ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contacted_log` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `shipment_id`  VARCHAR(100),
  `contacted_by` VARCHAR(100),
  `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_shipment_id`  (`shipment_id`),
  INDEX `idx_contacted_by` (`contacted_by`),
  INDEX `idx_created_at`   (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── حساب المدير الافتراضي ───────────────────────────────────────────────────
-- المستخدم: admin   |   كلمة المرور: 12345678
-- التجزئة bcrypt صالحة — يعمل الدخول فور تشغيل هذا الملف. غيّر كلمة المرور بعد الدخول.
INSERT INTO `users` (`username`, `name`, `password_hash`, `role`, `status`)
VALUES ('admin', 'المدير', '$2b$10$h06mj3Z582pEXkgn.I6tfe3ztA7b3ra25Ju2hYQ.kWB5bMxnGPoGO', 'admin', 'active')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `role` = 'admin', `status` = 'active';
