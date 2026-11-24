const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().trim();
export function matchesPatient(patient,query){const text=normalize([patient.name,patient.id,patient.phone,patient.cccd,patient.insurance].filter(Boolean).join(' '));return normalize(query).split(/\s+/).every(word=>text.includes(word));}
