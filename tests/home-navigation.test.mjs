import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';

test('public home links directly to the authenticated workspace without a demo role chooser',async()=>{
 const outfile=path.resolve('.data/QA_TEST_home_navigation_'+randomUUID()+'.mjs');
 await fs.mkdir('.data',{recursive:true});
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Home from './src/Home.jsx';export const html=renderToStaticMarkup(React.createElement(Home,{page:'trang-chu'}));`,resolveDir:process.cwd(),loader:'jsx'},outfile,bundle:true,platform:'node',format:'esm',packages:'external',loader:{'.css':'empty'},define:{'import.meta.env.DEV':'false'}});
 const {html}=await import(pathToFileURL(outfile).href);
 assert.equal((html.match(/href="#management"/g)||[]).length,2);
 assert.match(html,/Đăng nhập \/ Đăng ký/);
 assert.doesNotMatch(html,/Bạn muốn truy cập ở đâu|public-login-choices|Lịch hẹn lưu trên trình duyệt/);
 // This checks rendered links only; actual browser navigation is a separate acceptance case.
});
