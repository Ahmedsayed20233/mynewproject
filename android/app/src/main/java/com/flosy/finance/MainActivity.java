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
import android.Manifest;
import android.app.AlertDialog;
import android.hardware.biometrics.BiometricPrompt;
import android.os.CancellationSignal;
import android.os.Build;
import android.content.pm.PackageManager;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.RecognitionListener;
import android.media.MediaRecorder;
import android.provider.MediaStore;
import android.content.ClipData;
import android.os.Handler;
import android.os.Looper;
import java.io.File;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import android.content.res.AssetFileDescriptor;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String HOME = "https://ahmedsayed20233.github.io/mynewproject/";
    private static final String HOME_HOST = "ahmedsayed20233.github.io";
    private static final int PICK_FILE = 71;
    private static final int REQ_VOICE = 73;
    private static final int REQ_OCR = 74;
    private static final int REQ_CAMERA = 75;
    private static final int REQ_AUDIO = 76;
    private static final int REQ_SAVE_RECEIPT = 77;
    private WebView webView;
    private ProgressBar loadingBar;
    private ValueCallback<Uri[]> selectedFiles;
    private long lastBackPressTime = 0L;
    private String pendingSharedMessage = null;
    private boolean pageReady = false;
    private String pendingNativeReceiptText = null;
    private String pendingNativeReceiptImage = null;
    private String pendingVoiceText = null;
    private SpeechRecognizer speechRecognizer = null;
    private boolean speechBusy = false;
    private boolean webMessageReady = false;
    private Uri photoUri = null;
    private File photoFile = null;
    private String pendingReceiptExport = null;
    private boolean relayWakeReceiverRegistered=false;
    private final BroadcastReceiver relayWakeReceiver=new BroadcastReceiver(){
        @Override public void onReceive(Context context,Intent intent){
            if(intent!=null&&"com.flosy.finance.AUTO_RELAY_QUEUE_UPDATED".equals(intent.getAction())){
                if(webView!=null&&pageReady)webView.post(MainActivity.this::sendRelayStatus);
            }
        }
    };


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
        // User-selected Android content:// images must be readable by the WebView file chooser.
        // Filesystem access stays disabled; the chooser validates returned content URIs.
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        // Keep the native WebView canvas white, including startup before CSS loads.
        webView.setBackgroundColor(Color.WHITE);

        // Modern Android WebView origin-restricted bridge. Never expose Java JS interfaces to iframes.
        // This avoids fragile custom-scheme top-level navigations on recent WebView versions.
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
            WebViewCompat.addWebMessageListener(webView,"FlosyNative",
                Collections.singleton("https://ahmedsayed20233.github.io"),
                (view,message,sourceOrigin,isMainFrame,replyProxy)->{
                    if(!isMainFrame || sourceOrigin==null ||
                        !"https".equalsIgnoreCase(sourceOrigin.getScheme()) ||
                        !HOME_HOST.equalsIgnoreCase(sourceOrigin.getHost()) ||
                        view.getUrl()==null || !view.getUrl().startsWith(HOME))return;
                    String raw=message.getData();
                    if(raw==null || raw.length()>16000)return;
                    try{
                        JSONObject msg=new JSONObject(raw);
                        final String action=msg.optString("action","");
                        view.post(()->{
                            if("voice".equals(action))startEgyptianVoice();
                            else if("receipt-ocr".equals(action))pickNativeReceipt();
                            else if("receipt-camera".equals(action))captureReceiptPhoto();
                            else if("relay-pair".equals(action))pairAutomate();
                            else if("relay-status".equals(action))sendRelayStatus();
                            else if("relay-configure".equals(action)){
                                AutoRelayStore.configure(this,msg.optString("senders",""),msg.optString("apps",""));
                                sendRelayStatus();
                            }
                            else if("relay-pending".equals(action))sendRelayPending();
                            else if("relay-dismiss".equals(action)){
                                AutoRelayStore.remove(this,msg.optString("id",""));
                                sendRelayPending();
                            }
                            else if("relay-clear".equals(action)){
                                AutoRelayStore.clear(this);sendRelayPending();
                            }
                            else if("relay-stop".equals(action)){
                                AutoRelayStore.stop(this);sendRelayStatus();
                            }
                            else if("receipt-export".equals(action)){
                                String receipt=msg.optString("text","");
                                if(!receipt.isEmpty() && receipt.length()<=12000)
                                    exportReceiptText(receipt);
                            }
                        });
                    }catch(Exception ignored){}
                });
            webMessageReady=true;
        }
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
                if ("flosyapp".equalsIgnoreCase(scheme) && "ocr-receipt".equalsIgnoreCase(host)) {
                    if (request.isForMainFrame() && view.getUrl()!=null && view.getUrl().startsWith(HOME))
                        view.post(() -> pickNativeReceipt());
                    return true;
                }
                if ("flosyapp".equalsIgnoreCase(scheme) && "receipt-camera".equalsIgnoreCase(host)) {
                    if (request.isForMainFrame() && view.getUrl()!=null && view.getUrl().startsWith(HOME))
                        view.post(()->captureReceiptPhoto());
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
                        + "false;"
                        + "window.FLOSY_NATIVE_RELAY_AVAILABLE=true;"
                        + "window.FLOSY_NATIVE_VOICE_AVAILABLE=true;"
                        + "window.FLOSY_NATIVE_OCR_AVAILABLE=true;"
                        + "window.FLOSY_NATIVE_BRIDGE_AVAILABLE="+(webMessageReady ? "true" : "false")+";"
                        + "window.FLOSY_NATIVE_BIOMETRIC_AVAILABLE="
                        + (Build.VERSION.SDK_INT >= 28 ? "true" : "false") + ";"
                        + "if(window.FLOSY_NEXT)window.FLOSY_NEXT.render();"
                        + "if(window.FLOSY_AUTOMATE_RELAY)window.FLOSY_AUTOMATE_RELAY.render();"
                        + "if(window.FLOSY_REPAIR)window.FLOSY_REPAIR.render();", null);
                    deliverPendingSharedMessage();
                    deliverNativePending();
                    sendRelayStatus();
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
                    // An offline error page must never inherit the trusted Flosy website origin.
                    // Retry still navigates to HOME via its absolute HTTPS link.
                    view.loadDataWithBaseURL("about:blank", html, "text/html", "UTF-8", null);
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
                        if(code!=BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED)
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


    // Trusted GitHub Pages page may call these methods through the origin-restricted
    // AndroidX WebMessageListener. Pairing secrets never appear in any network call.
    private void relayWebEvent(String method,JSONObject payload){
        if(webView==null||!pageReady||webView.getUrl()==null||!webView.getUrl().startsWith(HOME))return;
        webView.evaluateJavascript(
            "if(window.FLOSY_AUTOMATE_RELAY&&window.FLOSY_AUTOMATE_RELAY."+method+")"+
            "window.FLOSY_AUTOMATE_RELAY."+method+"("+payload.toString()+");",null);
    }
    private void pairAutomate(){
        new android.app.AlertDialog.Builder(this)
            .setTitle("توصيل Automate بفلوسي")
            .setMessage("الرمز خاص بجهازك ويفتح قناة محلية للمعاملات المالية التي اخترتها في Automate فقط. "+
                "لا ترسله لأي شخص، ولا تستخدمه في مواقع خارجية. عند إنشاء رمز جديد "+
                "يتم إيقاف الرمز القديم ومسح قائمة الانتظار السابقة.")
            .setNegativeButton("إلغاء",(d,w)->{})
            .setPositiveButton("إنشاء رمز اقتران",(d,w)->{
                String token=AutoRelayStore.createPair(this);
                try{
                    JSONObject result=new JSONObject();
                    result.put("token",token);
                    relayWebEvent("nativePair",result);
                    sendRelayStatus();
                }catch(Exception ignored){}
            }).show();
    }
    private void sendRelayStatus(){
        try{
            JSONObject data=new JSONObject();
            data.put("paired",AutoRelayStore.paired(this));
            data.put("senders",AutoRelayStore.senders(this));
            data.put("apps",AutoRelayStore.apps(this));
            data.put("pending",AutoRelayStore.pending(this).length());
            data.put("lastDeliveryCode",AutoRelayStore.lastDeliveryCode(this));
            data.put("lastDeliveryAt",AutoRelayStore.lastDeliveryAt(this));
            data.put("packageName",getPackageName());
            relayWebEvent("nativeStatus",data);
        }catch(Exception ignored){}
    }
    private void sendRelayPending(){
        try{
            JSONObject data=new JSONObject();
            data.put("items",AutoRelayStore.pending(this));
            relayWebEvent("nativePending",data);
            sendRelayStatus();
        }catch(Exception ignored){}
    }

    // Only the microphone, upon an explicit voice-entry tap, needs runtime consent.
    @Override
    public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){
        super.onRequestPermissionsResult(requestCode,permissions,results);
        if(requestCode==REQ_AUDIO){
            if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED)
                startEgyptianVoice();
            else notifyVoiceFailure("تم رفض إذن الميكروفون؛ يمكنك تفعيله من إعدادات Android.");
        }
    }

    // Android's installed speech service handles microphone consent and Egyptian Arabic recognition.
    // Open a user-controlled, read-only image picker. Never scan the gallery silently.
    private void cleanupPhoto(){
        if(photoFile!=null){
            try{photoFile.delete();}catch(Exception ignored){}
            photoFile=null;
            photoUri=null;
        }
    }

    // Launch the system camera only after a deliberate user tap. A temp file in app cache
    // is shared through FileProvider and deleted after OCR. No public gallery entry.
    private void captureReceiptPhoto(){
        cleanupPhoto();
        try {
            File folder=new File(getCacheDir(),"receipts");
            if(!folder.exists() && !folder.mkdirs())throw new IllegalStateException("cache unavailable");
            photoFile=File.createTempFile("receipt_",".jpg",folder);
            photoUri=FileProvider.getUriForFile(this,getPackageName()+".files",photoFile);
            Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT,photoUri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            intent.setClipData(ClipData.newUri(getContentResolver(),"flosy-receipt",photoUri));
            startActivityForResult(intent,REQ_CAMERA);
        } catch(Exception ex){
            cleanupPhoto();
            Toast.makeText(this,"لا يوجد تطبيق كاميرا متاح. اختر صورة من المعرض بدلًا منها.",
                Toast.LENGTH_LONG).show();
        }
    }

    // Explicit user export to a document the user chooses; Android WebView blob downloads
    // are not reliable. OCR text stays local and is never sent to an external server.
    private void exportReceiptText(String text){
        if(text==null||text.isEmpty()||text.length()>12000)return;
        pendingReceiptExport=text;
        try{
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_TITLE,"Flosy_Receipt_"+
                new java.text.SimpleDateFormat("yyyyMMdd_HHmm",Locale.US).format(new java.util.Date())+".txt");
            startActivityForResult(intent,REQ_SAVE_RECEIPT);
        }catch(Exception ex){
            pendingReceiptExport=null;
            Toast.makeText(this,"تعذر فتح حفظ الملف. جرّب التصدير عبر Chrome.",Toast.LENGTH_LONG).show();
        }
    }

    private void pickNativeReceipt() {
        try {
            Intent intent=new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(Intent.createChooser(intent,"اختار صورة إيصال واضحة"),REQ_OCR);
        } catch(Exception ex) {
            Toast.makeText(this,"لم يتم فتح معرض الصور. جرّب اختيار صورة من Flosy في Chrome.",
                Toast.LENGTH_LONG).show();
        }
    }

    // Bound the image passed to the trusted WebView. Arabic OCR is not supported
    // by the bundled ML Kit Latin recognizer, so Tesseract can scan this downscaled
    // in-memory JPEG locally when Latin OCR cannot find a confident total.
    private String nativeReceiptThumbnail(Uri uri){
        try{
            BitmapFactory.Options bounds=new BitmapFactory.Options();
            bounds.inJustDecodeBounds=true;
            try(InputStream in=getContentResolver().openInputStream(uri)){
                if(in==null)return null;
                BitmapFactory.decodeStream(in,null,bounds);
            }
            if(bounds.outWidth<=0||bounds.outHeight<=0)return null;
            BitmapFactory.Options opts=new BitmapFactory.Options();
            int max=Math.max(bounds.outWidth,bounds.outHeight),factor=1;
            while(max/factor>1700)factor*=2;
            opts.inSampleSize=factor;
            Bitmap bitmap;
            try(InputStream in=getContentResolver().openInputStream(uri)){
                if(in==null)return null;
                bitmap=BitmapFactory.decodeStream(in,null,opts);
            }
            if(bitmap==null)return null;
            try{
                Bitmap scaled=bitmap;
                int bigger=Math.max(bitmap.getWidth(),bitmap.getHeight());
                if(bigger>1700){
                    float ratio=1700f/bigger;
                    scaled=Bitmap.createScaledBitmap(bitmap,
                        Math.max(1,Math.round(bitmap.getWidth()*ratio)),
                        Math.max(1,Math.round(bitmap.getHeight()*ratio)),true);
                }
                try{
                    ByteArrayOutputStream bytes=new ByteArrayOutputStream(110000);
                    if(!scaled.compress(Bitmap.CompressFormat.JPEG,72,bytes))return null;
                    byte[] imageBytes=bytes.toByteArray();
                    // Never bridge or upload full-sized receipts.
                    if(imageBytes.length>500000)return null;
                    return "data:image/jpeg;base64,"+Base64.encodeToString(imageBytes,Base64.NO_WRAP);
                }finally{if(scaled!=bitmap)scaled.recycle();}
            }finally{bitmap.recycle();}
        }catch(Exception ignored){return null;}
    }

    private void recognizeReceipt(Uri uri) {
        if(uri==null || !"content".equalsIgnoreCase(uri.getScheme())) {
            Toast.makeText(this,"اختار صورة من تطبيق الصور أو الملفات.",Toast.LENGTH_LONG).show();
            return;
        }
        try {
            String mime=getContentResolver().getType(uri);
            if(mime!=null && !mime.startsWith("image/"))throw new IllegalArgumentException("Not an image");
            try(AssetFileDescriptor d=getContentResolver().openAssetFileDescriptor(uri,"r")){
                if(d==null || (d.getLength()>8L*1024*1024))
                    throw new IllegalArgumentException("Image exceeds 8 MB");
            }
            final String thumbnail=nativeReceiptThumbnail(uri);
            InputImage image=InputImage.fromFilePath(this,uri);
            TextRecognizer engine=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            Toast.makeText(this,"جارٍ استخراج النص محليًا من الإيصال...",Toast.LENGTH_SHORT).show();
            engine.process(image)
                .addOnSuccessListener(result -> {
                    String txt=result==null?"":result.getText();
                    if(txt.length()>12000)txt=txt.substring(0,12000);
                    pendingNativeReceiptText=txt;
                    pendingNativeReceiptImage=thumbnail;
                    deliverNativePending();
                    if(txt.trim().isEmpty())Toast.makeText(this,
                        "الصورة غير واضحة. جرّب إضاءة أفضل وإيصالًا أقرب.",
                        Toast.LENGTH_LONG).show();
                })
                .addOnFailureListener(ex -> {
                    pendingNativeReceiptText="";
                    pendingNativeReceiptImage=thumbnail;
                    deliverNativePending();
                    Toast.makeText(this,"هحاول قراءة الإيصال بالعربي داخل Flosy.",Toast.LENGTH_LONG).show();
                })
                .addOnCompleteListener(task -> {engine.close();cleanupPhoto();});
        }catch(Exception ex){
            cleanupPhoto();
            Toast.makeText(this,"تعذرت قراءة الصورة. تأكد أنها صورة إيصال أصغر من 8MB.",
                Toast.LENGTH_LONG).show();
        }
    }

    private void deliverNativePending() {
        if(webView==null || !pageReady || webView.getUrl()==null ||
                !webView.getUrl().startsWith(HOME))return;
        if(pendingNativeReceiptText!=null) {
            final String text=pendingNativeReceiptText;
            final String img=pendingNativeReceiptImage;
            pendingNativeReceiptText=null;
            pendingNativeReceiptImage=null;
            if(img!=null){
                webView.evaluateJavascript(
                    "if(window.FLOSY_REPAIR&&window.FLOSY_REPAIR.receiveNativeReceiptImage)"+
                    "window.FLOSY_REPAIR.receiveNativeReceiptImage("+
                    JSONObject.quote(img)+","+JSONObject.quote(text)+");",null);
            }else{
                webView.evaluateJavascript(
                    "if(window.FLOSY_REPAIR&&window.FLOSY_REPAIR.receiveNativeReceipt)"+
                    "window.FLOSY_REPAIR.receiveNativeReceipt("+JSONObject.quote(text)+");",null);
            }
        }
        if(pendingVoiceText!=null) {
            final String text=pendingVoiceText;
            pendingVoiceText=null;
            webView.evaluateJavascript(
                "if(window.FLOSY_CAPTURE&&window.FLOSY_CAPTURE.receiveNativeVoice)"+
                "window.FLOSY_CAPTURE.receiveNativeVoice("+JSONObject.quote(text)+");",null);
        }
    }

    private void notifyVoiceFailure(String message){
        Toast.makeText(this,message,Toast.LENGTH_LONG).show();
        if(webView!=null && pageReady && webView.getUrl()!=null && webView.getUrl().startsWith(HOME))
            webView.evaluateJavascript(
                "if(window.FLOSY_REPAIR&&window.FLOSY_REPAIR.nativeVoiceError)"+
                "window.FLOSY_REPAIR.nativeVoiceError("+JSONObject.quote(message)+");",null);
    }

    private void sendVoiceStatus(String message){
        if(webView!=null && pageReady && webView.getUrl()!=null && webView.getUrl().startsWith(HOME))
            webView.evaluateJavascript(
                "if(window.FLOSY_REPAIR&&window.FLOSY_REPAIR.nativeVoiceStatus)"+
                "window.FLOSY_REPAIR.nativeVoiceStatus("+JSONObject.quote(message)+");",null);
    }

    private void releaseSpeech(){
        if(speechRecognizer!=null){
            try{speechRecognizer.destroy();}catch(Exception ignored){}
            speechRecognizer=null;
        }
        speechBusy=false;
    }

    private void launchSystemVoice(){
        try {
            Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,"ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT,"قول مثلًا: دفعت 75 جنيه قهوة من الفيزا");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
            speechBusy=true;
            startActivityForResult(intent,REQ_VOICE);
        }catch(Exception ex){
            speechBusy=false;
            notifyVoiceFailure("لا توجد خدمة تعرف صوتي على الهاتف. ثبّت خدمة Speech Services من متجر الهاتف، أو اكتب المصروف يدويًا.");
        }
    }

    // Free Android SpeechRecognizer. On Android 12+ prefer device-only recognition
    // when the system has a downloadable language model; otherwise use the
    // configured Android recognition service. Requires user-granted RECORD_AUDIO.
    private void startEgyptianVoice(){
        if(speechBusy)return;
        if(Build.VERSION.SDK_INT>=23 &&
            checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
            sendVoiceStatus("السماح بالميكروفون مطلوب لهذا التسجيل فقط. اختر سماح.");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},REQ_AUDIO);
            return;
        }
        if(!SpeechRecognizer.isRecognitionAvailable(this)){
            launchSystemVoice();
            return;
        }
        try{
            final boolean offline=Build.VERSION.SDK_INT>=31 &&
                SpeechRecognizer.isOnDeviceRecognitionAvailable(this);
            speechRecognizer=offline?
                SpeechRecognizer.createOnDeviceSpeechRecognizer(this):
                SpeechRecognizer.createSpeechRecognizer(this);
            speechBusy=true;
            speechRecognizer.setRecognitionListener(new RecognitionListener(){
                @Override public void onReadyForSpeech(Bundle params){sendVoiceStatus("الميكروفون جاهز، اتكلم بالمصري.");}
                @Override public void onBeginningOfSpeech(){sendVoiceStatus("بسجل كلامك الآن…");}
                @Override public void onRmsChanged(float rmsdB){}
                @Override public void onBufferReceived(byte[] buffer){}
                @Override public void onEndOfSpeech(){sendVoiceStatus("انتهى الكلام؛ جارٍ تحويله إلى نص.");}
                @Override public void onError(int code){
                    releaseSpeech();
                    // Let system's visible speech UI retry when on-device language is absent.
                    if(code==SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
                       code==SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ||
                       code==SpeechRecognizer.ERROR_CLIENT ||
                       code==SpeechRecognizer.ERROR_SERVER ||
                       code==SpeechRecognizer.ERROR_NETWORK ||
                       code==SpeechRecognizer.ERROR_NETWORK_TIMEOUT){
                        sendVoiceStatus("المحرك المحلي غير متاح لهذه اللغة. هحاول خدمة الصوت في الهاتف.");
                        launchSystemVoice();
                    }else notifyVoiceFailure("لم يكتمل التسجيل ("+code+"). راجع الإذن واتكلم بوضوح، أو جرّب زر التسجيل مجددًا.");
                }
                @Override public void onResults(Bundle results){
                    ArrayList<String> phrases=results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    releaseSpeech();
                    if(phrases!=null&&!phrases.isEmpty()&&phrases.get(0)!=null&&!phrases.get(0).trim().isEmpty()){
                        pendingVoiceText=phrases.get(0).substring(0,Math.min(320,phrases.get(0).length()));
                        deliverNativePending();
                        sendVoiceStatus("تم التعرف على الكلام، وسيتم تسجيل العملية الواضحة تلقائيًا إذا فعّلت الخيار.");
                    }else notifyVoiceFailure("لم يتعرف على الكلام. جرّب الجملة مرة أخرى.");
                }
                @Override public void onPartialResults(Bundle partialResults){}
                @Override public void onEvent(int eventType,Bundle params){}
            });
            Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
            if(offline)intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true);
            sendVoiceStatus(offline?"جاري تشغيل التسجيل المحلي المجاني…":"جاري تشغيل خدمة الكلام المتاحة على هاتفك…");
            speechRecognizer.startListening(intent);
        }catch(Exception ex){
            releaseSpeech();
            launchSystemVoice();
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
        if(requestCode==REQ_SAVE_RECEIPT){
            String payload=pendingReceiptExport;
            pendingReceiptExport=null;
            if(resultCode==RESULT_OK && data!=null && data.getData()!=null && payload!=null){
                try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                    if(out==null)throw new IllegalStateException("No output stream");
                    out.write(payload.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this,"تم حفظ نص الإيصال بنجاح.",Toast.LENGTH_LONG).show();
                }catch(Exception ex){
                    Toast.makeText(this,"فشل تصدير الإيصال. اختر مكان حفظ آخر.",Toast.LENGTH_LONG).show();
                }
            }
            return;
        }
        if(requestCode==REQ_CAMERA){
            final Uri uri=photoUri;
            if(resultCode==RESULT_OK && uri!=null)recognizeReceipt(uri);
            else cleanupPhoto();
            return;
        }
        if(requestCode == REQ_OCR) {
            if(resultCode == RESULT_OK && data != null && data.getData()!=null)
                recognizeReceipt(data.getData());
            return;
        }
        if (requestCode == REQ_VOICE) {
            speechBusy=false;
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> results=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if(results!=null && !results.isEmpty() && results.get(0)!=null &&
                        !results.get(0).trim().isEmpty()) {
                    pendingVoiceText=results.get(0).substring(0,Math.min(320,results.get(0).length()));
                    deliverNativePending();
                } else notifyVoiceFailure("لم يتم التقاط كلام واضح. حاول مرة أخرى أو اكتب المصروف.");
            } else if(resultCode!=RESULT_CANCELED)
                notifyVoiceFailure("التعرف الصوتي لم يُرجع نتيجة؛ راجع الخدمة والإذن.");
            return;
        }
        if (requestCode == PICK_FILE && selectedFiles != null) {
            Uri[] candidates=WebChromeClient.FileChooserParams.parseResult(resultCode,data);
            ArrayList<Uri> allowed=new ArrayList<>();
            if(candidates!=null)for(Uri uri:candidates) {
                if(uri!=null && "content".equalsIgnoreCase(uri.getScheme()))allowed.add(uri);
            }
            selectedFiles.onReceiveValue(allowed.isEmpty()?null:allowed.toArray(new Uri[0]));
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
    protected void onResume(){
        super.onResume();
        if(!relayWakeReceiverRegistered){
            try{
                IntentFilter filter=new IntentFilter("com.flosy.finance.AUTO_RELAY_QUEUE_UPDATED");
                if(Build.VERSION.SDK_INT>=33)registerReceiver(relayWakeReceiver,filter,Context.RECEIVER_NOT_EXPORTED);
                else registerReceiver(relayWakeReceiver,filter);
                relayWakeReceiverRegistered=true;
            }catch(Exception ignored){}
        }
        if(webView!=null&&pageReady)webView.post(this::sendRelayStatus);
    }

    @Override
    protected void onPause(){
        if(relayWakeReceiverRegistered){
            try{unregisterReceiver(relayWakeReceiver);}catch(Exception ignored){}
            relayWakeReceiverRegistered=false;
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        releaseSpeech();cleanupPhoto();
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
