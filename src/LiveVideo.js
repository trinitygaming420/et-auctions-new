import React, { useEffect, useState } from "react";
import { PermissionsAndroid, Platform, Text, View } from "react-native";
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useLocalParticipant, useTracks } from "@livekit/react-native";
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
  return <LiveKitRoom serverUrl={serverUrl} token={token} connect audio={false} video={false} onError={e=>setError(e?.message||String(e))} onMediaDeviceFailure={e=>setError(`Camera or microphone failed: ${String(e||"unknown error")}`)}><Publisher host={host} onError={setError}/><Tracks host={host}/></LiveKitRoom>;
}
function Publisher({host,onError}){
  const {localParticipant}=useLocalParticipant();
  useEffect(()=>{
    if(!host||!localParticipant)return;
    let active=true;
    (async()=>{
      try{
        await localParticipant.setMicrophoneEnabled(true);
        await localParticipant.setCameraEnabled(true);
      }catch(e){if(active)onError(e?.message||"The camera could not be started.")}
    })();
    return()=>{active=false};
  },[host,localParticipant,onError]);
  return null;
}
function Tracks({host}){
  const tracks=useTracks([Track.Source.Camera]),track=tracks[0];
  if(!track)return <View style={styles.video}><Text style={s.text}>{host?"Starting your camera…":"Waiting for seller camera…"}</Text></View>;
  return isTrackReference(track)?<VideoTrack trackRef={track} style={styles.video}/>:<View style={styles.video}/>;
}
const styles={video:{width:"100%",height:390,backgroundColor:"#050609",alignItems:"center",justifyContent:"center",padding:25}};
