package com.flosy.finance;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.graphics.Color;
import android.content.res.ColorStateList;
import android.view.View;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.webkit.ValueCallback;
import org.json.JSONObject;
import org.json.JSONArray;
import android.Manifest;
import android.app.AlertDialog;
import android.hardware.biometrics.BiometricPrompt;
import android.os.CancellationSignal;
import android.os.Build;
import android.content.pm.PackageManager;
import android.speech.RecognizerIntent;
import java.util.ArrayList;
import android.database.Cursor;
import android.provider.Telephony;
import java.util.Locale;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String HOME = "https://ahmedsayed20233.github.io/mynewproject/";
    private static final String HOME_HOST = "ahmedsayed20233.github.io";
    private static final int PICK_FILE = 71;
    private static final int REQ_READ_SMS = 72;
    private static final int REQ_VOICE = 73;
    private WebView webView;
    private ProgressBar loadingBar;
    private ValueCallback<Uri[]> selectedFiles;
    private long lastBackPressTime = 0L;
    private String pendingSharedMessage = null;
    private boolean pageReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        int ui=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (android.os.Build.VERSION.SDK_INT >= 26) ui|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(ui);

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        loadingBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        loadingBar.setMax(100);
        loadingBar.setProgressTintList(ColorStateList.valueOf(Color.rgb(9, 144, 129)));
        loadingBar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.TRANSPARENT));
        FrameLayout.LayoutParams loadingParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 5, Gravity.TOP);
        root.addView(loadingBar, loadingParams);
        setContentView(root);
        WebView.setWebContentsDebuggingEnabled(false);
        readSharedText(getIntent());

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                if (loadingBar != null) {
                    loadingBar.setProgress(progress);
                    loadingBar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView w,
                                              ValueCallback<Uri[]> callback,
                                              FileChooserParams chooserParams) {
                if (selectedFiles != null) selectedFiles.onReceiveValue(null);
                selectedFiles = callback;
                try {
                    startActivityForResult(chooserParams.createIntent(), PICK_FILE);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    selectedFiles = null;
                    Toast.makeText(MainActivity.this,
                        "لا يوجد تطبيق لاختيار الملفات", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                pageReady = false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view,
                                                    WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String host = uri.getHost();
                if ("flosyapp".equalsIgnoreCase(scheme) && "biometric-unlock".equalsIgnoreCase(host)) {
                    if (request.isForMainFrame() && view.getUrl() != null && view.getUrl().startsWith(HOME)) {
                        view.post(() -> requestBiometricUnlock());
                    }
                    return true;
                }
                if ("flosyapp".equalsIgnoreCase(scheme) && "voice-expense".equalsIgnoreCase(host)) {
                    if (request.isForMainFrame() && view.getUrl()!=null && view.getUrl().startsWith(HOME))
                        view.post(() -> startEgyptianVoice());
                    return true;
                }
                if ("flosyapp".equalsIgnoreCase(scheme) && "sms-scan".equalsIgnoreCase(host)) {
                    if (request.isForMainFrame() && view.getUrl() != null
                        && view.getUrl().startsWith(HOME)) {
                        view.post(() -> requestSmsScan());
                    }
                    return true;
                }
                if ("flosyapp".equalsIgnoreCase(scheme) && "print".equalsIgnoreCase(host)) {
                    if (request.isForMainFrame()) {
                        view.post(() -> printReport());
                    }
                    return true;
                }
                if ("https".equalsIgnoreCase(scheme)
                    && HOME_HOST.equalsIgnoreCase(host)
                    && (uri.getPath() == null || uri.getPath().startsWith("/mynewproject"))) {
                    return false;
                }
                if ("https".equalsIgnoreCase(scheme)
                    || "mailto".equalsIgnoreCase(scheme)
                    || "tel".equalsIgnoreCase(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException ignored) {
                        Toast.makeText(MainActivity.this,
                            "تعذر فتح هذا الرابط", Toast.LENGTH_SHORT).show();
                    }
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(HOME)) {
                    pageReady = true;
                    view.evaluateJavascript("window.FLOSY_NATIVE_ANDROID=true;"
                        + "window.FLOSY_NATIVE_SMS_AVAILABLE="
                        + (BuildConfig.FLAVOR.equals("sms") ? "true" : "false") + ";"
                        + "window.FLOSY_NATIVE_VOICE_AVAILABLE=true;"
                        + "window.FLOSY_NATIVE_BIOMETRIC_AVAILABLE="
                        + (Build.VERSION.SDK_INT >= 28 ? "true" : "false") + ";"
                        + "if(window.FLOSY_NEXT)window.FLOSY_NEXT.render();", null);
                    deliverPendingSharedMessage();
                }
            }

            @Override
            public void onReceivedError(WebView view,
                                        WebResourceRequest request,
                                        WebResourceError error) {
                if (request.isForMainFrame()) {
                    String html = "<!doctype html><html lang='ar' dir='rtl'>"
                        + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                        + "<style>body{background:#FFFFFF;color:#1c4051;font-family:sans-serif;"
                        + "padding:40px;text-align:center}a{display:inline-block;background:#0b8f82;"
                        + "color:#FFFFFF;text-decoration:none;padding:13px 24px;border-radius:12px;"
                        + "font-weight:bold;margin-top:20px}</style>"
                        + "<h1>فلوسي</h1><p>تعذر تحميل الموقع. تأكد من الاتصال بالإنترنت.</p>"
                        + "<a href='" + HOME + "'>إعادة المحاولة</a></html>";
                    view.loadDataWithBaseURL(HOME, html, "text/html", "UTF-8", null);
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition,
                                     mimeType, contentLength) -> {
            if (url != null && url.startsWith("https://")) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (ActivityNotFoundException ignored) {
                    Toast.makeText(this, "تعذر تنزيل الملف", Toast.LENGTH_SHORT).show();
                }
            } else {
                Toast.makeText(this,
                    "لتنزيل نسخة احتياطية، افتح فلوسي في المتصفح الخارجي",
                    Toast.LENGTH_LONG).show();
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(HOME);
        }
    }

    // Optional Android biometric re-authentication to reveal visually masked balances.
    // Does NOT encrypt on-device data or replace Supabase authentication.
    private void requestBiometricUnlock() {
        if (Build.VERSION.SDK_INT < 28 || !pageReady || webView == null) {
            Toast.makeText(this, "المصادقة بالبصمة غير متاحة على هذا الجهاز",
                Toast.LENGTH_LONG).show();
            return;
        }
        try {
            BiometricPrompt prompt = new BiometricPrompt.Builder(this)
                .setTitle("إظهار الأرصدة في فلوسي")
                .setSubtitle("استخدم بصمة أو وجهًا مسجلًا على هاتفك")
                .setNegativeButton("إلغاء",getMainExecutor(),(dialog,which)->{})
                .build();
            prompt.authenticate(new CancellationSignal(),getMainExecutor(),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        if(webView!=null && pageReady)
                            webView.evaluateJavascript(
                                "if(window.FLOSY_V4_FAMILY&&window.FLOSY_V4_FAMILY.biometricUnlocked)"
                               +"window.FLOSY_V4_FAMILY.biometricUnlocked();",null);
                    }
                    @Override
                    public void onAuthenticationError(int code,CharSequence message) {
                        super.onAuthenticationError(code,message);
                        if(code!=BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED
                            && code!=BiometricPrompt.BIOMETRIC_ERROR_NEGATIVE_BUTTON)
                            Toast.makeText(MainActivity.this,
                                "تعذر التحقق من البصمة: "+message,Toast.LENGTH_SHORT).show();
                    }
                });
        } catch (Exception ex) {
            Toast.makeText(this,"تعذر تشغيل التحقق البيومتري على الجهاز",
                Toast.LENGTH_LONG).show();
        }
    }

    // Opt-in Android Sharesheet import: only text that the user explicitly shares.
    // Never request READ_SMS or read the user's messages database.
    private void readSharedText(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        if (intent.getType() == null || !intent.getType().startsWith("text/plain")) return;
        CharSequence shared = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        if (shared != null) {
            String candidate = shared.toString();
            if (candidate.length() > 0 && candidate.length() <= 5000) {
                pendingSharedMessage = candidate;
                deliverPendingSharedMessage();
            } else {
                Toast.makeText(this,"الرسالة المشتركة طويلة أو فارغة", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void deliverPendingSharedMessage() {
        if (webView == null || !pageReady || pendingSharedMessage == null) return;
        String safeJson = JSONObject.quote(pendingSharedMessage);
        String script = "if (window.FLOSY_NEXT && window.FLOSY_NEXT.receiveSharedText) {"
                + "window.FLOSY_NEXT.receiveSharedText(" + safeJson + ");"
                + "} else { throw new Error('Flosy importer not loaded'); }";
        webView.evaluateJavascript(script, result -> {
            // A shared text remains in memory only until it is handed to the website.
            pendingSharedMessage = null;
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readSharedText(intent);
    }


    // Read only recent, potentially relevant financial SMS after explicit per-use consent.
    // No background receiver, no bulk upload and no automatic financial record creation.
    private void requestSmsScan() {
        if (!BuildConfig.FLAVOR.equals("sms")) {
            Toast.makeText(this, "توجد ميزة مسح الرسائل فقط في إصدار SMS التجريبي",
                Toast.LENGTH_LONG).show();
            return;
        }
        new AlertDialog.Builder(this)
            .setTitle("قراءة الرسائل المالية")
            .setMessage("سيبحث فلوسي على جهازك عن الرسائل المالية خلال آخر 45 يومًا، "
               + "بعد موافقتك على صلاحية READ_SMS. سيستبعد رسائل التحقق OTP، "
               + "ولن يخزن نصوص الرسائل أو يرسلها إلى الخادم. "
               + "ستختار كل معاملة لمراجعتها قبل تسجيلها. "
               + "يمكنك سحب الإذن لاحقًا من إعدادات الهاتف.")
            .setNegativeButton("إلغاء", (d,which)->{})
            .setPositiveButton("موافق، فحص الآن", (d,which)->{
                if (checkSelfPermission(Manifest.permission.READ_SMS)
                     != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.READ_SMS},REQ_READ_SMS);
                } else {
                    scanFinancialSms();
                }
            }).show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                           int[] results) {
        super.onRequestPermissionsResult(requestCode,permissions,results);
        if (requestCode != REQ_READ_SMS) return;
        if (results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED) {
            scanFinancialSms();
        } else {
            Toast.makeText(this,"لم يتم منح إذن قراءة SMS. يمكن استخدام مشاركة الرسالة بدلًا منه.",
                Toast.LENGTH_LONG).show();
        }
    }

    private void scanFinancialSms() {
        if (!BuildConfig.FLAVOR.equals("sms")
            || checkSelfPermission(Manifest.permission.READ_SMS)
                != PackageManager.PERMISSION_GRANTED
            || webView == null || !pageReady) return;
        JSONArray found = new JSONArray();
        final long earliest = System.currentTimeMillis() - 45L*24*60*60*1000;
        final Pattern direction = Pattern.compile(
          "(خصم|سحب|شراء|دفع|إيداع|ايداع|استلام|تم التحويل|paid|purchase|debited|credited|withdraw|received|deposit)",
          Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
        final Pattern currency = Pattern.compile(
          "(EGP|جنيه|جنيها|ج\\.م|L\\.E\\.|ج\\s*م)",
          Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
        final Pattern otp = Pattern.compile(
          "(OTP|one.time.password|verification.code|security.code|رمز.{0,12}(التحقق|التفعيل)|كود.{0,12}(التحقق|التفعيل)|رمز.سري)",
          Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
        String[] cols={Telephony.Sms.BODY,Telephony.Sms.DATE};
        int inspected=0;
        try(Cursor cursor=getContentResolver().query(Telephony.Sms.Inbox.CONTENT_URI,
            cols,Telephony.Sms.DATE+" >= ?",new String[]{String.valueOf(earliest)},
            Telephony.Sms.DATE+" DESC")){
            if(cursor!=null)while(cursor.moveToNext()&&inspected<350&&found.length()<35){
                inspected++;
                String body=cursor.getString(0);
                long millis=cursor.getLong(1);
                if(body==null||body.length()>1200||!direction.matcher(body).find()
                    ||!currency.matcher(body).find()||otp.matcher(body).find()) continue;
                // Redact long numeric sequences typically used for card/account identifiers.
                String sanitized=body.replaceAll("(?<!\\d)(?:\\d[ -]?){12,19}(?!\\d)","[رقم مخفي]");
                JSONObject item=new JSONObject();
                item.put("date",millis);
                item.put("text",sanitized);
                found.put(item);
            }
        }catch(Exception ex){
            Toast.makeText(this,"تعذر قراءة الرسائل. راجع إذن SMS.",Toast.LENGTH_LONG).show();
            return;
        }
        final String json=found.toString();
        webView.evaluateJavascript("if(window.FLOSY_NEXT&&window.FLOSY_NEXT.receiveScannedSMS)"
           +"window.FLOSY_NEXT.receiveScannedSMS("+json+");",null);
        Toast.makeText(this,"تم العثور على "+found.length()+" رسالة مالية محتملة للمراجعة.",
            Toast.LENGTH_LONG).show();
    }

    // Android's installed speech service handles microphone consent and Egyptian Arabic recognition.
    private void startEgyptianVoice() {
        try {
            Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,"ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT,"قول مثلًا: دفعت 75 جنيه قهوة من الفيزا");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
            startActivityForResult(intent,REQ_VOICE);
        }catch(ActivityNotFoundException ex){
            Toast.makeText(this,"لا توجد خدمة للتعرف الصوتي على هذا الهاتف. استخدم الإدخال النصي.",
                Toast.LENGTH_LONG).show();
        }
    }

    private void printReport() {
        if (webView == null) return;
        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        if (pm == null) {
            Toast.makeText(this, "خدمة الطباعة غير متاحة", Toast.LENGTH_LONG).show();
            return;
        }
        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("Flosy-Financial-Report");
        PrintAttributes attributes = new PrintAttributes.Builder()
            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
            .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
            .build();
        pm.print("Flosy Financial Report", adapter, attributes);
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_VOICE) {
            if (resultCode == RESULT_OK && data != null && webView != null && pageReady) {
                ArrayList<String> results=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (results!=null && !results.isEmpty() && results.get(0)!=null) {
                    String speech=results.get(0);
                    if (speech.length()<=320)webView.evaluateJavascript(
                        "if(window.FLOSY_CAPTURE)window.FLOSY_CAPTURE.receiveNativeVoice("
                        + JSONObject.quote(speech) + ");",null);
                }
            }
            return;
        }
        if (requestCode == PICK_FILE && selectedFiles != null) {
            selectedFiles.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            selectedFiles = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
            "(window.FLOSY_HANDLE_BACK ? window.FLOSY_HANDLE_BACK() : 'exit')",
            result -> {
                if ("\"handled\"".equals(result)) return;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                long now = System.currentTimeMillis();
                if (now - lastBackPressTime < 2200) {
                    finish();
                } else {
                    lastBackPressTime = now;
                    Toast.makeText(this, "اضغط رجوع مرة أخرى للخروج من فلوسي",
                        Toast.LENGTH_SHORT).show();
                }
            });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
