package com.flosy.finance;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/**
 * SMS_RECEIVED_ACTION (not default SMS handling).
 * Never forwards SMS to a server or saves transactions; captures only short,
 * owner-allowlisted, non-OTP finance candidates into a Keystore-encrypted queue.
 * Effective only after Google Play approval, Android permission and user opt-in.
 */
public final class FinancialSmsReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        if(intent==null||
           !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())||
           !FinancialAutoImport.enabled(context))return;
        SmsMessage[] parts=Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if(parts==null||parts.length==0)return;
        String sender=parts[0].getDisplayOriginatingAddress();
        if(!FinancialAutoImport.trustedSmsSender(context,sender))return;
        StringBuilder msg=new StringBuilder();
        long date=parts[0].getTimestampMillis();
        for(SmsMessage part:parts){
            if(part==null||!sender.equals(part.getDisplayOriginatingAddress()))return;
            String text=part.getDisplayMessageBody();
            if(text==null)return;
            msg.append(text);
            if(msg.length()>4000)return;
        }
        FinancialAutoImport.capture(context,"sms",sender,msg.toString(),date);
    }
}
