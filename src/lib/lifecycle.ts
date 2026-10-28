import type { State } from "./types.ts";
// Upgrade legacy local-file records without changing the clinical encounter.
export function normalizeLifecycle(state:State){for(const a of state.appointments){if(["waiting","examining","completed"].includes(a.status as string)&&state.visits.some(v=>v.appointmentId===a.id))a.status="received";}return state;}
