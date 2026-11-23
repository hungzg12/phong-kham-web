import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {equipmentState,equipmentAction} from '../server/equipment.mjs';
import {processNotifications} from '../server/notifications.mjs';

test('existing equipment workflow persists, serializes retries, audits and never broadcasts unassigned incidents',async()=>{
 const f=await adminFixture();try{
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('QA_TEST_K',N'QA_TEST Khoa','LAM_SANG');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_REPORTER',N'QA_TEST Reporter','QA_TEST_K',N'QA_TEST','QUAN_TRI');SELECT 'ok';`);
 const actor={role:'admin',userId:'QA_TEST_ADMIN'};
 const call=data=>equipmentAction(actor,{requestId:randomUUID(),...data});
 assert.deepEqual((await equipmentState()).equipment,[]);
 const draft={action:'saveEquipment',name:'QA_TEST ECG',serial:'QA_TEST_SERIAL',department:'QA_TEST Khoa',nextService:'2027-01-01',requestId:randomUUID()};
 const created=await call(draft);assert.deepEqual(await call(draft),created);
 assert.equal((await equipmentState()).equipment.length,1);
 await assert.rejects(call({...draft,requestId:randomUUID()}),e=>e.status===409);
 await assert.rejects(equipmentAction({role:'nurse',userId:'QA_TEST_OTHER'},draft),e=>e.status===403);
 await assert.rejects(call({...draft,role:'admin'}),e=>e.status===400);
 const device=(await equipmentState()).equipment[0];
 await call({...draft,id:created.id,name:'QA_TEST ECG edited',revision:device.revision,requestId:randomUUID()});
 await assert.rejects(call({...draft,id:created.id,revision:device.revision,requestId:randomUUID()}),e=>e.status===409);
 const report={action:'reportIncident',device:created.id,reporter:'QA_TEST_REPORTER',severity:'Nghiêm trọng',reason:'QA_TEST sự cố',requestId:randomUUID()};
 const results=await Promise.all([call(report),call(report)]);assert.equal(results[0].id,results[1].id);
 let state=await equipmentState();assert.equal(state.incidents.length,1);assert.equal(state.incidents[0].status,'Chờ tiếp nhận');
 const incident=state.incidents[0];
 await assert.rejects(call({action:'maintain',id:incident.id,revision:incident.revision,maintenance:'QA_TEST',engineer:'QA_TEST'}),e=>e.status===409);
 await assert.rejects(call({...report,requestId:randomUUID()}),e=>e.status===409);
 await call({action:'acceptIncident',id:incident.id,revision:incident.revision});
 state=await equipmentState();assert.equal(state.equipment[0].status,'Ngừng sử dụng');
 await assert.rejects(call({action:'toggleDevice',id:created.id,revision:state.equipment[0].revision}),e=>e.status===409);
 await call({action:'maintain',id:incident.id,revision:state.incidents[0].revision,maintenance:'QA_TEST repaired',engineer:'QA_TEST engineer'});
 state=await equipmentState();assert.equal(state.equipment[0].status,'Đang hoạt động');assert.equal(state.incidents[0].status,'Đã nghiệm thu');
 assert.equal(state.incidents[0].engineer,'QA_TEST engineer');
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.MediCareAdminAudit WHERE entity='equipment' AND actor='QA_TEST_ADMIN'")),5);
 await processNotifications();
 assert.equal(await querySql("SELECT state FROM dbo.MediCareNotificationOutbox WHERE source='Equipment' AND target=@id",{id:incident.id}),'UNDELIVERED');
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.MediCareNotification WHERE eventId IN(SELECT id FROM dbo.MediCareNotificationOutbox WHERE source='Equipment')")),0);
 // A failure after the business write must roll back device, request, audit and outbox together.
 await querySql(`CREATE OR ALTER TRIGGER dbo.QA_TEST_EquipmentAuditFail ON dbo.MediCareAdminAudit AFTER INSERT AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE entity='equipment') THROW 51000,'QA_TEST audit unavailable',1; END;`);
 await assert.rejects(call({...draft,name:'QA_TEST rollback',serial:'QA_TEST_ROLLBACK',requestId:randomUUID()}),/QA_TEST audit unavailable/);
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.MediCareEquipment WHERE serial='QA_TEST_ROLLBACK'")),0);
 }finally{await f.close();}
});
