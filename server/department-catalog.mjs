import {querySql} from './admin-store.mjs';
export async function resolveDepartment(value){
 if(typeof value!=='string'||!value.trim())throw Object.assign(new Error('Chọn chuyên khoa hợp lệ.'),{status:400});
 const list=JSON.parse(await querySql("SELECT (SELECT maKhoa id FROM dbo.Khoa WHERE dangHoatDong=1 AND (maKhoa=@value OR tenKhoa COLLATE Vietnamese_CI_AI=@value COLLATE Vietnamese_CI_AI) FOR JSON PATH)",{value:value.trim()})||'[]');
 if(list.length!==1)throw Object.assign(new Error(list.length?'Tên khoa bị trùng. Chọn khoa bằng mã trong danh mục.':'Chuyên khoa không tồn tại hoặc đã ngừng hoạt động.'),{status:409});
 return list[0].id;
}
