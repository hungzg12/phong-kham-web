param([switch]$Persistent)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
function Invoke-AdminSql($payload) {
    $db = $null
    try {
        $connection = $payload.connection
        if (!$connection) { $connection = 'Server=.\SQLEXPRESS;Database=QuanLyBenhVien;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5' }
        $db = [System.Data.SqlClient.SqlConnection]::new($connection)
        $db.Open()
        $cmd = $db.CreateCommand()
        $cmd.CommandTimeout = 45
        $cmd.CommandText = $payload.query
        foreach ($property in $payload.parameters.PSObject.Properties) {
            $parameter = $cmd.Parameters.Add('@' + $property.Name, [System.Data.SqlDbType]::NVarChar, -1)
            $parameter.Value = if ($null -eq $property.Value) { [DBNull]::Value } else { [string]$property.Value }
        }
        if ($payload.rows) {
            $reader = $cmd.ExecuteReader()
            $items = [System.Collections.Generic.List[object]]::new()
            while ($reader.Read()) {
                $row = [ordered]@{}
                for ($index = 0; $index -lt $reader.FieldCount; $index++) {
                    $row[$reader.GetName($index)] = if ($reader.IsDBNull($index)) { $null } else { $reader.GetValue($index) }
                }
                $items.Add([pscustomobject]$row)
            }
            $reader.Close()
            return (ConvertTo-Json -InputObject @($items.ToArray()) -Depth 8 -Compress)
        } else {
            $result = $cmd.ExecuteScalar()
            if ($null -ne $result -and $result -isnot [DBNull]) { return [string]$result }
            return ''
        }
    } finally { if ($null -ne $db) { $db.Dispose() } }
}
if ($Persistent) {
    while ($null -ne ($line = [Console]::ReadLine())) {
        $payload = $null
        try {
            $payload = $line | ConvertFrom-Json
            $result = Invoke-AdminSql $payload
            [Console]::WriteLine((@{id=$payload.id; result=$result} | ConvertTo-Json -Depth 12 -Compress))
        } catch {
            [Console]::WriteLine((@{id=$payload.id; error=('SQL operation failed: ' + $_.Exception.Message)} | ConvertTo-Json -Depth 12 -Compress))
        }
    }
} else {
    try { [Console]::Write((Invoke-AdminSql ([Console]::In.ReadToEnd() | ConvertFrom-Json))) }
    catch { [Console]::Error.Write('SQL operation failed: ' + $_.Exception.Message); exit 1 }
}
