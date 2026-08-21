import React, { useEffect, useState } from "react";
import { PermissionsAndroid, Platform, Pressable, Text, View } from "react-native";
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useConnectionState, useTracks } from "@livekit/react-native";
import { Track } from "livekit-client";
import { LIVEKIT_URL, supabase } from "./config";
import { s } from "./ui";

export default function LiveVideo({ room, user, host=false }) {
  const [token,setToken]=useState(null),[serverUrl,setServerUrl]=useState(LIVEKIT_URL),[error,setError]=useState("");
  useEffect(()=>{
    let mounted=true;
    AudioSession.startAudioSession();
    (async()=>{
      if(Platform.OS==="android"&&host){
        const result=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA,PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
        if(result[PermissionsAndroid.PERMISSIONS.CAMERA]!==PermissionsAndroid.RESULTS.GRANTED||result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]!==PermissionsAndroid.RESULTS.GRANTED){setError("Camera and microphone permission are required.");return;}
      }
      const {data,error:e}=await supabase.functions.invoke("livekit-token",{body:{roomName:room,participantName:`${host?"host":"viewer"}-${user.id}`,canPublish:host}});
      if(!mounted)return;
      if(e||!data?.token)setError(e?.message||data?.error||"Could not connect to live video.");
      else { setServerUrl(data.serverUrl||LIVEKIT_URL); setToken(data.token); }
    })();
    return()=>{mounted=false;AudioSession.stopAudioSession();};
  },[host,room,user.id]);
  if(error)return <View style={styles.video}><Text style={s.text}>⚠ {error}</Text></View>;
  if(!token)return <View style={styles.video}><Text style={s.text}>Connecting to live video…</Text></View>;
  return <LiveKitRoom
    serverUrl={serverUrl}
    token={token}
    connect={true}
    audio={host}
    video={host}
    options={{adaptiveStream:true,dynacast:true}}
    onError={e=>setError(e?.message||String(e))}
    onMediaDeviceFailure={e=>setError(`Camera or microphone failed: ${String(e||"unknown error")}`)}
  ><Tracks host={host} onError={setError}/></LiveKitRoom>;
}
function Tracks({host,onError}){
  const connectionState=useConnectionState();
  const tracks=useTracks([Track.Source.Camera],{onlySubscribed:false});
  const track=host
    ? tracks.find(t=>t.participant?.isLocal)||tracks[0]
    : tracks.find(t=>!t.participant?.isLocal)||tracks[0];

  useEffect(()=>{
    if(!host||track)return;
    const timer=setTimeout(()=>onError("The camera did not start. Close the app, allow Camera and Microphone permissions in Android Settings, then try again."),12000);
    return()=>clearTimeout(timer);
  },[host,track,onError]);

  const switchCamera=()=>{
    try{
      const mediaTrack=track?.publication?.track?.mediaStreamTrack;
      if(typeof mediaTrack?._switchCamera!=="function") throw new Error("Camera switching is unavailable on this device.");
      mediaTrack._switchCamera();
    }catch(error){
      onError(error?.message||"Could not switch camera.");
    }
  };

  if(!track)return <View style={styles.video}><Text style={s.text}>{host?`Starting your camera… (${connectionState})`:"Waiting for seller camera…"}</Text></View>;
  return isTrackReference(track)?<View style={styles.videoWrap}>
    <VideoTrack trackRef={track} style={styles.video} mirror={host} objectFit="cover"/>
    {host?<Pressable onPress={switchCamera} style={styles.flipButton} accessibilityRole="button" accessibilityLabel="Switch front or back camera">
      <Text style={styles.flipText}>↻ Switch camera</Text>
    </Pressable>:null}
  </View>:<View style={styles.video}><Text style={s.text}>Camera track is unavailable.</Text></View>;
}
const styles={
  videoWrap:{width:"100%",height:390,backgroundColor:"#050609"},
  video:{width:"100%",height:390,backgroundColor:"#050609",alignItems:"center",justifyContent:"center",padding:25},
  flipButton:{position:"absolute",right:16,top:16,backgroundColor:"rgba(0,0,0,0.72)",borderWidth:1,borderColor:"rgba(255,255,255,0.4)",borderRadius:22,paddingHorizontal:16,paddingVertical:11},
  flipText:{color:"#fff",fontSize:15,fontWeight:"800"},
};
