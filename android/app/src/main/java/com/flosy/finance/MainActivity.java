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

public class MainActivity extends Activity {
    private static final String HOME = "https://ahmedsayed20233.github.io/mynewproject/";
    private static final String HOME_HOST = "ahmedsayed20233.github.io";
    private static final int PICK_FILE = 71;
    private WebView webView;
    private ProgressBar loadingBar;
    private ValueCallback<Uri[]> selectedFiles;
    private long lastBackPressTime = 0L;
    private String pendingSharedMessage = null;
    private boolean pageReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(8, 20, 34));
        getWindow().setNavigationBarColor(Color.rgb(8, 20, 34));

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 20, 34));
        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        loadingBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        loadingBar.setMax(100);
        loadingBar.setProgressTintList(ColorStateList.valueOf(Color.rgb(35, 220, 177)));
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
                    view.evaluateJavascript("window.FLOSY_NATIVE_ANDROID=true;", null);
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
                        + "<style>body{background:#081422;color:#ecf5ff;font-family:sans-serif;"
                        + "padding:40px;text-align:center}a{display:inline-block;background:#24deb2;"
                        + "color:#081422;text-decoration:none;padding:13px 24px;border-radius:12px;"
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
