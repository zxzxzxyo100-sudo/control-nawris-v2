# النورس للشحن — الإصدار الثاني (v2)

منظومة إدارة شحنات تعتمد على **MySQL + PHP** (خلفية) و**React + Vite + TypeScript** (واجهة).
تعمل من أي مكان/جهاز عبر استضافة Hostinger.

## البنية

```
control-nawris-v2/
├── api/                 # خلفية PHP REST على MySQL
│   ├── config.php       # تحميل الإعدادات من .env
│   ├── db.php           # اتصال PDO
│   ├── helpers.php      # CORS, JSON, توكن مصادقة
│   ├── index.php        # الموجّه الرئيسي (auth + data CRUD)
│   └── .htaccess        # توجيه /api/* إلى index.php
├── database/
│   ├── schema.sql       # مخطط قاعدة البيانات النظيف
│   └── setup_admin.php  # إنشاء أول مدير (شغّله مرة ثم احذفه)
├── web/                 # مصدر React (يُبنى إلى جذر المستودع)
│   └── src/
├── index.html           # (مولّد من البناء) — لا تعدّله يدوياً
├── assets/              # (مولّد من البناء)
└── .htaccess            # توجيه SPA + تمرير /api
```

## الإعداد على Hostinger

1. أنشئ قاعدة بيانات MySQL جديدة من hPanel.
2. شغّل `database/schema.sql` في phpMyAdmin.
3. انسخ `.env.example` إلى `api/.env` واملأ بيانات الاتصال الحقيقية.
4. عدّل `database/setup_admin.php` (المفتاح وكلمة المرور) ثم افتحه في المتصفح مرة، ثم **احذفه**.
5. اضبط جذر النشر في Hostinger على جذر هذا المستودع.

## التطوير محلياً

```bash
cd web
npm install
npm run dev      # خادم تطوير على http://localhost:5173 (يوجّه /api إلى :8000)
```

لخادم PHP محلي للاختبار:
```bash
php -S localhost:8000 -t .
```

## البناء للنشر

```bash
cd web
npm run build    # يولّد index.html + assets/ في جذر المستودع
```

ثم ارفع (commit + push) — يُنشر تلقائياً عبر Hostinger.

## مزامنة الطرود المتأخرة من backoffice الخارجي

السكريبت `api/sync.php` يسحب الطرود المتأخرة (مع المندوب / مرتجع) من الـ API الخارجي
ويُحدّث جدول `shipments` تلقائياً (upsert على `tracking_code`)، ويربط المناديب في جدول `drivers`.

**الإعداد:** أضف مفاتيح `NAWRIS_API_*` و`SYNC_SECRET` في `api/.env` (انظر `.env.example`).

**التشغيل اليدوي للاختبار:**
```bash
php api/sync.php                          # من سطر الأوامر
# أو عبر المتصفح:
# https://<موقعك>/api/sync.php?key=SYNC_SECRET
```

**الجدولة التلقائية (Cron Job في hPanel):** شغّله كل ساعة مثلاً:
```
0 * * * * /usr/bin/php /home/USER/public_html/api/sync.php
```

يُرجع السكريبت ملخّصاً JSON: عدد الصفحات، الصفوف المقروءة، المُحدّثة، والتوزيع حسب الحالة.

## الحالة

- [x] المرحلة ٠: هيكل المستودع + إعداد البناء
- [x] المرحلة ١: خلفية API + schema + مصادقة آمنة
- [x] المرحلة ٢: هيكل الواجهة (تخطيط، تنقّل، دخول)
- [x] تبويب الطرود (قراءة)
- [ ] بقية التبويبات
- [ ] نقل البيانات من قاعدة البيانات القديمة
