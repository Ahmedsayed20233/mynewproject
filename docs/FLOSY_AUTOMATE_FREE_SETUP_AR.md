
# Flosy 2.9 + Automate — دليل الربط المجاني على Android

**الحالة:** الإصدار 2.9 تجريبي، ولن يصبح متاحًا للتثبيت إلا بعد نشره في GitHub Releases. هذه الميزة لا تحتاج حساب مطوّر على Google Play أو API Key، وتعمل مع Automate الأصلي من متجر Google Play.

## 1) تنزيل التطبيق وإعداده
1. احتفظ بنسخة احتياطية قابلة للاسترجاع من بيانات Flosy القديمة؛ توقيع APK التجريبي قد يختلف.
2. ثبّت Flosy Safe Automate 2.9 **بعد صدور رابط التحميل فعليًا**. لا توقف Google Play Protect إذا ظهر تحذير.
3. نزّل تطبيق Automate المجاني من Google Play: https://play.google.com/store/apps/details?id=com.llamalab.automate
4. افتح Flosy ← استيراد المعاملات ← استيراد تلقائي مجاني.
5. ضع **مرسلي البنوك الحقيقيين الظاهرين عندك في SMS** (مثل CIB فقط إن كان اسم المرسل فعلاً CIB) واضغط حفظ المصادر.
6. اضغط إنشاء رمز اقتران محلي؛ انسخ الرمز ولا تشاركه مع أي شخص. إنشاء رمز جديد يلغي القديم.

## 2) تدفق SMS Received داخل Automate
- افتح Automate ← New flow.
- أضف 3 بلوكات: Flow beginning → SMS received → Broadcast send → وصّل آخر بلوك مجددًا بـSMS received.
- في SMS received، اختر Phone number = معرف البنك الحقيقي. Outputs:
  - Phone number → bankSender
  - Message → bankMessage
  - Timestamp sent → smsTime (اختياري)
- في Broadcast send:
  - Receiver class: com.flosy.finance.AutoRelayReceiver
  - Package: اسم الحزمة المعروض في Flosy عندك؛ Safe Automate غالبًا com.flosy.finance.sms، وStandard هو com.flosy.finance.
  - Action: com.flosy.finance.REVIEW_EXTERNAL_FINANCIAL_EVENT
  - Extras في وضع fx (Expression)، مثال:

    {"token":"PASTE_SECRET_HERE","source":"sms","sender":bankSender,"text":bankMessage}

- الصق رمز الاقتران بدل PASTE_SECRET_HERE. لا ترفع الرسالة إلى خدمة ويب.
- اضغط Start، وامنح Automate إذن الرسائل عند الحاجة.

## 3) تدفق Notification posted لـInstaPay
- Flow beginning → Notification posted → Broadcast send → العودة إلى Notification posted.
- Notification posted: Package = com.egyptianbanks.instapay، Proceed = When transition.
- عرّف Output variables:
  - Package → appPackage
  - Title → noticeTitle
  - Message → noticeText
- في Broadcast send، استخدم نفس Receiver/Package/Action، لكن Extras:

    {"token":"PASTE_SECRET_HERE","source":"notification","sender":appPackage,"text":noticeTitle ++ " " ++ noticeText}

- اسمح لAutomate فقط بـNotification Access من Android Settings. تدفق الإشعارات يعمل فقط مع النص الذي يعرضه التطبيق ولا يستطيع الوصول إلى بيانات InstaPay الداخلية.

## 4) Xiaomi Redmi Note 11 Pro
- Settings → Apps → Manage apps → Automate → Battery Saver → No restrictions.
- Settings → Apps → Permissions → Autostart / Background autostart → Automate → ON.
- أسماء القوائم قد تختلف باختلاف إصدار MIUI أو HyperOS.

## 5) المراجعة والتوقف
- افتح Flosy ← استيراد المعاملات ← عرض المعاملات المكتشفة.
- اختر العملية ثم راجع المبلغ والحساب والفئة واضغط حفظ. **لا حفظ تلقائيًا ولا تحويلات بنكية حقيقية**.
- للتوقف: ألغِ الاقتران من Flosy، وأوقف التدفقين في Automate، ويمكنك سحب صلاحيات Automate من إعدادات Android.

## ما الذي لا يفعله هذا الحل؟
- يستقبل **الرسائل والإشعارات الجديدة بعد تشغيل التدفقات فقط**؛ لا يستورد SMS القديمة تلقائيًا. استعمل CSV أو مشاركة الرسالة القديمة.
- SMS received لا يعمل مع RCS/MMS، وبعض التطبيقات قد تخفي محتوى الإشعارات.
- لا يضمن نجاح فحص الخلفية على كل هاتف إلا بعد تجربة فعلية.
- Automate مجاني ضمن حد 30 بلوك متزامن حسب التوثيق الرسمي.

## توثيق رسمي
- https://llamalab.com/automate/doc/premium.html
- https://llamalab.com/automate/doc/block/sms_received.html
- https://llamalab.com/automate/doc/block/notification_posted.html
- https://llamalab.com/automate/doc/block/broadcast_send.html
- https://play.google.com/store/apps/details?id=com.egyptianbanks.instapay

## أمان الربط
رمز الاقتران عشوائي بقوة 192-bit؛ Flosy يطابق المرسلين مع القائمة المسموحة ويستبعد OTP والعمليات الفاشلة وغير المالية. يخفي الأرقام الحساسة، ويخزن بحد أقصى 60 مرشحًا لمدة 30 يومًا في Android Keystore AES-GCM، دون رفع النصوص للخادم أو حفظ المعاملات دون موافقة.
