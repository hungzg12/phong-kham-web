$ErrorActionPreference='Stop'
$cli=(Get-Command sqlcmd.exe -ErrorAction SilentlyContinue).Source
if(!$cli){$cli='C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'}
$name='MediCareQA_'+[guid]::NewGuid().ToString('N')
$tmp=Join-Path $env:TEMP ($name+'.sql')
$keys=@('MEDICARE_SQL_MODE','MEDICARE_SQL_CONNECTION','MEDICARE_QA_DAY')
$previous=@{}
foreach($key in $keys){$previous[$key]=[Environment]::GetEnvironmentVariable($key)}
function Run-Sql($arguments){
 & $cli -S '.\SQLEXPRESS' -E -C -b @arguments
 if($LASTEXITCODE){throw 'SQL verification failed'}
}
Push-Location (Join-Path $PSScriptRoot '..')
try {
 [IO.File]::WriteAllText($tmp,[IO.File]::ReadAllText((Resolve-Path 'database/QuanLyBenhVien_SQLServer.sql')).Replace('QuanLyBenhVien',$name),[Text.UTF8Encoding]::new($true))
 Run-Sql @('-i',$tmp)
 foreach($file in @('scripts/sql-booking-seed.sql','database/migrations/001_sql_tiep_don.sql','database/migrations/002_sql_ban_kham.sql','database/migrations/003_sql_dang_nhap.sql','scripts/sql-auth-qa.sql')){
  Run-Sql @('-d',$name,'-i',$file)
 }
 $env:MEDICARE_SQL_MODE='true'
 $env:MEDICARE_SQL_CONNECTION="Server=.\SQLEXPRESS;Database=$name;Integrated Security=True;TrustServerCertificate=True"
 $output=Run-Sql @('-d',$name,'-h','-1','-Q',"SET NOCOUNT ON; SELECT CONVERT(char(10),SYSDATETIME(),23);")
 $env:MEDICARE_QA_DAY=($output|Where-Object {$_ -match '\d{4}-\d{2}-\d{2}'}|Select-Object -First 1).Trim()
 node scripts/test-sql-outpatient.mjs
 if($LASTEXITCODE){throw 'Outpatient QA failed'}
 Run-Sql @('-d',$name,'-Q',"IF (SELECT COUNT(*) FROM dbo.LuotKham)<>1 THROW 51115,'Visit count mismatch',1; SELECT hanhDong,COUNT(*) AS Events FROM dbo.NhatKyThayDoi GROUP BY hanhDong;")
}finally{
 try{Run-Sql @('-d','master','-Q',"IF DB_ID(N'$name') IS NOT NULL DROP DATABASE [$name];")}
 finally{
  foreach($key in $keys){[Environment]::SetEnvironmentVariable($key,$previous[$key])}
  Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
  Pop-Location
 }
}
