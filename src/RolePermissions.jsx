import React from 'react';
import {businessGroups} from './business-permissions.js';
import {adminDefinitions,adminPermissions} from './admin-schema.js';
const actionLabels={view:'Xem',create:'Tạo',edit:'Sửa',deactivate:'Ngừng hoạt động',export:'Xuất dữ liệu',restore:'Phục hồi sang database mới'};
export default function RolePermissions({value=[],onChange}){
 const toggle=(key,checked)=>onChange(checked?[...new Set([...value,key])]:value.filter(p=>p!==key));
 const group=(title,items)=><fieldset key={title}><legend>{title}</legend>{items.map(([key,label])=><label key={key}><input type="checkbox" checked={value.includes(key)} onChange={e=>toggle(key,e.target.checked)}/>{label}</label>)}</fieldset>;
 return <section className="admin-permissions"><p>Quyền áp dụng cho mọi tài khoản thuộc vai trò này. Không tích = không được sử dụng. Quyền thao tác cần quyền Xem của cùng nhóm; phạm vi hồ sơ và phân công vẫn được kiểm tra.</p><h3>Quyền nghiệp vụ</h3><div className="permission-grid">{Object.entries(businessGroups).map(([key,[label,actions]])=>group(label,Object.entries(actions).map(([action,name])=>['biz.'+key+':'+action,name])))}</div><h3>Quyền quản trị hệ thống</h3><div className="permission-grid">{Object.entries(adminDefinitions).filter(([key])=>adminPermissions.some(p=>p.startsWith(key+':'))).map(([key,definition])=>group(definition.label,adminPermissions.filter(p=>p.startsWith(key+':')).map(p=>[p,actionLabels[p.split(':')[1]]])))}{group('Sao lưu & phục hồi (chỉ quản trị viên)',[['backups:view','Xem'],['backups:create','Sao lưu'],['backups:restore','Phục hồi sang database mới']])}</div></section>;
}
