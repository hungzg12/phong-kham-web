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
    $cmd.CommandText = 'dbo.MediCareKhamNgoaiTru'
    $cmd.Parameters.Add('@staff',[System.Data.SqlDbType]::VarChar,20).Value = [string]$data.staff
    $cmd.Parameters.Add('@action',[System.Data.SqlDbType]::VarChar,10).Value = [string]$data.action
    $cmd.Parameters.Add('@visit',[System.Data.SqlDbType]::VarChar,20).Value = [string]$data.visit
    $cmd.Parameters.Add('@history',[System.Data.SqlDbType]::NVarChar,2000).Value = [string]$data.history
    $cmd.Parameters.Add('@conclusion',[System.Data.SqlDbType]::NVarChar,500).Value = [string]$data.conclusion
    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { if (!$reader.IsDBNull(0)) { $null = $json.Append($reader.GetString(0)) } }
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} catch [System.Data.SqlClient.SqlException] {
    if ($_.Exception.Number -eq 51110) { '{"conflict":true}' } else { throw }
} finally { $db.Dispose() }
