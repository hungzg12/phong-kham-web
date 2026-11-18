import React,{useEffect,useState} from 'react';
import {AlertCircle,RefreshCw,Download,LoaderCircle,X} from 'lucide-react';
import {DATA_KEY,initializeWorkspace,useStorageIssue,clearIssue} from './workspace';
import './experience.css';

export function ScreenSkeleton({label='Đang tải màn hình…'}){return <div className="screen-skeleton" role="status" aria-live="polite" aria-busy="true"><p><LoaderCircle size={18}/>{label}</p><div className="skeleton-cards"><i/><i/><i/></div><div className="skeleton-panel"><i/><i/><i/><i/></div></div>}
export function StorageNotice(){const message=useStorageIssue();useEffect(()=>{const handler=e=>{if(e.error?.name==='LocalDataError')e.preventDefault()};window.addEventListener('error',handler);return()=>window.removeEventListener('error',handler)},[]);if(!message)return null;return <div className="storage-notice" role="alert"><AlertCircle size={20}/><div><b>Chưa lưu được thay đổi</b><p>{message}</p><small>Giữ nguyên biểu mẫu, kiểm tra bộ nhớ hoặc quyền lưu trữ rồi thử lưu lại.</small></div><button className="icon-button" aria-label="Đóng thông báo lưu trữ" onClick={clearIssue}><X size={17}/></button></div>}
function downloadBackup(){const raw=localStorage.getItem(DATA_KEY)||'{}',url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='medicare-du-lieu-goc.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function WorkspaceBootstrap({children}){
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 function load(){setError('');try{initializeWorkspace();setReady(true)}catch(e){setError(e.message)}}
 function resetAndReload(){
  try{
   localStorage.removeItem(DATA_KEY);
   localStorage.removeItem('medicare-workspace-v3');
   localStorage.removeItem('medicare-workspace-v4');
   sessionStorage.clear();
  }catch{}
  location.reload();
 }
 useEffect(load,[]);
 if(error)return <div className="recovery-page" role="alert"><AlertCircle size={40}/><h1>Không mở được dữ liệu cục bộ</h1><p>{error}</p><small>Ứng dụng không tự xóa hay ghi đè dữ liệu lỗi.</small><div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}><button className="primary" onClick={resetAndReload}><RefreshCw size={16}/>Khôi phục dữ liệu ban đầu</button><button className="secondary" onClick={downloadBackup}><Download size={16}/>Tải bản dữ liệu gốc</button><button className="secondary" onClick={load}><RefreshCw size={16}/>Thử lại</button></div></div>;
 return ready?<>{children}<StorageNotice/></>:<div className="startup-loading"><ScreenSkeleton label="Đang đọc dữ liệu trên trình duyệt…"/></div>
}
export class AppBoundary extends React.Component{state={error:null};static getDerivedStateFromError(error){return {error}}render(){if(this.state.error)return <div className="recovery-page" role="alert"><AlertCircle size={40}/><h1>Không hiển thị được màn hình</h1><p>Dữ liệu đã lưu vẫn được giữ trên trình duyệt. Bạn có thể tải lại để thử mở lại giao diện.</p><button className="primary" onClick={()=>location.reload()}><RefreshCw size={16}/>Tải lại giao diện</button></div>;return this.props.children}}
export function attempt(fn,setError){try{return fn()}catch(e){setError(e.message||'Không thực hiện được thao tác. Vui lòng thử lại.');return null}}
