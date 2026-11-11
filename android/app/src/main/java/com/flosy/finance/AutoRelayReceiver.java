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
        try {
            String text=intent.getStringExtra("text");
            String token=intent.getStringExtra("token");
            String source=intent.getStringExtra("source");
            String sender=intent.getStringExtra("sender");
            long millis=System.currentTimeMillis();
            // Avoid ClassCastException if Automate provides timestamp as a String.
            Object raw=intent.hasExtra("timestamp")&&intent.getExtras()!=null?
                intent.getExtras().get("timestamp"):null;
            if(raw instanceof Number)millis=((Number)raw).longValue();
            else if(raw instanceof String){
                try{millis=Long.parseLong((String)raw);}catch(NumberFormatException ignored){}
            }
            AutoRelayStore.accept(context.getApplicationContext(),
                token,source,sender,text,millis);
        } catch(Exception ignored){
            // Diagnostic code only; never log message text, sender, or secret.
            AutoRelayStore.invalidExtras(context.getApplicationContext());
        }
    }
}
