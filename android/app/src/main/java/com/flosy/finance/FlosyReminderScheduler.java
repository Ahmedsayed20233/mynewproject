package com.flosy.finance;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Opt-in, entirely local payment-due reminders.
 * No SMS, notification listener, bank names, amounts, contacts or remote service.
 * Uses inexact AlarmManager delivery: the OS may delay notifications.
 */
public final class FlosyReminderScheduler {
    static final String CHANNEL="flosy_payment_reminders";
    static final String ACTION_DUE="com.flosy.finance.LOCAL_BILL_DUE";
    static final String ACTION_DAILY="com.flosy.finance.LOCAL_DAILY_INSIGHT";
    private static final int DAILY_ID=43920;
    private static final String PREF="flosy_local_reminders_v1";
    private static final String ENABLED="enabled",ROWS="rows",PENDING_IDS="pending_ids",DAILY="daily_enabled",FIRST_NAME="first_name";
    private FlosyReminderScheduler(){}
    private static SharedPreferences prefs(Context c){
        return c.getApplicationContext().getSharedPreferences(PREF,Context.MODE_PRIVATE);
    }
    public static boolean enabled(Context c){return prefs(c).getBoolean(ENABLED,false);}
    public static boolean dailyEnabled(Context c){return prefs(c).getBoolean(DAILY,false);}
    public static void setFirstName(Context c,String candidate){
        String safe=String.valueOf(candidate==null?"":candidate)
            .replaceAll("[^\\p{L} ]","").trim();
        if(safe.length()>24)safe=safe.substring(0,24);
        prefs(c).edit().putString(FIRST_NAME,safe).apply();
    }
    public static boolean permission(Context c){
        return Build.VERSION.SDK_INT<33 ||
            c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
    }
    public static JSONObject status(Context c){
        JSONObject result=new JSONObject();
        try{
            result.put("enabled",enabled(c));
            result.put("dailyEnabled",dailyEnabled(c));
            result.put("permission",permission(c)?"granted":"denied");
            result.put("scheduled",prefs(c).getString(PENDING_IDS,"").isEmpty()?0:
                prefs(c).getString(PENDING_IDS,"").split(",").length);
        }catch(Exception ignored){}
        return result;
    }
    public static void setEnabled(Context c,boolean on){
        prefs(c).edit().putBoolean(ENABLED,on).apply();
        if(on)reschedule(c);
        else {cancel(c,true);setDaily(c,false);}
    }
    private static PendingIntent pending(Context c,int id,long timestamp){
        Intent intent=new Intent(c,FlosyReminderReceiver.class);
        intent.setAction(ACTION_DUE).putExtra("id",id).putExtra("timestamp",timestamp);
        return PendingIntent.getBroadcast(c,id,intent,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    public static void setDaily(Context c,boolean on){
        prefs(c).edit().putBoolean(DAILY,on).apply();
        scheduleDaily(c);
    }
    private static void scheduleDaily(Context c){
        AlarmManager alarm=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        Intent intent=new Intent(c,FlosyReminderReceiver.class).setAction(ACTION_DAILY);
        PendingIntent pi=PendingIntent.getBroadcast(c,DAILY_ID,intent,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        if(alarm==null)return;
        alarm.cancel(pi);
        if(!dailyEnabled(c)||!enabled(c)||!permission(c))return;
        Calendar cal=Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY,9);cal.set(Calendar.MINUTE,0);
        cal.set(Calendar.SECOND,0);cal.set(Calendar.MILLISECOND,0);
        if(cal.getTimeInMillis()<=System.currentTimeMillis())cal.add(Calendar.DAY_OF_MONTH,1);
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,cal.getTimeInMillis(),pi);
    }
    public static void notifyDaily(Context c){
        if(!enabled(c)||!dailyEnabled(c)||!permission(c))return;
        String name=prefs(c).getString(FIRST_NAME,"");
        notify(c,"فلوسي AI — اقتراحك المالي اليوم",
            "صباح الخير"+(name.isEmpty()?"":" يا "+name)+
            "! افتح فلوسي علشان تشوف خطة وتوصية اليوم المبنية على معاملاتك.");
        scheduleDaily(c); // schedule the next local morning; OS may delay in Doze.
    }
    private static void cancel(Context c,boolean erase){
        AlarmManager alarms=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        String ids=prefs(c).getString(PENDING_IDS,"");
        for(String s:ids.split(",")){
            if(s.isEmpty())continue;
            try{
                int id=Integer.parseInt(s);
                PendingIntent p=pending(c,id,0);
                if(alarms!=null)alarms.cancel(p);
                p.cancel();
            }catch(Exception ignored){}
        }
        SharedPreferences.Editor edit=prefs(c).edit().remove(PENDING_IDS);
        if(erase)edit.remove(ROWS);
        edit.apply();
    }
    public static boolean sync(Context c,JSONArray payload){
        if(payload==null||payload.length()>12)return false;
        JSONArray safe=new JSONArray();
        for(int i=0;i<payload.length();i++){
            JSONObject row=payload.optJSONObject(i);
            if(row==null)return false;
            String date=row.optString("date",""),id=row.optString("id","");
            if(!date.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") ||
                id.isEmpty()||id.length()>90)return false;
            SimpleDateFormat df=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
            df.setLenient(false);
            try{
                Date d=df.parse(date);
                long ms=d.getTime(),now=System.currentTimeMillis();
                if(ms<now-3L*86400000||ms>now+35L*86400000)return false;
            }catch(Exception ex){return false;}
            JSONObject clean=new JSONObject();
            try{clean.put("id",id);clean.put("date",date);safe.put(clean);}
            catch(Exception ex){return false;}
        }
        prefs(c).edit().putString(ROWS,safe.toString()).apply();
        reschedule(c);return true;
    }
    public static void reschedule(Context c){
        cancel(c,false);
        if(!enabled(c)||!permission(c))return;
        AlarmManager alarms=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if(alarms==null)return;
        JSONArray rows;
        try{rows=new JSONArray(prefs(c).getString(ROWS,"[]"));}catch(Exception e){return;}
        long now=System.currentTimeMillis();ArrayList<String> ids=new ArrayList<>();
        for(int i=0;i<rows.length()&&i<12;i++){
            JSONObject row=rows.optJSONObject(i);if(row==null)continue;
            String day=row.optString("date",""),key=row.optString("id","");
            if(!day.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")||key.isEmpty())continue;
            for(int advance=1;advance>=0;advance--){
                try{
                    SimpleDateFormat df=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
                    df.setLenient(false);
                    Date date=df.parse(day);
                    Calendar cal=Calendar.getInstance();
                    cal.setTime(date);cal.add(Calendar.DAY_OF_MONTH,-advance);
                    cal.set(Calendar.HOUR_OF_DAY,9);cal.set(Calendar.MINUTE,0);
                    cal.set(Calendar.SECOND,0);cal.set(Calendar.MILLISECOND,0);
                    long when=cal.getTimeInMillis();
                    if(when<=now||when>now+35L*86400000)continue;
                    int id=(key+"|"+day+"|"+advance).hashCode()&0x7fffffff;
                    // Inexact alarms avoid restricted exact-alarm permissions.
                    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pending(c,id,when));
                    ids.add(String.valueOf(id));
                }catch(Exception ignored){}
            }
        }
        prefs(c).edit().putString(PENDING_IDS,android.text.TextUtils.join(",",ids)).apply();
        scheduleDaily(c);
    }
    public static void notifyDue(Context c){
        if(!enabled(c)||!permission(c))return;
        notify(c,"فلوسي — تذكير بموعد مالي",
            "عندك فاتورة أو قسط قريب. افتح فلوسي لمراجعة المواعيد.");
    }
    public static boolean test(Context c){
        if(!enabled(c)||!permission(c))return false;
        notify(c,"فلوسي — اختبار الإشعارات","تم تفعيل إشعارات فلوسي المحلية بنجاح.");
        return true;
    }
    private static void notify(Context c,String title,String body){
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if(nm==null)return;
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel channel=new NotificationChannel(CHANNEL,"تنبيهات فواتير فلوسي",
                NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("تذكيرات محلية باقتراب مواعيد الفواتير والأقساط");
            nm.createNotificationChannel(channel);
        }
        Intent open=new Intent(c,MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap=PendingIntent.getActivity(c,4001,open,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?
            new Notification.Builder(c,CHANNEL):new Notification.Builder(c);
        builder.setContentTitle(title).setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info).setAutoCancel(true)
            .setContentIntent(tap).setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE);
        try{nm.notify((int)(System.currentTimeMillis()/60000L%100000),builder.build());}
        catch(SecurityException ignored){}
    }
}
