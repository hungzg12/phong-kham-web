export type Role = "patient" | "doctor" | "reception" | "admin";
export type AppointmentStatus = "pending" | "confirmed" | "received" | "cancelled" | "rejected";
export type VisitStatus = "waiting" | "examining" | "completed";
export type Status = AppointmentStatus | VisitStatus;
export interface User {id:string;username:string;name:string;role:Role;passwordHash:string;active:boolean;version:number;patientId?:string;doctorId?:string;email:string}
export interface Patient {id:string;name:string;birth:string;gender:string;phone:string;address:string;history:string;allergies:string;createdAt:string}
export interface Doctor {id:string;name:string;specialtyId:string;title:string;initials:string;color:string;active:boolean;bio:string;phone:string}
export interface Specialty {id:string;name:string;active:boolean}
export interface Shift {id:string;doctorId:string;date:string;start:string;end:string;capacity:number;reserved?:number;active:boolean}
export interface Appointment {id:string;patientId:string;shiftId:string;time:string;reason:string;status:AppointmentStatus;createdAt:string;requestId:string;cancelReason?:string;sourceRecordId?:string}
export interface Visit {id:string;appointmentId:string;doctorId:string;queue:number;status:VisitStatus}
export interface RxLine {medicineId:string;name:string;unit:string;dose:string;times:number;days:number;quantity:number;instructions:string}
export interface MedicalRecord {id:string;visitId:string;symptoms:string;findings:string;diagnosis:string;treatment:string;followupDate:string;followupNotes:string;rx:RxLine[];publishedAt:string|null}
export interface Medicine {id:string;name:string;unit:string;description:string;active:boolean}
export interface Notification {id:string;userId:string;text:string;createdAt:string;read:boolean}
export interface State {users:User[];patients:Patient[];doctors:Doctor[];specialties:Specialty[];shifts:Shift[];appointments:Appointment[];visits:Visit[];records:MedicalRecord[];medicines:Medicine[];notifications:Notification[]}
export type SafeUser = Omit<User,"passwordHash"|"version">;
export interface AppData extends Omit<State,"users"> {users:SafeUser[];me:SafeUser;storage:"local"|"postgres";demo:boolean}
