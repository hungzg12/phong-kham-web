import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { querySql } from '../server/admin-store.mjs';

export async function backupDatabase() {
 const database=await querySql('SELECT DB_NAME()');
 if(!/^[A-Za-z0-9_]+$/.test(database)||['master','model','tempdb','msdb'].includes(database))throw new Error('Select an application database first.');
 const directory=await querySql("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultBackupPath'))");
 if(!directory)throw new Error('SQL Server has no default backup directory.');
 const file=path.win32.join(directory,`${database}_${new Date().toISOString().replace(/[:.]/g,'-')}_${randomBytes(4).toString('hex')}.bak`);
 await querySql(`BACKUP DATABASE [${database}] TO DISK=@file WITH COPY_ONLY,CHECKSUM;
  RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM; SELECT 'ok';`,{file});
 return {database,file};
}
export async function restoreToNewDatabase(file,target='MediCareRestore_'+randomBytes(8).toString('hex')) {
 if(!/^MediCareRestore_[A-Za-z0-9_]{8,40}$/.test(target))throw new Error('Restore target must start with MediCareRestore_ and be a new database.');
 if(await querySql('SELECT DB_ID(@target)',{target}))throw new Error('Restore target already exists; overwriting is forbidden.');
 const files=JSON.parse(await querySql('RESTORE FILELISTONLY FROM DISK=@file',{file},{rows:true}));
 const directory=await querySql("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultDataPath'))");
 const moves=[],parameters={file};
 files.forEach((entry,index)=>{if(!['D','L'].includes(entry.Type))throw new Error('Unsupported backup file type.');parameters['logical'+index]=entry.LogicalName;parameters['path'+index]=path.win32.join(directory,`${target}_${index}.${entry.Type==='L'?'ldf':'mdf'}`);moves.push(`MOVE @logical${index} TO @path${index}`);});
 // Intentionally no WITH REPLACE and no operation against an existing database.
 await querySql(`RESTORE DATABASE [${target}] FROM DISK=@file WITH ${moves.join(',')},CHECKSUM,RECOVERY; SELECT 'ok';`,parameters);
 return {target};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const action=process.argv[2];
 const operation=action==='backup'?backupDatabase():action==='restore-new'&&process.argv[3]?restoreToNewDatabase(process.argv[3],process.argv[4]):Promise.reject(new Error('Usage: node scripts/admin-backup.mjs backup | restore-new <SQL-server-path.bak> [MediCareRestore_name]'));
 operation.then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
