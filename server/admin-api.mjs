import {registerPatient} from './patient-registration.mjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { loadState, transactAdmin, querySql } from './admin-store.mjs';
import { authorize, digest, ensureLastAdmin, event, fail, hashPassword, publicAccount, validate, verifyPassword } from './admin-domain.mjs';
import { catalogs, catalogRows, catalogRow, catalogEffect, dashboard } from './admin-catalogs.mjs';
import { adminDefinitions } from '../src/admin-schema.js';

const cookieName='medicare_admin_session';
const attempts=new Map();
const registrations=new Map();
const cookie=(token,age=28800)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.NODE_ENV==='production'&&process.env.MEDICARE_ALLOW_HTTP!=='true'?'; Secure':''}`;
const tokenOf=req=>{try{return decodeURIComponent((req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'');}catch{return '';}};
export async function readJson(req) {
  if(!req.headers['content-type']?.startsWith('application/json')) fail(415,'Yêu cầu phải dùng application/json.');
  let body=''; for await(const part of req){body+=part;if(Buffer.byteLength(body)>65536)fail(413,'Thông tin quá dài.');}
  try{const value=JSON.parse(body);if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'JSON không hợp lệ.');return value;}catch{fail(400,'JSON không hợp lệ.');}
}
function originGuard(req) {
  if(!req.headers.origin) return;
  const allowed=process.env.MEDICARE_PUBLIC_ORIGIN;
  let origin;try{origin=new URL(req.headers.origin);}catch{fail(403,'Nguồn yêu cầu không hợp lệ.');}
  if(allowed ? origin.origin!==allowed : origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol)) fail(403,'Nguồn yêu cầu không được phép.');
}
function auth(data,token,permission,req) {
  const identity=authorize(data,token,permission);
  if(!['GET','HEAD'].includes(req.method)&&req.headers['x-csrf-token']!==identity.session.csrf) fail(403,'Phiên biểu mẫu không hợp lệ. Tải lại trang.');
  return identity;
}
function safeChanges(before,after) {
  const hidden=new Set(['passwordHash','authVersion','sessions']);
  return Object.fromEntries(Object.keys(after).filter(key=>!hidden.has(key)&&JSON.stringify(before?.[key])!==JSON.stringify(after[key])).map(key=>[key,{before:before?.[key]??null,after:after[key]}]));
}
function paging(rows,searchParams) {
  const q=(searchParams.get('q')||'').trim().toLocaleLowerCase('vi');
  const active=searchParams.get('active');
  if(active&&!['true','false'].includes(active))fail(400,'Bộ lọc trạng thái không hợp lệ.');
  const size=Number(searchParams.get('size')||10),page=Number(searchParams.get('page')||1);
  if(!Number.isInteger(size)||size<1||size>100||!Number.isInteger(page)||page<1)fail(400,'Phân trang không hợp lệ.');
  const filtered=rows.filter(r=>(active===null||r.active===undefined||r.active===(active==='true'))&&Object.values(r).filter(v=>typeof v==='string').some(v=>v.toLocaleLowerCase('vi').includes(q)));
  return {rows:filtered.slice((page-1)*size,page*size),total:filtered.length,page,size};
}
function dateRange(params) {
  const to=params.get('to')||new Date().toISOString().slice(0,10),from=params.get('from')||to;
  for(const d of[from,to])if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)fail(400,'Ngày lọc không hợp lệ.');
  if(from>to)fail(400,'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  return {from,to};
}
export function createAdminMiddleware() {
  return async(req,res,next)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(!url.pathname.startsWith('/api/admin')&&!url.pathname.startsWith('/api/auth/')&&url.pathname!=='/api/facility')return next();
    const send=(status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(value));};
    try {
      if(!['GET','HEAD'].includes(req.method))originGuard(req);
      const token=tokenOf(req);
      if(url.pathname==='/api/auth/register'&&req.method==='POST'){
        const body=await readJson(req),key=digest(req.socket.remoteAddress||''),now=Date.now();
        for(const [k,v]of registrations)if(v.until<now)registrations.delete(k);
        const limit=registrations.get(key);if(registrations.size>5000||limit?.count>=8)fail(429,'Đăng ký quá nhiều lần. Vui lòng thử lại sau 15 phút.');
        registrations.set(key,{count:(limit?.count||0)+1,until:limit?.until||now+900000});
        return send(201,await registerPatient(body));
      }
      if(url.pathname==='/api/auth/login'&&req.method==='POST') {
        const body=await readJson(req),username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
        const key=digest(`${req.socket.remoteAddress}:${username}`),now=Date.now();
        for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);
        if(attempts.size>5000)fail(429,'Quá nhiều yêu cầu đăng nhập. Thử lại sau.');
        const limit=attempts.get(key);if(limit?.count>=8&&limit.until>now)fail(429,'Đăng nhập sai nhiều lần. Thử lại sau 15 phút.');
        const state=await loadState();if(!state)fail(503,'Chưa khởi tạo quản trị. Chạy npm run admin:init.');
        const user=state.data.accounts.find(u=>u.username===username);
        const valid=await verifyPassword(body.password,user?.passwordHash||'00000000000000000000000000000000:'+('0'.repeat(128)));
        if(!valid||!user?.active||!state.data.roles.some(r=>r.id===user.roleId&&r.active)) {
          attempts.set(key,{count:(limit?.count||0)+1,until:now+900000});fail(401,'Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.');
        }
        const sessionToken=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');
        const result=await transactAdmin((data,log)=>{
          const fresh=data.accounts.find(a=>a.id===user.id&&a.active&&a.authVersion===user.authVersion);
          if(!fresh||!data.roles.some(r=>r.id===fresh.roleId&&r.active))fail(401,'Tài khoản đã thay đổi. Đăng nhập lại.');
          data.sessions=data.sessions.filter(s=>s.expires>Date.now()&&s.userId!==user.id);
          data.sessions.push({hash:digest(sessionToken),userId:user.id,authVersion:user.authVersion,csrf,expires:Date.now()+8*3600000});
          log(event(user.username,'login','accounts',user.id));
          return {user:publicAccount(fresh),permissions:data.roles.find(r=>r.id===fresh.roleId).permissions,csrf};
        });
        attempts.delete(key);return send(200,result,{'Set-Cookie':cookie(sessionToken)});
      }
      if(url.pathname==='/api/facility'&&req.method==='GET') {
        const state=await loadState();if(!state)fail(503,'Chưa cấu hình cơ sở.');return send(200,state.data.settings);
      }
      const state=await loadState();if(!state)fail(503,'Chưa khởi tạo quản trị. Chạy npm run admin:init.');
      if(url.pathname==='/api/auth/me'&&req.method==='GET') {
        const {user,role,session}=authorize(state.data,token);return send(200,{user:publicAccount(user),permissions:role.permissions,csrf:session.csrf});
      }
      if(url.pathname==='/api/auth/logout'&&req.method==='POST') {
        await transactAdmin((data,log)=>{const {user}=auth(data,token,null,req);data.sessions=data.sessions.filter(s=>s.hash!==digest(token));log(event(user.username,'logout','accounts',user.id));});
        return send(200,{ok:true},{'Set-Cookie':cookie('',0)});
      }
      if(url.pathname==='/api/auth/password'&&req.method==='POST') {
        const body=await readJson(req),hashed=await hashPassword(body.password);
        await transactAdmin(async(data,log)=>{const {user}=auth(data,token,null,req);if(!await verifyPassword(body.currentPassword,user.passwordHash))fail(400,'Mật khẩu hiện tại không đúng.');user.passwordHash=hashed;user.authVersion++;user.version++;data.sessions=data.sessions.filter(s=>s.userId!==user.id);log(event(user.username,'change-password','accounts',user.id));});
        return send(200,{ok:true},{'Set-Cookie':cookie('',0)});
      }
      const parts=url.pathname.split('/').filter(Boolean),resource=parts[2],id=parts[3];
      if(parts.length>5||!adminDefinitions[resource])fail(404,'Không tìm thấy API.');
      if(resource==='dashboard'&&req.method==='GET') {
        authorize(state.data,token,'dashboard:view');const range=dateRange(url.searchParams);return send(200,{...await dashboard(range.from,range.to),...range,asOf:new Date().toISOString()});
      }
      if(resource==='audit'&&req.method==='GET') {
        authorize(state.data,token,url.searchParams.get('format')==='csv'?'audit:export':'audit:view');
        const range=dateRange(url.searchParams);
        const rows=JSON.parse(await querySql(`SELECT (SELECT CONVERT(varchar(36),id) AS id,CONVERT(varchar(33),time,126)+'Z' AS time,actor,action,entity,target,JSON_QUERY(changes) AS changes FROM dbo.MediCareAdminAudit WHERE time>=TRY_CONVERT(date,@from) AND time<DATEADD(day,1,TRY_CONVERT(date,@to)) ORDER BY time DESC,id FOR JSON PATH)`,range)||'[]');
        return outputRows(rows);
      }
      if(resource==='settings'&&req.method==='GET') {authorize(state.data,token,'settings:view');return send(200,state.data.settings);}
      if(resource==='services'&&id&&parts[4]==='prices'&&req.method==='GET') {
        authorize(state.data,token,'services:view');
        const rows=JSON.parse(await querySql(`SELECT (SELECT CONVERT(varchar(36),id) AS id,price,insurancePrice,CONVERT(varchar(33),effectiveAt,126)+'Z' AS effectiveAt,actor FROM dbo.MediCareServicePriceHistory WHERE serviceId=@id ORDER BY effectiveAt DESC FOR JSON PATH)`,{id})||'[]');
        return send(200,{rows});
      }
      if(req.method==='GET'&&(!id||id==='export')) {
        authorize(state.data,token,`${resource}:${url.searchParams.get('format')==='csv'?'export':'view'}`);
        const rows=catalogs[resource]?await catalogRows(resource):resource==='accounts'?state.data.accounts.map(publicAccount):state.data.roles;
        if(!Array.isArray(rows))fail(405,'Thao tác không hỗ trợ.');return outputRows(rows);
      }
      if(req.method==='POST'&&resource==='accounts'&&id&&parts[4]==='reset-password') {
        const body=await readJson(req),hashed=await hashPassword(body.password);
        await transactAdmin((data,log)=>{const {user}=auth(data,token,'accounts:edit',req);const account=data.accounts.find(a=>a.id===id);if(!account)fail(404,'Không tìm thấy tài khoản.');if(account.roleId==='admin'&&user.roleId!=='admin')fail(403,'Chỉ quản trị viên hệ thống được đặt lại mật khẩu quản trị.');if(account.version!==body.version)fail(409,'Tài khoản đã thay đổi. Tải lại.');account.passwordHash=hashed;account.authVersion++;account.version++;data.sessions=data.sessions.filter(s=>s.userId!==id);log(event(user.username,'reset-password',resource,id));});
        return send(200,{ok:true});
      }
      if(!['POST','PUT'].includes(req.method)||['audit','dashboard'].includes(resource)||parts.length>4)fail(405,'Thao tác không hỗ trợ.');
      const creating=req.method==='POST';if(creating&&id||!creating&&!id)fail(400,'Đường dẫn bản ghi không hợp lệ.');
      const body=await readJson(req);
      // Early authorization avoids spending hashing/SQL work for unauthorized callers.
      auth(state.data,token,`${resource}:${creating?'create':'edit'}`,req);
      const passwordHash=resource==='accounts'&&creating?await hashPassword(body.password):null;
      const requestKey=req.headers['idempotency-key'];
      if(typeof requestKey!=='string'||!/^[A-Za-z0-9-]{16,80}$/.test(requestKey))fail(400,'Thiếu mã thao tác hợp lệ. Tải lại biểu mẫu.');
      const fingerprint=digest(JSON.stringify({resource,id,body}));
      const result=await transactAdmin(async(data,log,effect)=>{
        const {user}=auth(data,token,`${resource}:${creating?'create':'edit'}`,req);
        data.requests=(data.requests||[]).filter(r=>r.at>Date.now()-86400000);
        const previousRequest=data.requests.find(r=>r.key===requestKey&&r.userId===user.id);
        if(previousRequest){if(previousRequest.fingerprint!==fingerprint)fail(409,'Mã thao tác đã dùng cho dữ liệu khác.');return previousRequest.result;}
        let saved;
        if(catalogs[resource]) {
          const old=creating?null:await catalogRow(resource,id);if(!creating&&!old)fail(404,'Không tìm thấy bản ghi.');
          if(old&&body.active===false&&old.active)auth(data,token,`${resource}:deactivate`,req);
          const operation=catalogEffect(resource,body,old,user.username);
          if(resource==='staff'&&!operation.record.active&&data.accounts.some(a=>a.staffId===id&&a.active))fail(409,'Khóa tài khoản liên kết trước khi ngừng nhân viên.');
          effect(operation);saved={id:operation.record.id};log(event(user.username,creating?'create':'update',resource,saved.id,safeChanges(old,operation.record)));
        } else if(resource==='settings') {
          if(creating)fail(405,'Cấu hình chỉ hỗ trợ cập nhật.');
          if(body.version!==data.settings.version)fail(409,'Cấu hình đã thay đổi. Tải lại.');
          const old=data.settings;data.settings={...validate(resource,body),version:old.version+1};saved=data.settings;log(event(user.username,'update',resource,'facility',safeChanges(old,saved)));
        } else {
          const rows=data[resource],old=creating?null:rows.find(r=>r.id===id);
          if(!creating&&!old)fail(404,'Không tìm thấy bản ghi.');
          if(old&&body.version!==old.version)fail(409,'Bản ghi đã thay đổi. Tải lại trước khi lưu.');
          const values=validate(resource,body,{create:creating});
          if(old&&old.active&&!values.active)auth(data,token,`${resource}:deactivate`,req);
          if(resource==='roles') {
            // Only the designated administrator can delegate administrative powers.
            if(user.roleId!=='admin')fail(403,'Chỉ quản trị viên hệ thống được thay đổi vai trò.');
            if(rows.some(r=>r.id!==id&&r.name.toLowerCase()===values.name.toLowerCase()))fail(409,'Tên vai trò đã tồn tại.');
            if(!values.active&&data.accounts.some(a=>a.active&&a.roleId===id))fail(409,'Vai trò còn tài khoản đang hoạt động.');
          } else {
            if(rows.some(r=>r.id!==id&&r.username===values.username))fail(409,'Tên đăng nhập đã tồn tại.');
            if(!data.roles.some(r=>r.id===values.roleId&&r.active))fail(400,'Vai trò không hợp lệ hoặc đã ngừng hoạt động.');
            if((values.roleId==='admin'||old?.roleId==='admin')&&user.roleId!=='admin')fail(403,'Chỉ quản trị viên hệ thống được quản lý tài khoản quản trị.');
            if(values.roleId!==old?.roleId&&user.roleId!=='admin')fail(403,'Chỉ quản trị viên hệ thống được gán vai trò.');
            if(user.roleId!=='admin'&&((values.patientId||'')!==(old?.patientId||'')||(values.staffId||'')!==(old?.staffId||'')))fail(403,'Chỉ quản trị viên hệ thống được thay đổi hồ sơ liên kết.');
            if(values.patientId){if(values.staffId)fail(400,'Chỉ liên kết nhân viên hoặc bệnh nhân.');if(!/^[A-Za-z0-9_-]{1,20}$/.test(values.patientId)||!await querySql('SELECT maBenhNhan FROM dbo.BenhNhan WHERE maBenhNhan=@id',{id:values.patientId}))fail(400,'Hồ sơ bệnh nhân không tồn tại.');}
            if(values.staffId){const staff=await catalogRow('staff',values.staffId);if(!staff?.active)fail(400,'Nhân viên không tồn tại hoặc đã ngừng làm việc.');if(rows.some(a=>a.id!==id&&a.staffId===values.staffId))fail(409,'Nhân viên đã có tài khoản liên kết.');}
          }
          const row={...old,...values,id:old?.id||randomUUID(),version:(old?.version||0)+1};
          if(resource==='roles'&&(values.workspaceRole||'')!==(old?.workspaceRole||'')&&user.roleId!=='admin')fail(403,'Chỉ quản trị viên hệ thống được gán vai trò nghiệp vụ.');
          if(resource==='accounts') {row.passwordHash=passwordHash||old.passwordHash;row.authVersion=(old?.authVersion||0)+1;}
          if(creating)rows.push(row);else rows[rows.indexOf(old)]=row;
          ensureLastAdmin(data);
          if(resource==='roles')data.sessions=data.sessions.filter(s=>!data.accounts.some(a=>a.id===s.userId&&a.roleId===id));
          else data.sessions=data.sessions.filter(s=>s.userId!==id);
          saved=resource==='accounts'?publicAccount(row):row;
          log(event(user.username,creating?'create':'update',resource,row.id,safeChanges(old,row)));
        }
        data.requests.push({key:requestKey,userId:user.id,fingerprint,result:saved,at:Date.now()});
        return saved;
      });
      return send(creating?201:200,result);

      function outputRows(rows) {
        if(url.searchParams.get('format')!=='csv')return send(200,paging(rows,url.searchParams));
        const filtered=paging(rows,new URLSearchParams({...Object.fromEntries(url.searchParams),size:'100',page:'1'}));
        // Export all matching rows, with the same server-side filters and permissions.
        const q=(url.searchParams.get('q')||'').toLowerCase(),active=url.searchParams.get('active');
        const all=rows.filter(r=>(active===null||r.active===undefined||r.active===(active==='true'))&&Object.values(r).filter(v=>typeof v==='string').some(v=>v.toLowerCase().includes(q)));
        const keys=[...new Set(all.flatMap(Object.keys))].filter(k=>!['authVersion','version'].includes(k));
        const cell=v=>'"'+String(typeof v==='object'?JSON.stringify(v):v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
        const csv='\uFEFF'+[keys,...all.map(r=>keys.map(k=>r[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
        res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="medicare-${resource}.csv"`});res.end(csv);
      }
    } catch(error) {
      const sqlErrors={ADMIN_REFERENCE:[409,'Khoa hoặc buồng liên kết không còn hoạt động.'],ADMIN_DUPLICATE:[409,'Mã hoặc số hiệu đã tồn tại.'],ADMIN_CAPACITY:[409,'Công suất không đủ hoặc nhỏ hơn số giường hiện có.'],ADMIN_IN_USE:[409,'Bản ghi đang được sử dụng. Hoàn tất nghiệp vụ liên quan trước khi thay đổi.'],ADMIN_STALE:[409,'Bản ghi đã thay đổi. Tải lại trước khi lưu.']};
      const known=Object.entries(sqlErrors).find(([key])=>error.message.includes(key))?.[1];
      const status=known?.[0]||error.status||503;
      if(!error.status&&!known)console.error('[admin-api] SQL/service operation failed');
      return send(status,{error:known?.[1]||(error.status?error.message:'Không kết nối được dịch vụ dữ liệu. Kiểm tra SQL Server và thử lại.')});
    }
  };
}
