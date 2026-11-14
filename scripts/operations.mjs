import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5175/#management',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Nghiệp vụ bổ sung',exact:true}).click();
 const modules=await page.evaluate(async()=>{const {operationModules}=await import('/src/operations-data.js');return operationModules});assert.equal(modules.length,24);
 for(const m of modules){
  await page.locator('.ops-menu button').filter({hasText:m.title}).click();
  await page.getByRole('button',{name:'Tạo biểu mẫu',exact:true}).click();const dialog=page.getByRole('dialog');
  for(const f of m.fields){const control=dialog.locator('[name="'+f.key+'"]');if(['patient','staff','select'].includes(f.type)){const options=await control.locator('option').evaluateAll(es=>es.map(e=>e.value).filter(Boolean));await control.selectOption(options[f.key==='relatedPatient'?1:f.key==='destination'?1:0]);}else await control.fill(f.type==='number'?'2':f.type==='date'?'2026-11-14':f.type==='datetime-local'?'2026-11-14T08:00':'Ghi nhận mẫu '+f.label);}
  await dialog.getByRole('button',{name:'Lưu biểu mẫu demo',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Bước tiếp',exact:true}).first().click();await dialog.getByLabel('Lý do / kết quả xử lý').fill('Xác nhận xử lý demo');await dialog.getByRole('button',{name:'Xác nhận mô phỏng',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert(await page.locator('.ops-content tbody').innerText().then(t=>t.includes(m.states[1])));
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Nghiệp vụ bổ sung',exact:true}).click();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('medicare-workspace-v3')));assert.equal(state.business.operations.records.length,24);assert.equal(state.business.operations.events.length,48);
 await page.locator('.ops-content .record-link').first().click();await page.getByRole('heading',{name:'Lịch sử xử lý',exact:true}).waitFor();assert.equal(await page.locator('.ops-history article').count(),2);await page.getByRole('button',{name:/Hủy biểu mẫu/}).click();await page.getByLabel('Lý do / kết quả xử lý').fill('Hủy thử nghiệm');await page.getByRole('button',{name:'Xác nhận mô phỏng',exact:true}).click();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'qa/operations-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>sessionStorage.setItem('medicare-actor','cashier'));await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Nghiệp vụ bổ sung',exact:true}).click();assert.equal(await page.locator('.ops-menu button').filter({hasText:'Phiên & yêu cầu truy cập'}).count(),0);assert.equal(await page.locator('.ops-menu button').filter({hasText:'Thanh toán online'}).count(),1);
 const payment=await page.evaluate(()=>JSON.parse(localStorage.getItem('medicare-workspace-v3')).business.settlements);assert.equal(payment.length,0);assert.deepEqual(errors,[]);
 console.log('PASS: 24 biểu mẫu, 24 lần chuyển bước, lưu qua tải lại, lịch sử, hủy có lý do, mobile, giới hạn vai trò, không làm thay đổi quyết toán');await context.close();
}finally{await browser.close()}
