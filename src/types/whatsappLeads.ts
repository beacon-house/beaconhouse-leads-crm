// WhatsApp lead management types for Beacon House CRM
// Defines types for WhatsApp export functionality and lead tracking

import { Lead } from './leads';

export type WhatsappStatus = 
  | 'not_exported'
  | 'exported' 
  | 'message_sent';

export type WhatsappFilterTab = 
  | 'call_not_booked'
  | 'call_booked_5_days'
  | 'call_booked_more_5_days'
  | 'filter_by_stage'
  | 'exported_leads';

export interface WhatsappLead extends Lead {
  // WhatsApp-specific fields from whatsapp_leads table
  whatsapp_id: string | null;
  whatsapp_status: WhatsappStatus;
  export_date: string | null;
  last_message_date: string | null;
  exported_by: string | null;
  exported_by_name: string | null;
  exported_by_email: string | null;
  whatsapp_notes: string | null;
  whatsapp_created_at: string | null;
  whatsapp_updated_at: string | null;
}

export interface WhatsappLeadCounts {
  call_not_booked: number;
  call_booked_5_days: number;
  call_booked_more_5_days: number;
  filter_by_stage_counts: Record<string, number>;
  exported_leads: number;
}

export interface WhatsappExportData {
  session_id: string;
  student_name: string;
  phone_number: string;
  parent_name: string;
  parent_email: string;
  current_grade: string;
  curriculum_type: string;
  lead_category: string;
  selected_date?: string;
  selected_slot?: string;
  created_at: string;
}

export type LeadStageOption = {
  value: string;
  label: string;
  count: number;
};