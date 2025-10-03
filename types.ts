export enum Role {
  Reception = 'receptionist',
  Doctor = 'doctor',
  Manager = 'manager',
}

export enum VisitStatus {
  Waiting = 'في الانتظار',
  InProgress = 'قيد المعالجة',
  Completed = 'مكتمل',
  Canceled = 'ملغاة',
}

export enum VisitType {
  FirstVisit = 'كشف جديد',
  FollowUp = 'متابعة',
}

export interface Patient {
  patient_id: number;
  name: string;
  dob: string;
  gender: 'ذكر' | 'أنثى';
  phone: string;
  address: string;
}

export interface Visit {
  visit_id: number;
  patient_id: number;
  clinic_id: number;
  visit_date: string; // YYYY-MM-DD
  queue_number: number;
  status: VisitStatus;
  visit_type: VisitType;
}

export interface Diagnosis {
  diagnosis_id: number;
  visit_id: number;
  doctor: string;
  diagnosis: string;
  prescription: string;
  labs_needed: string[];
  notes: string;
}

export interface User {
  user_id: number;
  username: string;
  password?: string; // Should not be exposed in most contexts
  role: Role;
  clinic?: number; // clinic_id, for doctors
}

export interface Clinic {
  clinic_id: number;
  clinic_name: string;
  doctor_assigned: string;
  max_patients_per_day: number;
  price_first_visit: number;
  price_followup: number;
  notes: string;
}

export interface Revenue {
  revenue_id: number;
  visit_id: number;
  patient_id: number;
  patient_name: string;
  clinic_id: number;
  amount: number;
  date: string; // YYYY-MM-DD
  type: VisitType;
  notes: string;
}

export type View = 'dashboard' | 'patients' | 'visits' | 'diagnosis' | 'users' | 'clinics' | 'reports' | 'queue' | 'manual-revenue' | 'revenues';