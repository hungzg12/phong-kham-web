// Display names are editable; assignments use the staff identifier returned by SQL.
export function assignedToDoctor(record,staffId){return !!staffId&&record?.doctorStaffId===staffId;}
