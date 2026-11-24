import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {querySql} from '../server/admin-store.mjs';
import {pharmacyAction,pharmacyState} from '../server/pharmacy.mjs';
const saved=JSON.parse(await fs.readFile(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw Error('Only isolated QA database allowed');
process.env.MEDICARE_SQL_CONNECTION='Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5;Database='+saved.database;
if(await querySql('SELECT DB_NAME()')!==saved.database)throw Error('Wrong database');
const staff=await querySql("SELECT TOP 1 maNhanVien FROM dbo.NhanVien WHERE chuyenMon='DUOC_SI' AND dangLamViec=1 ORDER BY maNhanVien");
if(!staff)throw Error('Missing active pharmacist');
let state=await pharmacyState();const warehouse=state.warehouses.find(w=>w.status==='Đang hoạt động'&&!w.countId)?.id;
if(!warehouse)throw Error('Missing available warehouse');
const names=['Paracetamol','Ibuprofen','Diclofenac','Celecoxib','Meloxicam','Omeprazol','Pantoprazol','Cetirizin','Loratadin','Amlodipin','Losartan','Metformin','Gliclazid','Atorvastatin','Amoxicillin','Cefuroxim','Azithromycin','Calci','Vitamin D3','Vitamin C'];
const act=(action,data)=>pharmacyAction({action,role:'pharmacist',staffId:staff,requestId:randomUUID(),...data});
let added=0;
for(const [index,name] of names.entries()){
 const id='QA_MED_'+String(index+1).padStart(3,'0');
 state=await pharmacyState();
 if(state.stock.some(s=>s.id===id)){
  const pending=state.movements.find(m=>m.medicine===id&&m.status==='Chờ duyệt'&&m.reason==='QA_DEMO_SEED');
  if(pending)await act('approveMovement',{id:pending.id});
  continue;
 }
 const movement=await act('createProduct',{productId:id,name:'[DEMO] '+name,unit:'Viên',productType:'Thuốc',ingredient:name,strength:'Mô phỏng QA, không dùng kê đơn thực tế',route:'Uống',form:'Viên mô phỏng',kind:'Nhập kho',warehouse,quantity:500,price:1000+(index%5)*500,lot:'QA-DEMO-'+id,expiry:'2029-12-31',reason:'QA_DEMO_SEED'});
 await act('approveMovement',{id:movement.id});added++;
}
state=await pharmacyState();const demo=state.stock.filter(s=>s.id.startsWith('QA_MED_'));
if(demo.length!==20||demo.some(s=>Number(s.qty)<=0))throw Error('Demo stock verification failed');
console.log(JSON.stringify({added,total:demo.length,warehouse,totalAvailable:demo.reduce((n,s)=>n+Number(s.qty),0),names:demo.map(s=>s.name)}));
