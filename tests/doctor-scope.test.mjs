import test from 'node:test';import assert from 'node:assert/strict';import {assignedToDoctor} from '../src/doctor-scope.js';
test('doctor queue follows staff assignment despite changed display name and rejects same-name or unassigned visits',()=>{
 assert.equal(assignedToDoctor({doctorStaffId:'QA_TEST_CXK_BS1',doctor:'Tên hồ sơ khác'},'QA_TEST_CXK_BS1'),true);
 assert.equal(assignedToDoctor({doctorStaffId:'QA_TEST_OTHER',doctor:'Trần Minh Anh'},'QA_TEST_CXK_BS1'),false);
 assert.equal(assignedToDoctor({doctor:'Trần Minh Anh'},'QA_TEST_CXK_BS1'),false);
 assert.equal(assignedToDoctor({},undefined),false);
});
