$ErrorActionPreference = 'Stop'
$con = [System.Data.SqlClient.SqlConnection]::new('Server=.\MSSQLVESE;Database=QuanLyBenhVien;Integrated Security=True')
$con.Open()
$cmd = $con.CreateCommand()
$cmd.CommandText = @"
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME IN ('GiaoDichThanhToan', 'QuyetToan', 'ChiTietQuyetToan') 
ORDER BY TABLE_NAME, ORDINAL_POSITION;
"@
$r = $cmd.ExecuteReader()
while ($r.Read()) {
    Write-Host ($r['TABLE_NAME'] + '.' + $r['COLUMN_NAME'] + ' (' + $r['DATA_TYPE'] + ', ' + $r['IS_NULLABLE'] + ')')
}
$r.Close()

Write-Host "`n--- Check Constraints on Billing ---"
$cmd2 = $con.CreateCommand()
$cmd2.CommandText = @"
SELECT t.name, cc.name, cc.definition 
FROM sys.check_constraints cc 
JOIN sys.tables t ON t.object_id = cc.parent_object_id 
WHERE t.name IN ('GiaoDichThanhToan', 'QuyetToan', 'ChiTietQuyetToan');
"@
$r2 = $cmd2.ExecuteReader()
while ($r2.Read()) {
    Write-Host ($r2[0] + ' | ' + $r2[1] + ' | ' + $r2[2])
}
$con.Close()
