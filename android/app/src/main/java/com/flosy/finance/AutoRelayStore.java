package com.flosy.finance;

import android.content.Context;
import android.content.SharedPreferences;
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
 * Flosy safe variant's offline queue for explicit automation broadcasts.
 * Neither Flosy APK variant requests READ_SMS, RECEIVE_SMS or notification access.
 * A user-selected and Play-installed automation application is responsible for
 * reading permitted sources; Flosy verifies a 192-bit pairing token + allowlist.
 */
public final class AutoRelayStore {
    private AutoRelayStore(){}
    private static final String PREFS="flosy_safe_automate_v1";
    private static final String CRYPTO="FlosySafeRelayAesGcmV1";
    private static final String ENABLE="enabled",TOKEN_HASH="pair_hash",QUEUE="queue";
    // Diagnostic metadata only: never persist sender, message, account number or token.
    private static final String LAST_DELIVERY="last_delivery_code";
    private static final String LAST_DELIVERY_AT="last_delivery_at";
    public static String lastDeliveryCode(Context c){
        return p(c).getString(LAST_DELIVERY,"none");
    }
    public static long lastDeliveryAt(Context c){
        return p(c).getLong(LAST_DELIVERY_AT,0L);
    }
    private static boolean outcome(Context c,String code,boolean accepted){
        p(c).edit().putString(LAST_DELIVERY,code)
            .putLong(LAST_DELIVERY_AT,System.currentTimeMillis()).apply();
        return accepted;
    }
    public static void invalidExtras(Context c){outcome(c,"invalid_extras",false);}

    private static final String SENDERS="senders",APPS="apps";
    private static final String INSTA="com.egyptianbanks.instapay";
    private static final SecureRandom RNG=new SecureRandom();
    private static final long MAX_AGE_MS=30L*24*60*60*1000;
    private static final Pattern TX=Pattern.compile(
        "خصم|دفع|شراء|سحب|إيداع|ايداع|استلمت|تم استلام|تم تحويل|تم التحويل|تم ارسال|تم إرسال|حوالة|received|debited|credited|sent|paid|purchased|transferred|withdrawn|deposit",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern CURRENCY=Pattern.compile(
        "(?:EGP|جنيه|جنيها|ج\\.?\\s*م\\.?|L\\.?E\\.?)",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern SECRET=Pattern.compile(
        "OTP|CVV|PIN|one[ -]?time.?password|verification.?code|security.?code|رمز.{0,16}(التحقق|التفعيل|السري)|كود.{0,16}(التحقق|التفعيل)|كلمة\\s*السر",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern FAILED=Pattern.compile(
        "فشل|فشلت|لم تتم|لم تنجح|تم رفض|pending|failed|declined|cancelled|canceled|reversed|معلقة",
        Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
    private static final Pattern CARD=Pattern.compile("(?<!\\d)(?:\\d[ -]?){12,19}(?!\\d)");
    private static final Pattern PHONE=Pattern.compile("(?<!\\d)(?:\\+?20|0)1[0125]\\d{8}(?!\\d)");
    private static final Pattern EMAIL=Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",Pattern.CASE_INSENSITIVE);
    private static SharedPreferences p(Context c){
        return c.getApplicationContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    }
    public static boolean paired(Context c){
        return p(c).getBoolean(ENABLE,false)&&p(c).contains(TOKEN_HASH);
    }
    private static byte[] hash(String s) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
    }
    private static String hex(byte[] bytes){
        StringBuilder b=new StringBuilder();
        for(byte a:bytes)b.append(String.format(Locale.ROOT,"%02x",a&0xff));
        return b.toString();
    }
    /** Only called after explicit pairing tap in the trusted Flosy WebView origin. */
    public static synchronized String createPair(Context c){
        byte[] token=new byte[24];RNG.nextBytes(token);
        String raw=hex(token);
        try{
            // Rotate token + clear candidates to reject any prior automation silently.
            p(c).edit().putString(TOKEN_HASH,hex(hash(raw)))
                .putBoolean(ENABLE,true).remove(QUEUE)
                .remove(LAST_DELIVERY).remove(LAST_DELIVERY_AT).commit();
        }catch(Exception ignored){return "";}
        return raw;
    }
    private static boolean verify(Context c,String presented){
        if(!paired(c)||presented==null||!presented.matches("[0-9a-f]{48}"))return false;
        try{
            String expected=p(c).getString(TOKEN_HASH,"");
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                hex(hash(presented)).getBytes(StandardCharsets.US_ASCII));
        }catch(Exception err){return false;}
    }
    public static void stop(Context c){
        p(c).edit().remove(TOKEN_HASH).remove(QUEUE).putBoolean(ENABLE,false).commit();
    }
    private static String norm(String s){return String.valueOf(s==null?"":s).trim().toUpperCase(Locale.ROOT);}
    private static String allowlist(String list,boolean apps){
        StringBuilder out=new StringBuilder();
        for(String word:String.valueOf(list==null?"":list).split("[,;\\n]")){
            String w=apps?word.trim().toLowerCase(Locale.ROOT):norm(word);
            if(apps&&!w.matches("[a-z][a-z0-9_]*(\\.[a-z0-9_]+)+"))continue;
            if(!apps&&!w.matches("[A-Z0-9_.+ -]{2,40}"))continue;
            if(out.length()>0)out.append(',');
            out.append(w);
            if(out.length()>400)break;
        }
        return out.toString();
    }
    public static void configure(Context c,String senders,String apps){
        p(c).edit().putString(SENDERS,allowlist(senders,false))
            .putString(APPS,allowlist(apps,true)).commit();
    }
    public static String senders(Context c){return p(c).getString(SENDERS,"");}
    public static String apps(Context c){return p(c).getString(APPS,"");}
    private static boolean allowed(String actual,String csv){
        if(actual==null||actual.isEmpty()||csv==null||csv.isEmpty())return false;
        for(String item:csv.split(","))if(actual.equals(item))return true;
        return false;
    }
    private static boolean sourceAllowed(Context c,String source,String sender){
        if("sms".equals(source))return allowed(norm(sender),senders(c));
        if(!"notification".equals(source))return false;
        String pack=String.valueOf(sender==null?"":sender).toLowerCase(Locale.ROOT);
        return INSTA.equals(pack)||allowed(pack,apps(c));
    }
    private static SecretKey secret() throws Exception{
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(ks.containsAlias(CRYPTO))return (SecretKey)ks.getKey(CRYPTO,null);
        KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(CRYPTO,
            KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).build());
        return kg.generateKey();
    }
    private static JSONArray read(Context c){
        String stored=p(c).getString(QUEUE,"");
        if(stored.isEmpty())return new JSONArray();
        try{
            byte[] raw=Base64.decode(stored,Base64.NO_WRAP);
            if(raw.length<=12)return new JSONArray();
            byte[] iv=new byte[12],encrypted=new byte[raw.length-12];
            System.arraycopy(raw,0,iv,0,12);
            System.arraycopy(raw,12,encrypted,0,encrypted.length);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,secret(),new GCMParameterSpec(128,iv));
            return new JSONArray(new String(cipher.doFinal(encrypted),StandardCharsets.UTF_8));
        }catch(Exception e){
            // No plaintext fallback: inaccessible ciphertext is discarded.
            p(c).edit().remove(QUEUE).commit();
            return new JSONArray();
        }
    }
    private static void write(Context c,JSONArray queue) throws Exception{
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        // AndroidKeyStore forbids caller-supplied IVs for encryption by default.
        // Let the provider securely generate a fresh random GCM nonce.
        cipher.init(Cipher.ENCRYPT_MODE,secret());
        byte[] iv=cipher.getIV();
        if(iv==null||iv.length!=12)
            throw new IllegalStateException("Invalid AndroidKeyStore GCM IV");
        byte[] encrypted=cipher.doFinal(queue.toString().getBytes(StandardCharsets.UTF_8));
        byte[] payload=new byte[iv.length+encrypted.length];
        System.arraycopy(iv,0,payload,0,iv.length);
        System.arraycopy(encrypted,0,payload,iv.length,encrypted.length);
        if(!p(c).edit().putString(QUEUE,Base64.encodeToString(payload,Base64.NO_WRAP)).commit())
            throw new IllegalStateException("Encrypted queue not saved");
    }
    /** All incoming data is untrusted, even with the pairing secret. */
    public static synchronized boolean accept(Context c,String token,String source,String sender,String text,long when){
        if(!verify(c,token))return outcome(c,"invalid_pair_token",false);
        if(!sourceAllowed(c,source,sender))return outcome(c,"sender_not_allowed",false);
        if(text==null||text.length()<9||text.length()>2000)
            return outcome(c,"invalid_message",false);
        if(SECRET.matcher(text).find())return outcome(c,"sensitive_message",false);
        if(FAILED.matcher(text).find())return outcome(c,"failed_or_pending",false);
        if(!TX.matcher(text).find())return outcome(c,"not_transaction",false);
        if(!CURRENCY.matcher(text).find())return outcome(c,"currency_not_detected",false);
        long now=System.currentTimeMillis();
        if(when<1)when=now;
        // Automate timestamps may be Unix seconds.
        if(when<100000000000L)when*=1000L;
        if(when<now-MAX_AGE_MS||when>now+24L*60*60*1000)
            return outcome(c,"timestamp_out_of_range",false);
        String safe=CARD.matcher(text).replaceAll("[رقم حساب مخفي]");
        safe=PHONE.matcher(safe).replaceAll("[هاتف مخفي]");
        safe=EMAIL.matcher(safe).replaceAll("[بريد مخفي]");
        if(safe.length()>650)safe=safe.substring(0,650);
        String normalizedSource="sms".equals(source)?"sms":
            INSTA.equals(String.valueOf(sender).toLowerCase(Locale.ROOT))?"instapay":"bank_notification";
        try{
            String hash=hex(hash(normalizedSource+"|"+norm(sender)+"|"+safe+"|"+(when/900000L))).substring(0,32);
            JSONArray prior=pending(c);
            for(int i=0;i<prior.length();i++){
                JSONObject x=prior.optJSONObject(i);
                if(x!=null&&hash.equals(x.optString("id")))
                    return outcome(c,"duplicate_candidate",false);
            }
            JSONObject row=new JSONObject();
            row.put("id",hash);row.put("date",when);
            row.put("source",normalizedSource);row.put("text",safe);
            row.put("sender",String.valueOf(sender).substring(0,Math.min(50,String.valueOf(sender).length())));
            prior.put(row);
            JSONArray cap=new JSONArray();
            for(int i=Math.max(0,prior.length()-60);i<prior.length();i++)cap.put(prior.get(i));
            write(c,cap);
            return outcome(c,"accepted_candidate",true);
        }catch(Exception e){return outcome(c,"encrypted_queue_error",false);}
    }
    public static synchronized JSONArray pending(Context c){
        JSONArray all=read(c),valid=new JSONArray();
        long limit=System.currentTimeMillis()-MAX_AGE_MS;
        for(int i=0;i<all.length();i++){
            JSONObject x=all.optJSONObject(i);
            if(x!=null&&x.optLong("date",0)>=limit)valid.put(x);
        }
        if(valid.length()!=all.length()){
            try{write(c,valid);}catch(Exception ignored){}
        }
        return valid;
    }
    public static synchronized void remove(Context c,String id){
        if(id==null||!id.matches("[a-f0-9]{32}"))return;
        JSONArray prior=read(c),arr=new JSONArray();
        for(int i=0;i<prior.length();i++){
            JSONObject x=prior.optJSONObject(i);
            if(x!=null&&!id.equals(x.optString("id")))arr.put(x);
        }
        try{write(c,arr);}catch(Exception ignored){}
    }
    public static synchronized void clear(Context c){
        p(c).edit().remove(QUEUE).commit();
    }
}