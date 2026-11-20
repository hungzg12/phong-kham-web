$ErrorActionPreference = 'Stop'
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new($env:CLINIC_SQLSERVER_CONNECTION)
$db = [System.Data.SqlClient.SqlConnection]::new($builder.ConnectionString)
try {
    $db.Open()
    $cmd = $db.CreateCommand()
    $cmd.CommandTimeout = 10
    switch ($request.action) {
        'read' {
            $cmd.CommandText = 'EXEC dbo.ClinicRead'
        }
        'initialize' {
            $cmd.CommandText = 'EXEC dbo.ClinicSave @payload=@payload'
            $cmd.Parameters.Add('@payload',[System.Data.SqlDbType]::NVarChar,-1).Value = [string]$request.payload
        }
        'write' {
            $cmd.CommandText = 'EXEC dbo.ClinicSave @payload=@payload,@revision=@revision'
            $cmd.Parameters.Add('@payload',[System.Data.SqlDbType]::NVarChar,-1).Value = [string]$request.payload
            $cmd.Parameters.Add('@revision',[System.Data.SqlDbType]::VarChar,16).Value = [string]$request.revision
        }
        default { throw 'Invalid storage action' }
    }
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    if ($request.action -eq 'read') {
        $reader = $cmd.ExecuteReader()
        $result = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { if (!$reader.IsDBNull(0)) { $null = $result.Append($reader.GetString(0)) } }
        if ($result.Length) { [Console]::Write($result.ToString()) } else { [Console]::Write('null') }
    } else { [Console]::Write($cmd.ExecuteScalar()) }
} finally { $db.Dispose() }
