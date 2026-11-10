package com.flosy.finance;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * Called by Android only after the user grants Notification Access.
 * Android exposes notifications broadly; inspect ONLY the package name until
 * it matches the verified InstaPay package or the owner's explicit allowlist.
 * No background network requests, screenshots, accessibility, or raw-data logs.
 */
public final class FinancialNotificationListener extends NotificationListenerService {
    @Override public void onListenerConnected(){
        super.onListenerConnected();
        if(!FinancialAutoImport.enabled(this))return;
        try{
            StatusBarNotification[] active=getActiveNotifications();
            if(active!=null){
                int inspected=0;
                for(StatusBarNotification item:active){
                    if(++inspected>80)break;
                    onNotificationPosted(item);
                }
            }
        }catch(SecurityException ignored){}
    }

    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(sbn==null||!FinancialAutoImport.enabled(this))return;
        String packageName=sbn.getPackageName();
        if(!FinancialAutoImport.trustedNotification(this,packageName))return;
        Notification n=sbn.getNotification();if(n==null||n.extras==null)return;
        Bundle e=n.extras;
        CharSequence big=e.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence regular=e.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence title=e.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence content=big!=null?big:regular;
        if(content==null||content.length()==0)return;
        String summary=String.valueOf(title==null?"":title)+" "+content;
        FinancialAutoImport.capture(this,"notification",packageName,summary,sbn.getPostTime());
    }
}
