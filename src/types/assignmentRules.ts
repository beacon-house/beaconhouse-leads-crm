// Assignment rules types for admin-configurable lead assignment
// Defines types for the assignment rules system

export interface AssignmentRule {
  id: string;
  rule_name: string;
  rule_priority: number;
  trigger_lead_category: string | null;
  trigger_lead_status: string | null;
  assigned_counselor_id: string;
  assigned_counselor_name?: string;
  assigned_counselor_email?: string;
  start_date: string; // ISO date string
  end_date: string | null; // ISO date string or null for perpetual
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRuleFormData {
  rule_name: string;
  rule_priority: number;
  trigger_lead_category: string | null;
  trigger_lead_status: string | null;
  assigned_counselor_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export type CreateAssignmentRule = Omit<AssignmentRule, 'id' | 'created_at' | 'updated_at' | 'assigned_counselor_name' | 'assigned_counselor_email'>;
export type UpdateAssignmentRule = Partial<CreateAssignmentRule> & { id: string };