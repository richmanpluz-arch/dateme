import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type SignalRow = { id:string; sender_id:string; recipient_id:string; signal_type:'offer'|'answer'|'ice'|'hangup'|'decline'; payload:any; created_at:string };
export default function VideoCall({session,matchId,recipientId,allowed,onNotice}:{session:Session;matchId:string;recipientId:string;allowed:boolean;onNotice:(message:string)=>void}) {
  const [open,setOpen]=useState(false);
  const [incoming,setIncoming]=useState<SignalRow|null>(null);
  const [localStream,setLocalStream]=useState<MediaStream|null>(null);
  const [remoteStream,setRemoteStream]=useState<MediaStream|null>(null);
  const [callStatus,setCallStatus]=useState('Ready');
  const localVideo=useRef<HTMLVideoElement|null>(null);
  const remoteVideo=useRef<HTMLVideoElement|null>(null);
  const peer=useRef<RTCPeerConnection|null>(null);
  const localStreamRef=useRef<MediaStream|null>(null);
  const processed=useRef<Set<string>>(new Set());
  const active=useRef(false);

  useEffect(()=>{if(localVideo.current)localVideo.current.srcObject=localStream;},[localStream]);
  useEffect(()=>{if(remoteVideo.current)remoteVideo.current.srcObject=remoteStream;},[remoteStream]);
  function makePeer() {
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    peer.current=pc;
    pc.ontrack=event=>{if(event.streams[0])setRemoteStream(event.streams[0]);};
    pc.onicecandidate=event=>{if(event.candidate&&supabase)void supabase.from('member_call_signals').insert({match_id:matchId,sender_id:session.user.id,recipient_id:recipientId,signal_type:'ice',payload:event.candidate.toJSON()});};
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')setCallStatus('Connected');if(['failed','disconnected','closed'].includes(pc.connectionState))setCallStatus('Call disconnected');};
    return pc;
  }
  async function getMedia() {
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera and microphone are not supported.');
    const media=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    localStreamRef.current=media;
    setLocalStream(media);
    return media;
  }
  async function startCall() {
    if(!allowed){onNotice('Video calling is available only when both matched members have the same active, verified one-year subscription.');return;}
    if(!supabase)return;
    try {
      setOpen(true);setCallStatus('Requesting camera and microphone…');
      const media=await getMedia();const pc=makePeer();media.getTracks().forEach(track=>pc.addTrack(track,media));
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      const result=await supabase.from('member_call_signals').insert({match_id:matchId,sender_id:session.user.id,recipient_id:recipientId,signal_type:'offer',payload:offer});
      if(result.error)throw result.error;
      active.current=true;setCallStatus('Calling… keep this chat open while your match answers.');
    } catch(error) { await endCall(false);onNotice(error instanceof Error?error.message:'Could not start the video call.'); }
  }
  async function acceptCall() {
    if(!supabase||!incoming)return;
    try {
      setOpen(true);setCallStatus('Connecting…');
      const media=await getMedia();const pc=makePeer();media.getTracks().forEach(track=>pc.addTrack(track,media));
      await pc.setRemoteDescription(new RTCSessionDescription(incoming.payload));
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      const result=await supabase.from('member_call_signals').insert({match_id:matchId,sender_id:session.user.id,recipient_id:incoming.sender_id,signal_type:'answer',payload:answer});
      if(result.error)throw result.error;
      setIncoming(null);active.current=true;setCallStatus('Connecting…');
    } catch(error) { onNotice(error instanceof Error?error.message:'Could not accept this call.');await endCall(false); }
  }
  async function endCall(notifyOther=true) {
    if(notifyOther&&supabase&&active.current)await supabase.from('member_call_signals').insert({match_id:matchId,sender_id:session.user.id,recipient_id:recipientId,signal_type:'hangup',payload:{}});
    active.current=false;peer.current?.close();peer.current=null;
    localStreamRef.current?.getTracks().forEach(track=>track.stop());localStreamRef.current=null;setLocalStream(null);setRemoteStream(null);setIncoming(null);setOpen(false);setCallStatus('Ready');
  }
  async function declineCall() {
    if(supabase&&incoming)await supabase.from('member_call_signals').insert({match_id:matchId,sender_id:session.user.id,recipient_id:incoming.sender_id,signal_type:'decline',payload:{}});
    setIncoming(null);
  }
  useEffect(()=>{
    if(!supabase||!session||!matchId)return;
    let alive=true;
    const poll=async()=>{
      const {data,error}=await supabase!.from('member_call_signals').select('id,sender_id,recipient_id,signal_type,payload,created_at').eq('match_id',matchId).order('created_at',{ascending:false}).limit(100);
      if(!alive||error||!data)return;
      for(const raw of [...(data as SignalRow[])].reverse()){
        if(processed.current.has(raw.id))continue;
        if(raw.signal_type==='ice'&&raw.recipient_id===session.user.id&&!peer.current)continue;
        processed.current.add(raw.id);
        if(raw.sender_id===session.user.id)continue;
        if(raw.signal_type==='offer'&&raw.recipient_id===session.user.id&&!active.current){setIncoming(raw);setCallStatus('Incoming video call');}
        else if(raw.signal_type==='answer'&&raw.recipient_id===session.user.id&&peer.current){try{await peer.current.setRemoteDescription(new RTCSessionDescription(raw.payload));setCallStatus('Connecting…');}catch{}}
        else if(raw.signal_type==='ice'&&raw.recipient_id===session.user.id&&peer.current){try{await peer.current.addIceCandidate(new RTCIceCandidate(raw.payload));}catch{}}
        else if((raw.signal_type==='hangup'||raw.signal_type==='decline')&&raw.recipient_id===session.user.id){await endCall(false);setCallStatus(raw.signal_type==='decline'?'Call declined':'Call ended');}
      }
    };
    void poll();const timer=window.setInterval(()=>void poll(),1500);
    return()=>{alive=false;window.clearInterval(timer);};
  },[session.user.id,matchId,recipientId]);
  useEffect(()=>()=>{peer.current?.close();localStreamRef.current?.getTracks().forEach(track=>track.stop());localStreamRef.current=null;},[]);
  if(!allowed&&!open&&!incoming)return <button type="button" className="chat-tool-button" onClick={()=>onNotice('Video calling requires both matched members to have the same active, verified one-year subscription.')}>Video call · 1 year plan</button>;
  return <div className="video-call-widget">
    {!open&&!incoming&&<button type="button" className="chat-tool-button" onClick={()=>void startCall()}>Video call</button>}
    {incoming&&!open&&<div className="incoming-call-banner"><span>Incoming video call</span><button type="button" className="button button-primary" onClick={()=>void acceptCall()}>Accept</button><button type="button" className="button button-outline" onClick={()=>void declineCall()}>Decline</button></div>}
    {open&&<div className="video-call-overlay"><div className="video-call-window"><div className="video-call-title"><strong>DateMe video call</strong><span>{callStatus}</span></div><video ref={remoteVideo} autoPlay playsInline className="video-call-remote"/><video ref={localVideo} autoPlay playsInline muted className="video-call-local"/><div className="video-call-actions"><button type="button" className="button button-outline" onClick={()=>{const track=localStream?.getVideoTracks()[0];if(track)track.enabled=!track.enabled;}}>Camera on/off</button><button type="button" className="button button-outline" onClick={()=>{const track=localStream?.getAudioTracks()[0];if(track)track.enabled=!track.enabled;}}>Mute/unmute</button><button type="button" className="button button-primary" onClick={()=>void endCall()}>End call</button></div><small>Use this only if you feel comfortable. Keep the app open. Never share financial or verification codes.</small></div></div>}
  </div>;
}
