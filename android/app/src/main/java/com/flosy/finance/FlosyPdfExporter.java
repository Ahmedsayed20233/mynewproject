package com.flosy.finance;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.os.Build;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextDirectionHeuristics;
import android.text.TextPaint;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;

/** Professional, local-only A4 report. No native fonts bundled or server upload.
 * StaticLayout uses system Arabic glyph shaping and correct RTL direction. */
public final class FlosyPdfExporter {
    private static final int PAGE_W=595,PAGE_H=842;
    private static final int NAVY=Color.rgb(18,43,67),TEAL=Color.rgb(10,126,115),
        MUTED=Color.rgb(100,119,133),LINE=Color.rgb(221,232,237),
        LIGHT=Color.rgb(244,248,250),RED=Color.rgb(178,54,54);
    private FlosyPdfExporter(){}
    private static class Writer {
        final PdfDocument doc=new PdfDocument();
        PdfDocument.Page page;
        Canvas canvas;
        float y;
        int pageCount=0;
        void newPage(){
            if(page!=null)doc.finishPage(page);
            page=doc.startPage(new PdfDocument.PageInfo.Builder(PAGE_W,PAGE_H,++pageCount).create());
            canvas=page.getCanvas();canvas.drawColor(Color.WHITE);y=29;
            rect(29,24,PAGE_W-58,49,TEAL);
            text("فلوسي  |  FLOSY",PAGE_W-45,37,PAGE_W-90,20,Color.WHITE,true);
            text("FINANCIAL REPORT",165,44,126,9,Color.WHITE,false);
            y=90;
            line(30,PAGE_H-31,PAGE_W-30,PAGE_H-31,LINE);
            text("FLOSY • تقرير مالي شخصي — "+pageCount,565,PAGE_H-26,500,9,MUTED,false);
        }
        void ensure(float height){if(y+height>PAGE_H-61)newPage();}
        void rect(float x,float top,float width,float height,int color){
            Paint p=new Paint(3);p.setColor(color);canvas.drawRoundRect(x,top,x+width,top+height,8,8,p);
        }
        void line(float x,float top,float x2,float y2,int color){
            Paint p=new Paint(3);p.setColor(color);p.setStrokeWidth(1);canvas.drawLine(x,top,x2,y2,p);
        }
        float text(String value,float right,float top,int maxWidth,int size,int color,boolean bold){
            String txt=value==null?"":value;
            TextPaint paint=new TextPaint(3);
            paint.setColor(color);paint.setTextSize(size);
            paint.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
            StaticLayout layout=StaticLayout.Builder.obtain(txt,0,txt.length(),paint,maxWidth)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setTextDirection(TextDirectionHeuristics.RTL)
                .setIncludePad(false).setMaxLines(6).build();
            canvas.save();canvas.translate(right-maxWidth,top);
            layout.draw(canvas);canvas.restore();return layout.getHeight();
        }
        void heading(String title){
            ensure(45);rect(30,y,5,24,TEAL);
            text(title,560,y+2,500,14,NAVY,true);y+=35;
        }
        void row(String title,String subtitle,String amount,int index){
            ensure(58);if(index%2==0)rect(30,y,535,54,LIGHT);
            text(title,556,y+5,326,11,NAVY,true);
            text(subtitle,556,y+28,322,9,MUTED,false);
            text(amount,227,y+9,181,11,index%2==0?TEAL:NAVY,true);
            line(30,y+55,565,y+55,LINE);y+=58;
        }
        byte[] finish()throws IOException{
            if(page!=null)doc.finishPage(page);
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            doc.writeTo(out);doc.close();return out.toByteArray();
        }
    }
    private static String money(long minor){
        return String.format(Locale.US,"%,.2f EGP",minor/100.0);
    }
    private static String safe(JSONObject obj,String field,int max){
        String raw=obj==null?"":obj.optString(field,"");
        raw=raw.replaceAll("[\\u0000-\\u001f<>]"," ").trim();
        return raw.length()>max?raw.substring(0,max):raw;
    }
    public static byte[] build(JSONObject data)throws IOException{
        if(data==null)throw new IOException("Missing report JSON");
        JSONArray rows=data.optJSONArray("rows"),cats=data.optJSONArray("categories"),
            accounts=data.optJSONArray("accounts"),advice=data.optJSONArray("advice");
        if(rows==null||cats==null||accounts==null||advice==null||rows.length()>10000||
            cats.length()>100||accounts.length()>100)throw new IOException("Invalid report sections");
        Writer w=new Writer();w.newPage();
        JSONObject range=data.optJSONObject("range");
        w.text("ملخص حركة أموالك",558,w.y,520,23,NAVY,true);w.y+=40;
        w.text("من "+safe(range,"start",12)+" إلى "+safe(range,"end",12),558,w.y,510,11,MUTED,false);w.y+=31;
        long income=data.optLong("income",0),expense=data.optLong("expense",0),
            net=data.optLong("net",0),transfers=data.optLong("transfers",0);
        int[] colors={TEAL,RED,NAVY};String[] titles={"إجمالي الدخل","إجمالي المصروفات","صافي التدفق"};
        long[] values={income,expense,net};
        for(int i=0;i<3;i++){
            float x=30+i*182;w.rect(x,w.y,171,76,LIGHT);
            w.text(titles[i],x+162,w.y+9,145,10,MUTED,false);
            w.text(money(values[i]),x+164,w.y+36,150,12,colors[i],true);
        }
        w.y+=91;
        w.text("التحويلات بين حساباتك: "+money(transfers)+" — لا تدخل ضمن المصروفات.",555,w.y,515,10,MUTED,false);
        w.y+=28;
        w.heading("01  |  الفئات وتوزيع الإنفاق");
        if(cats.length()==0){w.text("لم يتم تسجيل مصروفات في هذه الفترة.",555,w.y,515,10,MUTED,false);w.y+=30;}
        for(int i=0;i<cats.length();i++){
            JSONObject c=cats.optJSONObject(i);
            long val=c==null?0:c.optLong("value",0);
            String label=safe(c,"name",55);
            int pct=expense>0?(int)Math.round(100.0*val/expense):0;
            w.row(label,pct+"% من المصروفات",money(val),i);
        }
        w.heading("02  |  حركة الحسابات");
        if(accounts.length()==0){w.text("لا توجد حسابات للفترة.",555,w.y,515,10,MUTED,false);w.y+=25;}
        for(int i=0;i<accounts.length();i++){
            JSONObject c=accounts.optJSONObject(i);
            w.row(safe(c,"name",60),"دخل: "+money(c.optLong("income",0)),
               "مصروف: "+money(c.optLong("expense",0)),i);
        }
        w.heading("03  |  سجل المعاملات");
        w.text("عدد العمليات: "+rows.length(),555,w.y,515,10,MUTED,false);w.y+=24;
        for(int i=0;i<rows.length();i++){
            JSONObject c=rows.optJSONObject(i);
            if(c==null)continue;
            w.row(safe(c,"description",96),
              safe(c,"date",11)+"  ·  "+safe(c,"category",55)+"  ·  "+safe(c,"account",55),
              money(c.optLong("cents",0)),i);
        }
        w.heading("04  |  اقتراحات مبنية على بياناتك");
        for(int i=0;i<advice.length();i++){
            String msg=advice.optString(i,"");
            int lines=Math.min(4,1+msg.length()/58);
            w.ensure(15+lines*15);
            float h=w.text("• "+msg,555,w.y,510,10,NAVY,false);
            w.y+=Math.max(21,h)+9;
        }
        w.ensure(30);
        w.text("تقرير Flosy شخصي، للمراجعة والتخطيط وليس توصية لشراء أصول أو استثمار.",555,w.y,510,9,MUTED,false);
        return w.finish();
    }
}
