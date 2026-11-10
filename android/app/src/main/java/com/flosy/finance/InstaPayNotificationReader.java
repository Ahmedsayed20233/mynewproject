package com.flosy.finance;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.regex.Pattern;

/**
 * Privileged notification access is granted solely through Android Settings.
 * This listener NEVER stores, sends, or records incoming notifications.
 * Only active InstaPay notifications are inspected following an explicit user tap.
 */
public final class InstaPayNotificationReader extends NotificationListenerService {
    private static final String INSTAPAY="com.egyptianbanks.instapay";
    private static volatile InstaPayNotificationReader live;
    private static final Pattern MONEY=Pattern.compile(
        "(?:EGP|جنيه|ج\\s*\\.?م\\.?|(?:[0-9][0-9,.]{0,15})\\s*(?:EGP|جنيه))",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern FINANCIAL=Pattern.compile(
        "خصم|دفع|حولت|تحويل|حوالة|استلام|استلمت|إيداع|ارسال|إرسال|sent|received|transfer|paid|credited",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern SECRET=Pattern.compile(
        "OTP|CVV|PIN|verification.?code|رمز.{0,12}(التحقق|السري|التفعيل)|كود.{0,12}(التحقق|السري|التفعيل)",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);

    @Override public void onListenerConnected(){super.onListenerConnected();live=this;}
    @Override public void onListenerDisconnected(){if(live==this)live=null;super.onListenerDisconnected();}
    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        // Intentionally no listening or buffering. Only manual getActiveNotifications().
    }

    public static boolean isReady(){return live!=null;}
    public static JSONArray reviewCurrent() {
        JSONArray items=new JSONArray();
        InstaPayNotificationReader service=live;
        if(service==null)return items;
        try{
            StatusBarNotification[] active=service.getActiveNotifications();
            if(active==null)return items;
            for(StatusBarNotification sbn:active){
                if(items.length()>=25)break;
                if(!INSTAPAY.equals(sbn.getPackageName())||sbn.getNotification()==null)continue;
                Bundle extras=sbn.getNotification().extras;
                if(extras==null)continue;
                CharSequence title=extras.getCharSequence(Notification.EXTRA_TITLE);
                CharSequence body=extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
                if(body==null)body=extras.getCharSequence(Notification.EXTRA_TEXT);
                String value=(title==null?"InstaPay":title.toString())+" "+
                    (body==null?"":body.toString());
                if(value.length()<8||value.length()>1200||
                   !MONEY.matcher(value).find()||
                   !FINANCIAL.matcher(value).find()||
                   SECRET.matcher(value).find())continue;
                // Mask account/card identifiers in memory before passing a candidate to
                // the local WebView review form. Never include OTP or raw metadata.
                value=value.replaceAll("(?<!\\d)(?:\\d[ -]?){12,19}(?!\\d)","[رقم مخفي]");
                JSONObject item=new JSONObject();
                item.put("date",sbn.getPostTime());
                item.put("source","instapay");
                item.put("text",value);
                items.put(item);
            }
        }catch(Exception ignored){}
        return items;
    }
}
