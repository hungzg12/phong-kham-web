import React,{useEffect,useState} from 'react';
import Auth from './Auth';
import {hisApi} from './api';
import {actorRoles} from './roles';
import {setIdentity} from './session.js';
import {resetWorkspaceMemory} from './workspace';
import {WorkspaceBootstrap,ScreenSkeleton} from './Experience';

export default function WorkspaceSession({children}){
 const [identity,setSession]=useState(null),[checking,setChecking]=useState(true),[error,setError]=useState('');
 function forget(){setIdentity(null);resetWorkspaceMemory();setSession(null);}
 function accept(value){
  const actor=actorRoles[value.role];if(!actor)throw new Error('Vai trò nghiệp vụ không hợp lệ.');
  resetWorkspaceMemory();actor.person=value.person;actor.staffId=value.staffId;actor.patientId=value.patientId;
  setIdentity(value);setSession(value);setError('');
 }
 async function check(initial=false){
  try{const value=await hisApi.workspaceSession();if(!identity||JSON.stringify(value)!==JSON.stringify(identity))accept(value);}
  catch(e){forget();if(e.status!==401)setError(e.message);}finally{if(initial)setChecking(false);}
 }
 useEffect(()=>{check(true)},[]);
 useEffect(()=>{if(!identity)return;const expired=()=>forget();window.addEventListener('medicare-session-expired',expired);const timer=setInterval(()=>check(),60000);return()=>{clearInterval(timer);window.removeEventListener('medicare-session-expired',expired)}},[identity]);
 async function login(credentials){await hisApi.login(credentials);accept(await hisApi.workspaceSession());}
 async function logout(){try{await hisApi.logout();forget();}catch(e){setError(e.message);}}
 if(checking)return <ScreenSkeleton label="Đang kiểm tra phiên đăng nhập…"/>;
 if(!identity)return <Auth onLogin={login} externalError={error}/>;
 return <WorkspaceBootstrap key={identity.userId+identity.role}><>{error&&<p role="alert">{error}</p>}{React.cloneElement(children,{session:identity,onLogout:logout})}</></WorkspaceBootstrap>;
}
