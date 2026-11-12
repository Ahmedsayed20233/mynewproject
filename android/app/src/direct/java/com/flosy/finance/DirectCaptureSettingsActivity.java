package com.flosy.finance;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/** Native opt-in screen; it never requests bank credentials. */
public final class DirectCaptureSettingsActivity extends Activity {
    private static final int SMS_REQUEST=101;
    private LinearLayout layout;
    private EditText senders,apps;
    private CheckBox consent;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        ScrollView scroll=new ScrollView(this);
        layout=new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        layout.setPadding(25,25,25,25);
        layout.setBackgroundColor(Color.WHITE);
        scroll.addView(layout);setContentView(scroll);
        label("فلوسي — التقاط مباشر بدون Automate",22);
        label("جرّب على هاتفك فقط. تابع مرسلي البنوك والتطبيقات التي تختارها. لا نقرأ الرسائل القديمة.",14);
        label("المرسلون الحقيقيون (مفصولون بفاصلة)",14);
        senders=new EditText(this);
        senders.setHint("CIB,NBE");senders.setText(AutoRelayStore.senders(this));layout.addView(senders);
        label("حزم تطبيقات الإشعارات المالية",14);
        apps=new EditText(this);
        apps.setHint("com.egyptianbanks.instapay");apps.setText(AutoRelayStore.apps(this));layout.addView(apps);
        consent=new CheckBox(this);consent.setText("أوافق على التقاط الأحداث من هذه المصادر فقط");
        consent.setChecked(AutoRelayStore.directEnabled(this));layout.addView(consent);
        button("حفظ المصادر والتفعيل",()->{
            AutoRelayStore.configure(this,senders.getText().toString(),apps.getText().toString());
            boolean ok=!AutoRelayStore.senders(this).isEmpty()||!AutoRelayStore.apps(this).isEmpty();
            AutoRelayStore.setDirectEnabled(this,ok&&consent.isChecked());
            consent.setChecked(ok&&consent.isChecked());
            toast(ok?"تم الحفظ؛ امنح الصلاحيات من الخطوات التالية":"أضف مصدرًا أولًا");
        });
        button("منح إذن SMS للرسائل الجديدة",()->{
            if(!AutoRelayStore.directEnabled(this)||AutoRelayStore.senders(this).isEmpty()){
                toast("فعّل الموافقة وحدد مرسلًا أولًا");return;
            }
            if(checkSelfPermission(Manifest.permission.RECEIVE_SMS)!=PackageManager.PERMISSION_GRANTED)
                requestPermissions(new String[]{Manifest.permission.RECEIVE_SMS},SMS_REQUEST);
            else toast("SMS مسموح، إذا كانت سياسة الجهاز تتيح الاستقبال");
        });
        button("فتح إعدادات الوصول للإشعارات",()->{
            if(!AutoRelayStore.directEnabled(this)||AutoRelayStore.apps(this).isEmpty()){
                toast("فعّل الموافقة وحدد تطبيقًا أولًا");return;
            }
            try{startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));}
            catch(Exception e){toast("إعدادات الإشعارات غير متاحة");}
        });
        button("فحص الصلاحيات",()->{
            boolean sms=checkSelfPermission(Manifest.permission.RECEIVE_SMS)==PackageManager.PERMISSION_GRANTED;
            boolean notif=false;
            if(Build.VERSION.SDK_INT>=27){
                NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
                notif=nm!=null&&nm.isNotificationListenerAccessGranted(
                    new ComponentName(this,DirectNotificationListener.class));
            }
            toast("SMS: "+(sms?"ممنوح":"غير ممنوح")+"، الإشعارات: "+(notif?"ممنوحة":"غير مؤكدة"));
        });
        button("إيقاف الاستيراد ومسح المرشحات",()->{
            AutoRelayStore.setDirectEnabled(this,false);AutoRelayStore.clear(this);
            consent.setChecked(false);toast("تم إيقاف الالتقاط");
        });
        label("Android قد يمنع RECEIVE_SMS لأنه إذن مقيد، حتى مع موافقتك. هذه نسخة Lab وغير معتمدة لمتجر Google Play. لا تُعطّل حماية الهاتف.",12);
    }
    private void label(String text,int size){
        TextView t=new TextView(this);t.setText(text);t.setTextSize(size);
        t.setTextColor(Color.rgb(22,50,52));t.setPadding(0,9,0,8);layout.addView(t);
    }
    private void button(String text,Runnable act){
        Button b=new Button(this);b.setText(text);b.setAllCaps(false);
        layout.addView(b);b.setOnClickListener(v->act.run());
    }
    private void toast(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
    @Override public void onRequestPermissionsResult(int req,String[] p,int[] results){
        super.onRequestPermissionsResult(req,p,results);
        if(req==SMS_REQUEST)toast(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED?
            "تم منح SMS":"SMS مرفوض أو مقيّد من Android");
    }
}