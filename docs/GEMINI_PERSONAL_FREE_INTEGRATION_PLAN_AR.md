# Flosy AI × Gemini — خطة ربط شخصية بدون تكلفة إضافية

**الحالة:** خطة تنفيذ فقط، وليست ميزة منشورة. **الملكية:** استخدام حساب Google شخصي واحد، وFlosy الخاص بالمستخدم. **التكلفة الإضافية:** 0 جنيه بشرط بقاء كل الخدمات على Free Tier وعدم تفعيل Billing.

## الحقائق والقيود الأساسية

1. **Google AI Pro ليس رصيدًا لـGemini API**. الربط التلقائي يستخدم مشروع Gemini API مجاني مستقل داخل نفس حساب Google الشخصي. لا يتطلب اشتراكًا إضافيًا، ولكن الحصص محدودة ومتغيرة حسب النموذج والمنطقة.
2. لا نستخدم OAuth أو جلسة Gemini web لتقليد واجهة Gemini Pro، ولا نتحايل على الحدود.
3. مشروع Supabase الموجود باسم `flosy-finance` تَأكّد أنه **ACTIVE_HEALTHY** وعلى **Free plan** في 11 نوفمبر 2026. سنعيد استخدامه؛ **لا مشروع جديد، لا اشتراك جديد، لا دفع**.
4. Supabase Free يضم حصة Edge Functions مجانية، مع احتمالية تقييد الخدمة عند تجاوز حدود المجاني. راجع Dashboard > Usage، ولا تُرقِّ إلى Pro.
5. Google تتيح بعض نماذج Gemini API على Free Tier. يجب اختيار نموذج ظاهر حاليًا كـFree في AI Studio (مثال Flash-Lite بحسب الأسعار المتاحة وقت التفعيل)، ولا نثبت حصة قد تتغير.
6. **خصوصية حاسمة:** شروط Gemini API المجاني تسمح باستخدام المحتوى المرسل لتحسين الخدمات والمراجعة البشرية. لا نرسل صور فواتير حقيقية، تسجيلات صوتية خام، SMS بنكية كاملة، أسماء، أرقام حسابات/بطاقات، مراجع تحويلات، رموز OTP أو تفاصيل خاصة. عند عدم إمكان التنقية، نعالج محليًا فقط.

### المراجع الرسمية
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- [Gemini API key security](https://ai.google.dev/gemini-api/docs/api-key)
- [Supabase Free Edge Function quota](https://supabase.com/docs/guides/functions/pricing)
- [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase function authentication](https://supabase.com/docs/guides/functions/auth)

## التصميم

```text
SMS from allowed bank → Automate → Flosy encrypted local queue ┐
Egyptian speech → Android SpeechRecognizer → local transcript   ├→ local sanitization & rules
Receipt image → ML Kit / Tesseract OCR → local text              ┘           │
                                                                     if complex and safe
                                                                            ▼
                                                  Supabase Edge Function: flosy-gemini-parse
                                                  Supabase user JWT + owner allowlist
                                                  Gemini key stored as function secret
                                                                            │
                                                         Free-tier Gemini structured JSON
                                                                            ▼
                                                  Flosy local schema+amount+direction checks
                                                               │                       │
                                                  validated+opted-in          unclear / failure / quota
                                                               │                       │
                                                 save ledger once            review/local parser
                                                  undo & audit log
```

**ملاحظة:** لا يقرأ Gemini الرسائل مباشرة؛ كل شيء يمر عبر موافقات Automate وFlosy الحالية. الحفظ عند إغلاق التطبيق ينتظر مزامنة/فتح Flosy: لا نَعِد بتسجيل بنكي حقيقي في الخلفية من الخادم من غير فتح التطبيق.

### هندسة الملفات المقترحة

| الملف | الوظيفة |
|---|---|
| `supabase/functions/flosy-gemini-parse/index.ts` | Proxy وحيد إلى Gemini؛ JWT إلزامي؛ فحص المستخدم الشخصي، قفل 0 تكلفة، حد طلبات |
| `flosy-ai-gemini.js` | طبقة اختيار مجانية Local → AI (عند الحاجة) → Local validation |
| `flosy-v4-capture.js` | ربط نتيجة الصوت/الفاتورة مع structured parser |
| `flosy-next.js` | ربط SMS المرشّحة بـGemini اختياريًا مع منع OTP والتكرار |
| `flosy-repair.js` و `flosy-ai.js` | شاشة الإعدادات والتشخيص وأجوبة Flosy AI على بيانات ملخّصة |
| `tests/gemini-personal.test.cjs` | محاكاة API بدون مفتاح حقيقي أو بيانات مالية حقيقية |

## الإعداد المجاني الفعلي

1. افتح Google AI Studio من حسابك الشخصي الحالي: https://aistudio.google.com/apikey.
2. أنشئ/اختَر مشروعًا على **Free Tier**. لا تضغط `Set up billing`، ولا تربط بطاقة دفع، ولا تُرقِّ الحصة.
3. أنشئ Gemini API key بحدود وصول خاصة بـGemini API. **لا ترسله في محادثة أو GitHub issue أو commit أو ملف APK.**
4. في مشروع Supabase الحالي (`flosy-finance`)، افتح **Edge Function Secrets** وأضف `GEMINI_API_KEY`. يجب أن يُدخل المالك القيمة بنفسه في لوحة Supabase فقط.
5. انشر Edge Function واحدة باسم `flosy-gemini-parse`. أبقِ JWT verification فعالًا، وتحقق من `auth.uid()` مقابل `FLOSY_GEMINI_OWNER_UID` المخزّن كـSecret، وامنح الاستدعاء لحساب المالك فقط؛ لا `auth:none` ولا public anonymous proxy.
6. في Flosy: وضع AI = `Local first`، زر تفعيل `Free Gemini assist`، إظهار حالة `Free only`، ومفتاح تعطيل فوري؛ استخدم التفعيل الصريح.
7. اعرض Dashboard > Usage في Google AI Studio وسجل قيود النموذج المتاحة فعليًا؛ اجعل إعدادات Flosy أقل منها. لا تستخدم Fallback إلى نموذج مدفوع.

## الموازنة بين الدقة والخصوصية

### SMS
- مسموح فقط بمُرسِلين محددين بإذن المالك.
- فلتر محلي يحذف تمامًا OTP/PIN/CVV/verification والرسائل المعلقة/الفاشلة من مسار تسجيل المال.
- نظّف النص محليًا: أسماء الأشخاص → `[PERSON]`، أرقام الحساب والبطاقات → `[ACCOUNT]`، المرجع → `[REF]`، المبالغ → `[AMOUNT_1]`، واحفظ mapping محليًا.
- Gemini يحدد `type` و `amount_token` و `category` و `is_confirmed` فقط، لا يرى المبلغ الحقيقي أو البيانات الشخصية.
- Flosy يعيد المبلغ من mapping المحلي، ويستخدم regex تحقق مستقل؛ تحويل بين حسابات المستخدم **transfer** وليس expense، ولا يُفرض اتجاه بغير دليل.
- قاعدة منع التكرار عبر SMS/فاتورة/صوت إذا أمكن: المرجع المحلي + نوع العملية + المبلغ + التاريخ + الحساب.
- المصروفات الصريحة تُحفظ مباشرة **فقط إن فعّل المالك ذلك**، وإلا للمراجعة.

### الصوت
- Android SpeechRecognizer يفرّغ الكلام أولًا؛ لا نرفع الملف الصوتي إلى Gemini.
- محرك الأرقام المصري المحلي يدعم «مية وخمسين، اتنين وستين، عشرين ونص» أو يحوّل الأرقام المفهومة.
- Gemini يفسر النسخة المنقحة فقط (المبلغ كرمز)، ويحدد النوع والتصنيف والحساب المستدل.
- إذا لم يُحدد الحساب ولا اتجاه الحركة بطريقة موثوقة، تُعرض مراجعة سريعة بدل خصم عشوائي.

### الإيصالات
- معالجة الصورة على الهاتف بواسطة ML Kit Latin ثم Tesseract Arabic/English.
- دعم إجمالي على السطر التالي؛ تحديد `grand total` و`الإجمالي` و`net amount` مع استبعاد subtotal وtax وdiscount والرقم المرجعي.
- لا نرفع صورة فاتورة خام إلى Free Gemini API (خصوصية). نرسل فقط نص OCR منظّفًا يحتوي أسماء الحقول مع استبدال الأرقام الحقيقية بـtokens.
- إذا كانت قراءة OCR ضعيفة، لا تُسجّل معاملة خاطئة؛ اطلب تعديل المبلغ أو صورة أوضح.

### Flosy AI chat
- الأسئلة مثل «صرفي الشهر ده كام؟» تُحسب من قاعدة بيانات المستخدم محليًا؛ Gemini يستقبل ملخصًا إحصائيًا اختياريًا بعد تجريده من أي بيانات شخصية.
- لا يُسمح لنص Gemini بكتابة قيود مالية؛ لا بد من `validatedIntent` تتحقق منه Flosy قبل أي `mutate`.

## استجابة JSON محددة

```json
{
  "intent": "financial_transaction",
  "type": "expense",
  "amount_token": "AMOUNT_1",
  "currency": "EGP",
  "category": "مشتريات",
  "confirmed": true,
  "requires_review": false,
  "reason_code": "explicit_outgoing_transfer"
}
```

**تحذير:** `confirmed` القادم من نموذج لغوي ليس إثباتًا. احفظ فقط بعد تحقق Flosy محليًا من رمز مبلغ صحيح، اتجاه متسق مع النص، نوع الحساب، عدم وجود علامات OTP/فشل، وغياب تكرار سابق.

## قواعد 0 جنيه (إلزامية)

- مشروع Gemini API يظل **Free** وغير مرتبط بفاتورة أو بطاقة.
- مشروع Supabase يظل **Free**؛ لا ترقية ولا تفعيل Add-ons مدفوعة.
- حد تطبيق مبدئي: 12 طلبًا في اليوم، طلبان في الدقيقة، 2,000 حرف نص منظّف في الطلب، حد 512 output tokens، وبدون retries آلية عند HTTP 429. هذه حدود **نختارها في Flosy** وليست حدود Google المضمونة.
- Cache محلي لبصمة النص بعد تنقيته لتجنب تكرار طلب Gemini؛ مدة الاحتفاظ قصيرة ومن دون raw SMS.
- عند `429` أو `401` أو `403` أو فشل الشبكة أو JSON غير صالح: لا إعادة محاولة بلا نهاية، ولا انتقال مدفوع؛ استخدم parser محليًا ومراجعة فقط عند الحاجة.
- مفتاح الإيقاف `GEMINI_ENABLED=false` في Function Secret وقاطع AI في Flosy.
- لا تجعل النموذج يفعّل أدوات Search Grounding أو خدمات مدفوعة.
- راقب الاستهلاك أسبوعيًا في Google AI Studio وSupabase > Usage.

## خطة التنفيذ (تسليمات محددة)

| المرحلة | العمل | معيار القبول |
|---|---|---|
| A — المجاني والسر | Free project + key + Edge Function JWT + owner-only | `403` لغير المالك، `200` لطلب تجريبي للمالك، لا key في repo |
| B — SMS | تنظيف وتفسير والعودة لقاعدة التحقق المحلية | تحويل صادر 1 جم يسجَّل مرة واحدة؛ OTP والرسائل غير المالية لا تُسجَّل |
| C — Voice | تحويل أرقام عامية + تحليل اتجاه وفئة | «دفعت مية وخمسين جنيه قهوة» → مصروف 150 |
| D — Receipt | OCR محلي + total candidate tokens | فاتورة عربية متعددة الأسطر → مبلغ صحيح أو مراجعة |
| E — Flosy AI | أسئلة مالية على مجاميع آمنة | إجابة grounded في بيانات محلية بدون تفاصيل خام |
| F — ضمان الجودة | CI synthetic tests + device smoke + quota alerts | كل الاختبارات تنجح، صفر طلبات paid، لا leak للمفتاح |

## مصفوفة اختبار سريعة

- SMS صادر: `تم تنفيذ تحويل لحظي ... بمبلغ [AMOUNT_1] جم`.
- SMS وارد واضح: `تم استلام مبلغ [AMOUNT_1] EGP`.
- SMS OTP وPIN والرصيد المتبقي وحده: رفض الحفظ.
- فشل عملية / `pending`: رفض الحفظ.
- نفس SMS مرتين: معاملة واحدة فقط.
- صوت «دفعت خمسين جنيه مواصلات امبارح» و«قبضت ميتين جنيه».
- فاتورة بها Subtotal + VAT + Grand Total أو Total في سطر مستقل؛ فاتورة غير واضحة.
- 401 بدون جلسة؛ 403 مستخدم آخر؛ 429 حصة نفدت؛ شبكة غير متاحة؛ استجابة Gemini غير صالحة.
- Verify 0 paid calls, 0 leaked secrets, no finance mutation on failure.

## حدود واضحة

- لا تستخدم Google AI Pro app/CLI credentials كبديل سري غير رسمي عن Gemini API.
- الاستخدام المجاني غير مضمون أن يظل متاحًا دائمًا بنفس الحصة؛ عند تغيّر شروط Free Tier نوقف Gemini ونبقي Flosy Offline.
- هذه الخطة **لم تُنفَّذ بعد**؛ لا إدخال للـAPI key ولا تعديل للإعدادات أو الفوترة أو قاعدة البيانات في هذه المرحلة.
