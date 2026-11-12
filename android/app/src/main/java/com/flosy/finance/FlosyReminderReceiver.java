package com.flosy.finance;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restores opt-in local payment reminders after reboot and fires alarms. */
public final class FlosyReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        if(intent==null)return;
        String action=intent.getAction();
        if(FlosyReminderScheduler.ACTION_DUE.equals(action)){
            FlosyReminderScheduler.notifyDue(context);
        }else if(Intent.ACTION_BOOT_COMPLETED.equals(action)
            ||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)){
            FlosyReminderScheduler.reschedule(context);
        }
    }
}
