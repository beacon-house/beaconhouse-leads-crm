// Lead management types for Beacon House CRM
// Updated to match actual database schema with proper table relationships

export interface Lead {
  // From form_sessions (READ-ONLY)
  id: string;
  session_id: string;
  student_name: string | null;
  current_grade: string | null;
  curriculum_type: string | null;
  lead_category: string | null;
  phone_number: string | null;
  parent_email: string | null;
  school_name: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  funnel_stage: string | null;
  is_qualified_lead: boolean | null;
  is_counselling_booked: boolean | null;
  created_at: string; // submission_date
  
  // From crm_leads (CRM workflow data - EDITABLE)
  crm_lead_id: string | null;
  lead_status: LeadStatus;
  assigned_to: string | null;
  last_contacted: string | null;
  
  // From counselors (joined data)
  assigned_counselor_name: string | null;
  assigned_counselor_email: string | null;
  
  // WhatsApp-related fields (from LEFT JOIN with whatsapp_leads)
  whatsapp_id: string | null;
  whatsapp_status: string | null;
  export_date: string | null;
  last_message_date: string | null;
  exported_by: string | null;
  exported_by_name: string | null;
  exported_by_email: string | null;
  whatsapp_notes: string | null;
  whatsapp_created_at: string | null;
  whatsapp_updated_at: string | null;
  
  // Additional form_sessions fields for grouped view
  form_filler_type: string | null;
  grade_format: string | null;
  gpa_value: string | null;
  percentage_value: string | null;
  scholarship_requirement: string | null;
  target_geographies: string[] | null;
  parent_name: string | null;
  selected_date: string | null;
  selected_slot: string | null;
  environment: string | null;
  updated_at: string | null;
  utm_term: string | null;
  utm_content: string | null;
  utm_id: string | null;
}

export type LeadStatus = 
  | '01_yet_to_contact'
  | '02_failed_to_contact'
  | '03_counselling_call_booked'
  | '04_counselling_call_rescheduled'
  | '05_counselling_call_no_show'
  | '06_counselling_call_done'
  | '07_followup_call_requested'
  | '08_interest_intent_received'
  | '09_converted_paid';

export type FilterTab = 'all' | 'form_completions' | 'qualified' | 'counseling_booked';
export type FilterTab = 'all' | 'form_completions' | 'qualified' | 'counseling_booked' | 'unassigned';

export type SortColumn = keyof Lead;
export type SortDirection = 'asc' | 'desc';

export interface TableSort {
  column: SortColumn;
  direction: SortDirection;
}

export interface Counselor {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'senior_counselor' | 'junior_counselor';
  is_active: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'status_change' | 'assignment_change' | 'comment' | 'form_submission' | 'lead_created';
  description: string;
  counselorName?: string;
  counselorEmail?: string;
  commentText?: string;
  oldValue?: string;
  newValue?: string;
  leadStatus: LeadStatus;
}

export interface LeadDetails extends Lead {
  timelineEvents: TimelineEvent[];
}