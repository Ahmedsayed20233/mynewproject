package com.flosy.finance;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * External, explicit Automate/MacroDroid broadcast. Requires a secret generated
 * by Flosy after a user pairing tap. No system SMS/notification permissions.
 * Never opens an activity, transmits data, or auto-saves a finance entry.
 */
public final class AutoRelayReceiver extends BroadcastReceiver {
    public static final String ACTION="com.flosy.finance.REVIEW_EXTERNAL_FINANCIAL_EVENT";
    @Override public void onReceive(Context context,Intent intent) {
        if(intent==null||!ACTION.equals(intent.getAction()))return;
        String text=intent.getStringExtra("text");
        String token=intent.getStringExtra("token");
        String source=intent.getStringExtra("source");
        String sender=intent.getStringExtra("sender");
        long millis=intent.getLongExtra("timestamp",0L);
        // Some automation tools serialize all dictionary values as Strings.
        if(millis<=0){
            String time=intent.getStringExtra("timestamp");
            try{millis=Long.parseLong(time==null?"":time);}
            catch(NumberFormatException ignored){millis=System.currentTimeMillis();}
        }
        AutoRelayStore.accept(context.getApplicationContext(),
            token,source,sender,text,millis);
    }
}
