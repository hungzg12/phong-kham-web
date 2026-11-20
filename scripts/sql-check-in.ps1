$ErrorActionPreference = 'Stop'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$connection = $env:MEDICARE_SQL_CONNECTION
if ([string]::IsNullOrWhiteSpace($connection)) {
    $connection = 'Server=.\SQLEXPRESS;Database=QuanLyBenhVien;Integrated Security=True;TrustServerCertificate=True'
}
$db = [System.Data.SqlClient.SqlConnection]::new($connection)
try {
    $db.Open()
    $cmd = $db.CreateCommand()
    $cmd.CommandType = [System.Data.CommandType]::StoredProcedure
    $cmd.CommandText = 'dbo.MediCareTiepDon'
    $cmd.Parameters.Add('@maHen',[System.Data.SqlDbType]::VarChar,20).Value = [string]$data.id
    $cmd.Parameters.Add('@lyDo',[System.Data.SqlDbType]::NVarChar,255).Value = [string]$data.reason
    $reader = $cmd.ExecuteReader()
    if (!$reader.Read()) { throw 'No visit returned' }
    @{visitId=$reader.GetString(0);queueNumber=$reader.GetInt32(1)} | ConvertTo-Json -Compress
} catch [System.Data.SqlClient.SqlException] {
    if ($_.Exception.Number -eq 51101) { '{"conflict":true}' } else { throw }
} finally { $db.Dispose() }
