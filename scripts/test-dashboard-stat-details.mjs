import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {actorRoles} from '../src/roles.js';

const url = process.env.MEDICARE_URL || 'http://127.0.0.1:3000/#management';
const browser = await chromium.launch(process.env.CI ? {} : {channel:'msedge'});
try {
  for (const [id, role] of Object.entries(actorRoles)) {
    const page = await browser.newPage();
    await page.addInitScript(roleId => sessionStorage.setItem('medicare-actor', roleId), id);
    await page.goto(url);
    await page.getByRole('heading',{name:role.home,exact:true,level:1}).waitFor();
    const cards = page.locator(id === 'admin' ? '.stat-card-button' : '.actor-stat-link');
    await cards.first().waitFor();
    assert.equal(await cards.count(), id === 'admin' ? 4 : 3);
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      for (const card of await cards.all()) {
        if (width === 1440) await card.click();
        else await card.press('Enter');
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button',{name:'Quay lại tổng quan'}).click();
        await dialog.waitFor({state:'hidden'});
      }
    }
    await page.close();
    console.log('PASS '+id);
  }
} finally {
  await browser.close();
}
