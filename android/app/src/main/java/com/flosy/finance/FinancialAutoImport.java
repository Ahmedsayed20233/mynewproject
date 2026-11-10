package com.flosy.finance;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.Telephony;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.regex.Pattern;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Owner-enabled, Play-policy-review-only financial-import queue.
 *
 * No background network, no logging and no financial ledger writes. Non-financial,
 * personal, failed and verification-code messages are discarded before persistence.
 * Only bounded redacted candidates are kept encrypted by Android Keystore until
 * the user approves each transaction in Flosy's normal finance review form.
 */
public final class FinancialAutoImport {
    private FinancialAutoImport(){}
    private static final String PREFS="flosy_owner_auto_import_v1";
    private static final String KEY_ALIAS="FlosyOwnerFinancialQueueAesV1";
    private static final String K_ENABLED="enabled",K_SENDERS="senders",K_APPS="apps",K_PENDING="pending";
    private static final int MAX_PENDING=60;
    private static final long MAX_AGE_MS=30L*24*60*60*1000;
    private static final Pattern CONFIRMED=Pattern.compile(
        "خصم|سحب|دفع|شراء|تم تحويل|تم التحويل|تم إرسال|تم ارسال|تم استلام|استلمت|حوالة|إيداع|ايداع|credited|debited|purchase|paid|sent|received|transferred|deposit|withdrawn",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern MONEY=Pattern.compile(
        "(?:EGP|جنيه|جنيها|ج\\.?\\s*م\\.?|L\\.?E\\.?)",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern SECRET=Pattern.compile(
        "OTP|CVV|PIN|one[ -]?time.?password|verification.?code|security.?code|رمز.{0,16}(التحقق|التفعيل|السري)|كود.{0,16}(التحقق|التفعيل)|كلمة\\s*السر",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern FAILED=Pattern.compile(
        "لم تتم|فشل|فشلت|تم رفض|لم تنجح|pending|failed|declined|cancelled|canceled|reversed|معلقة",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern ACCOUNT=Pattern.compile("(?<!\\d)(?:\\d[ -]?){12,19}(?!\\d)");
    private static final Pattern PHONE=Pattern.compile("(?<!\\d)(?:\\+?20|0)1[0125]\\d{8}(?!\\d)");
    private static final Pattern EMAIL=Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",Pattern.CASE_INSENSITIVE);
    private static final String INSTAPAY="com.egyptianbanks.instapay";
    private static final SecureRandom RANDOM=new SecureRandom();

    private static SharedPreferences prefs(Context c){
        return c.getApplicationContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    }
    public static boolean enabled(Context c){return prefs(c).getBoolean(K_ENABLED,false);}
    public static void enable(Context c){prefs(c).edit().putBoolean(K_ENABLED,true).apply();}
    public static void disable(Context c){
        // Revoke in-app collection and erase pending ciphertext; Android permission
        // must also be separately revoked in Android Settings if the user wishes.
        prefs(c).edit().putBoolean(K_ENABLED,false).remove(K_PENDING).apply();
    }
    private static String norm(String s){return (s==null?"":s).trim().toUpperCase(Locale.ROOT);}
    private static String csvSafe(String csv, boolean packages){
        StringBuilder out=new StringBuilder();
        for(String item:String.valueOf(csv==null?"":csv).split("[,;\\n]")){
            String value=norm(item);
            if(packages)value=value.toLowerCase(Locale.ROOT);
            if(value.isEmpty()||value.length()>75)continue;
            if(packages&&!value.matches("[a-z][a-z0-9_]*(\\.[a-z0-9_]+)+"))continue;
            if(!packages&&!value.matches("[A-Z0-9+_. -]{2,40}"))continue;
            if(out.length()>0)out.append(',');
            out.append(value);
            if(out.length()>600)break;
        }
        return out.toString();
    }
    public static void configure(Context c,String senders,String appPackages){
        prefs(c).edit().putString(K_SENDERS,csvSafe(senders,false))
            .putString(K_APPS,csvSafe(appPackages,true)).apply();
    }
    public static String senders(Context c){return prefs(c).getString(K_SENDERS,"");}
    public static String apps(Context c){return prefs(c).getString(K_APPS,"");}
    public static boolean trustedSmsSender(Context c,String sender){
        String s=norm(sender);
        if(s.length()<2)return false;
        String allowed=senders(c);
        if(allowed.isEmpty())return false; // Fail closed until owner selects senders.
        for(String id:allowed.split(","))if(id.equals(s))return true;
        return false;
    }
    public static boolean trustedNotification(Context c,String pkg){
        if(INSTAPAY.equals(pkg))return true;
        String allowed=apps(c);
        for(String id:allowed.split(","))if(id.equals(pkg))return true;
        return false;
    }
    public static boolean smsPermission(Context c){
        return android.os.Build.VERSION.SDK_INT<23 ||
          c.checkSelfPermission(Manifest.permission.READ_SMS)==PackageManager.PERMISSION_GRANTED;
    }

    public static synchronized boolean capture(Context c,String source,String sender,String input,long date){
        if(!enabled(c)||input==null||input.length()<8||input.length()>4000)return false;
        if(!"sms".equals(source)&&!"instapay".equals(source)&&!"notification".equals(source))return false;
        if("sms".equals(source)){
            if(!trustedSmsSender(c,sender))return false;
        }else if(!trustedNotification(c,sender))return false;
        String text=input.trim();
        if(SECRET.matcher(text).find()||FAILED.matcher(text).find()||
            !CONFIRMED.matcher(text).find()||!MONEY.matcher(text).find())return false;
        if(date<1)date=System.currentTimeMillis();
        if(date<System.currentTimeMillis()-MAX_AGE_MS ||
            date>System.currentTimeMillis()+24L*60*60*1000)return false;
        // Redact identifying numbers and contact details before persistent storage.
        String redacted=ACCOUNT.matcher(text).replaceAll("[رقم حساب مخفي]");
        redacted=PHONE.matcher(redacted).replaceAll("[رقم هاتف مخفي]");
        redacted=EMAIL.matcher(redacted).replaceAll("[بريد مخفي]");
        if(redacted.length()>650)redacted=redacted.substring(0,650);
        try{
            JSONArray arr=readQueue(c);
            String fingerprint=digest(source+"|"+sender+"|"+redacted+"|"+date/(15L*60*1000));
            for(int i=0;i<arr.length();i++)
                if(fingerprint.equals(arr.optJSONObject(i).optString("fingerprint")))return false;
            JSONObject item=new JSONObject();
            item.put("id",fingerprint);
            item.put("fingerprint",fingerprint);
            item.put("source","sms".equals(source)?"sms":"instapay");
            item.put("date",date);
            item.put("text",redacted);
            item.put("sender",sender==null?"":sender.substring(0,Math.min(50,sender.length())));
            arr.put(item);
            JSONArray kept=new JSONArray();
            for(int i=Math.max(0,arr.length()-MAX_PENDING);i<arr.length();i++)kept.put(arr.get(i));
            writeQueue(c,kept);
            return true;
        }catch(Exception ex){return false;}
    }
    private static String digest(String text)throws Exception{
        byte[] bytes=MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb=new StringBuilder();
        for(int i=0;i<16;i++)sb.append(String.format(Locale.ROOT,"%02x",bytes[i]&0xff));
        return sb.toString();
    }
    private static SecretKey key() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(ks.containsAlias(KEY_ALIAS))return (SecretKey)ks.getKey(KEY_ALIAS,null);
        KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).build());
        return kg.generateKey();
    }
    private static JSONArray readQueue(Context c){
        String payload=prefs(c).getString(K_PENDING,"");
        if(payload.isEmpty())return new JSONArray();
        try{
            byte[] bytes=Base64.decode(payload,Base64.NO_WRAP);
            if(bytes.length<=12)return new JSONArray();
            byte[] iv=new byte[12],ciphertext=new byte[bytes.length-12];
            System.arraycopy(bytes,0,iv,0,12);
            System.arraycopy(bytes,12,ciphertext,0,ciphertext.length);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
            return new JSONArray(new String(cipher.doFinal(ciphertext),StandardCharsets.UTF_8));
        }catch(Exception ex){
            // Never downgrade encryption. Key can be invalid after backup/reinstall;
            // discard undecryptable candidates without exposing data.
            prefs(c).edit().remove(K_PENDING).apply();
            return new JSONArray();
        }
    }
    private static void writeQueue(Context c,JSONArray arr)throws Exception{
        byte[] iv=new byte[12];RANDOM.nextBytes(iv);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,key(),new GCMParameterSpec(128,iv));
        byte[] data=cipher.doFinal(arr.toString().getBytes(StandardCharsets.UTF_8));
        byte[] combined=new byte[12+data.length];
        System.arraycopy(iv,0,combined,0,12);
        System.arraycopy(data,0,combined,12,data.length);
        prefs(c).edit().putString(K_PENDING,Base64.encodeToString(combined,Base64.NO_WRAP)).apply();
    }
    public static synchronized JSONArray pending(Context c){
        JSONArray src=readQueue(c),result=new JSONArray();
        long cutoff=System.currentTimeMillis()-MAX_AGE_MS;
        for(int i=0;i<src.length();i++){
            JSONObject o=src.optJSONObject(i);
            if(o!=null&&o.optLong("date")>=cutoff)result.put(o);
        }
        if(result.length()!=src.length()){
            try{writeQueue(c,result);}catch(Exception ignored){}
        }
        return result;
    }
    public static synchronized void clear(Context c){
        prefs(c).edit().remove(K_PENDING).apply();
    }
    public static synchronized void remove(Context c,String id){
        JSONArray src=readQueue(c),out=new JSONArray();
        for(int i=0;i<src.length();i++){
            JSONObject o=src.optJSONObject(i);
            if(o!=null&&!id.equals(o.optString("id")))out.put(o);
        }
        try{writeQueue(c,out);}catch(Exception ignored){}
    }
    public static int importExistingSms(Context c){
        if(!enabled(c)||!smsPermission(c)||senders(c).isEmpty())return 0;
        String[] columns={Telephony.Sms.ADDRESS,Telephony.Sms.BODY,Telephony.Sms.DATE};
        long earliest=System.currentTimeMillis()-MAX_AGE_MS;
        int seen=0,accepted=0;
        try(Cursor cur=c.getContentResolver().query(Telephony.Sms.Inbox.CONTENT_URI,columns,
              Telephony.Sms.DATE+" >= ?",new String[]{String.valueOf(earliest)},
              Telephony.Sms.DATE+" DESC")){
            if(cur!=null)while(cur.moveToNext()&&seen<400&&accepted<MAX_PENDING){
                seen++;
                String sender=cur.getString(0);
                if(!trustedSmsSender(c,sender))continue;
                if(capture(c,"sms",sender,cur.getString(1),cur.getLong(2)))accepted++;
            }
        }catch(SecurityException ignored){}
        return accepted;
    }
}
