import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try{const page=await browser.newPage();
for(const width of [1536,1024,768,390]){
 await page.setViewportSize({width,height:844});
 await page.goto('http://127.0.0.1:5175/#chuyen-khoa',{waitUntil:'domcontentloaded'});
 await page.locator('#chuyen-khoa').waitFor();await page.waitForTimeout(150);
 const bounds=await page.evaluate(()=>{const a=document.querySelector('.home-floating').getBoundingClientRect(),b=document.querySelector('.home-hero-image').getBoundingClientRect();return {inside:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom,anchor:document.querySelector('#chuyen-khoa').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth}});
 assert(bounds.inside,'Chú thích phải nằm trong ảnh tại '+width);
 assert(Math.abs(bounds.anchor-20)<3,'Phải đến chuyên khoa khi mở URL tại '+width);
 assert(!bounds.overflow,'Không được tràn ngang tại '+width);
}
console.log('PASS: chú thích nằm trong ảnh; mở chuyên khoa đúng vị trí; 4 kích thước màn hình');
}finally{await browser.close()}
