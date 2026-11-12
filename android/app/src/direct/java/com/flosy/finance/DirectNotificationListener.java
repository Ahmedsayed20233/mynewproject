package com.flosy.finance;

import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/** Direct financial-app notifications; exact package allowlist is checked before text extraction. */
public final class DirectNotificationListener extends NotificationListenerService {
    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(sbn==null||sbn.getNotification()==null)return;
        String pkg=sbn.getPackageName();
        if(!AutoRelayStore.allowedNativeApp(this,pkg))return;
        Bundle data=sbn.getNotification().extras;
        if(data==null)return;
        CharSequence title=data.getCharSequence(Notification.EXTRA_TITLE);
        // Messaging-app notifications are usable only when the visible notification
        // sender exactly matches a user-approved bank sender. Never ingest private chats.
        if(isSmsMessagingApp(pkg)&&
            (title==null||!AutoRelayStore.allowedNativeSender(this,title.toString())))
            return;
        CharSequence message=data.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if(message==null)message=data.getCharSequence(Notification.EXTRA_TEXT);
        if(message==null)return;
        String text=(title==null?"":title+" ")+message.toString();
        if(text.length()>2000)return;
        if(AutoRelayStore.acceptDirect(this,"notification",pkg,text,sbn.getPostTime()))
            sendBroadcast(new Intent("com.flosy.finance.AUTO_RELAY_QUEUE_UPDATED").setPackage(getPackageName()));
    }
    private static boolean isSmsMessagingApp(String pkg){
        return "com.google.android.apps.messaging".equals(pkg) ||
            "com.samsung.android.messaging".equals(pkg) ||
            "com.android.mms".equals(pkg) ||
            "com.android.messaging".equals(pkg);
    }
}