package com.flosy.finance;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/** Only new Android-delivered messages from owner-allowlisted senders. */
public final class DirectSmsReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent event){
        if(!BuildConfig.FINANCIAL_MESSAGE_IMPORT_ENABLED||event==null||!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(event.getAction()))return;
        if(!AutoRelayStore.directEnabled(c))return;
        if(c.checkSelfPermission(Manifest.permission.RECEIVE_SMS)!=PackageManager.PERMISSION_GRANTED)return;
        SmsMessage[] parts=Telephony.Sms.Intents.getMessagesFromIntent(event);
        if(parts==null||parts.length==0||parts[0]==null)return;
        String sender=parts[0].getDisplayOriginatingAddress();
        if(!AutoRelayStore.allowedNativeSender(c,sender))return;
        StringBuilder body=new StringBuilder();
        for(SmsMessage part:parts){
            if(part==null||!sender.equals(part.getDisplayOriginatingAddress()))return;
            String text=part.getDisplayMessageBody();
            if(text==null||body.length()+text.length()>2000)return;
            body.append(text);
        }
        if(AutoRelayStore.acceptDirect(c,"sms",sender,body.toString(),parts[0].getTimestampMillis()))
            c.sendBroadcast(new Intent("com.flosy.finance.AUTO_RELAY_QUEUE_UPDATED").setPackage(c.getPackageName()));
    }
}