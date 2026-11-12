package com.flosy.finance;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import java.util.Locale;

/**
 * Flosy AI voice: system Android TTS with Egyptian Arabic preference.
 * This is synthesis, NOT a trained in-app speech foundation model.
 */
public final class FlosyUltraSpeech {
    private final Activity activity;
    private TextToSpeech engine;
    private String pending="";
    private Runnable afterSpeech;
    private boolean ready=false;
    private final Handler main=new Handler(Looper.getMainLooper());
    public FlosyUltraSpeech(Activity activity){this.activity=activity;}
    public void speak(String value,Runnable done){
        if(value==null)return;
        pending=value.trim();
        if(pending.length()>1300)pending=pending.substring(0,1300);
        if(pending.isEmpty())return;
        afterSpeech=done;
        if(engine==null){
            engine=new TextToSpeech(activity,status->{
                ready=status==TextToSpeech.SUCCESS;
                if(!ready){finish();return;}
                try{
                    int lang=engine.setLanguage(Locale.forLanguageTag("ar-EG"));
                    if(lang==TextToSpeech.LANG_MISSING_DATA||
                        lang==TextToSpeech.LANG_NOT_SUPPORTED)
                        engine.setLanguage(new Locale("ar"));
                    Voice chosen=null;
                    if(engine.getVoices()!=null){
                        for(Voice voice:engine.getVoices()){
                            if(voice==null||voice.isNetworkConnectionRequired())continue;
                            if("ar-EG".equalsIgnoreCase(voice.getLocale().toLanguageTag())){
                                chosen=voice;break;
                            }
                            if(chosen==null&&"ar".equals(voice.getLocale().getLanguage()))
                                chosen=voice;
                        }
                    }
                    if(chosen!=null)engine.setVoice(chosen);
                    engine.setSpeechRate(0.96f);
                    engine.setPitch(1.0f);
                    engine.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                        @Override public void onStart(String id){}
                        @Override public void onDone(String id){finish();}
                        @Override public void onError(String id){finish();}
                    });
                }catch(Exception ignored){}
                pump();
            });
        }else if(ready)pump();
    }
    private void pump(){
        if(engine==null||!ready)return;
        try{
            Bundle extras=new Bundle();
            engine.speak(pending,TextToSpeech.QUEUE_FLUSH,extras,
                "flosy-ultra-"+System.nanoTime());
        }catch(Exception e){finish();}
    }
    private void finish(){
        main.post(()->{
            Runnable task=afterSpeech;
            afterSpeech=null;
            if(task!=null)task.run();
        });
    }
    public void stop(){
        afterSpeech=null;pending="";
        if(engine!=null)try{engine.stop();}catch(Exception ignored){}
    }
    public void shutdown(){
        stop();if(engine!=null)try{engine.shutdown();}catch(Exception ignored){}
        engine=null;ready=false;
    }
}
