package com.flosy.finance;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.util.Base64;
import android.os.Build;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Browser <-> Android reporting: bytes never leave the user's device.
 * Bundles live A4 PDF or OpenXML .xlsx in memory, then saves via SAF picker. */
public final class FlosyReportBridge {
    public static final int REQ_SAVE_REPORT=84;
    private static final int MAX=5*1024*1024;
    private final Activity activity;
    private final WebView web;
    private ByteArrayOutputStream incoming;
    private int expected=0;
    private String ext="",filename="",pendingExt="";
    private byte[] pending;
    public FlosyReportBridge(Activity activity,WebView web){
        this.activity=activity;this.web=web;
    }
    private void reset(){
        incoming=null;expected=0;ext="";filename="";
    }
    private static boolean acceptable(String name,String type){
        return name.matches("Flosy-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}-[0-9]{2}-[0-9]{2}\\."+
            type);
    }
    private void status(boolean ok,String msg){
        String result=JSONObject.quote(pendingExt)+","+
            (ok?"true":"false")+","+JSONObject.quote(msg);
        String js="if(window.FLOSY_REPORT_PRO&&window.FLOSY_REPORT_PRO.nativeResult)"+
            "window.FLOSY_REPORT_PRO.nativeResult("+result+");"+
            "else if(window.FLOSY_REPORT_KIT&&window.FLOSY_REPORT_KIT.nativeResult)"+
            "window.FLOSY_REPORT_KIT.nativeResult("+result+");";
        web.post(()->web.evaluateJavascript(js,null));
    }
    public void onMessage(String action,JSONObject msg){
        if(action==null || !(action.startsWith("pdf-")||action.startsWith("xlsx-")))return;
        String[] split=action.split("-",2);
        if(split.length!=2)return;
        String kind=split[0],step=split[1];
        if("start".equals(step)){
            reset();pending=null;pendingExt=kind;
            int size=msg.optInt("size",-1);
            String file=msg.optString("filename","");
            if(size<2||size>MAX||!acceptable(file,kind)){
                status(false,"اسم أو حجم التقرير غير صحيح");
                return;
            }
            incoming=new ByteArrayOutputStream(Math.min(size,65536));
            expected=size;ext=kind;filename=file;
            return;
        }
        if(incoming==null||!kind.equals(ext))return;
        if("chunk".equals(step)){
            try{
                String encoded=msg.optString("data","");
                if(encoded.isEmpty()||encoded.length()>9500)throw new Exception("chunk length");
                byte[] part=Base64.decode(encoded,Base64.DEFAULT);
                if(part.length==0||incoming.size()+part.length>expected)throw new Exception("size");
                incoming.write(part);
            }catch(Exception e){
                reset();status(false,"فشل نقل التقرير إلى Android؛ حاول تاني");
            }
            return;
        }
        if("finish".equals(step)){
            try{
                byte[] bytes=incoming.toByteArray();
                if(bytes.length!=expected)throw new Exception("incomplete file");
                if("pdf".equals(kind)){
                    JSONObject data=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
                    pending=FlosyPdfExporter.build(data);
                    if(pending.length<100 || pending[0]!='%'||pending[1]!='P'||pending[2]!='D'||pending[3]!='F')
                        throw new Exception("Invalid PDF");
                }else{
                    if(bytes.length<4||bytes[0]!='P'||bytes[1]!='K'||
                      bytes[2]!=3||bytes[3]!=4)throw new Exception("Invalid Excel file");
                    pending=bytes;
                }
                pendingExt=kind;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("pdf".equals(kind)?"application/pdf":
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                intent.putExtra(Intent.EXTRA_TITLE,filename);
                activity.startActivityForResult(intent,REQ_SAVE_REPORT);
            }catch(Exception e){
                pending=null;
                status(false,"تعذر إنشاء ملف "+kind+": "+String.valueOf(e.getMessage()));
            }finally{reset();}
        }
    }
    public void onActivityResult(int resultCode,Intent data){
        final byte[] content=pending;
        pending=null;
        if(resultCode!=Activity.RESULT_OK||data==null||data.getData()==null){
            status(false,"تم إلغاء الحفظ. البيانات لم تتغير.");
            return;
        }
        if(content==null){status(false,"الملف غير متاح؛ حاول تصديره تاني");return;}
        try(OutputStream out=activity.getContentResolver().openOutputStream(data.getData())){
            if(out==null)throw new Exception("No file output");
            out.write(content);out.flush();
            status(true,"تم حفظ "+pendingExt.toUpperCase()+" بنجاح. هتلاقيه في المكان اللي اخترته.");
        }catch(Exception e){
            status(false,"فشل كتابة الملف. اختار مجلد آخر وحاول تاني.");
        }
    }
}
