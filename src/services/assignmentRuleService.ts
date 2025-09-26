// Assignment rule service for managing admin-configurable lead assignment rules
// Handles all data interactions for assignment rules functionality

import { supabase } from '../lib/supabase';
import { AssignmentRule, CreateAssignmentRule, UpdateAssignmentRule } from '../types/assignmentRules';

export class AssignmentRuleService {
  
  // Get all assignment rules with counselor information
  static async getAllAssignmentRules(): Promise<AssignmentRule[]> {
    console.log('📋 Fetching all assignment rules...');
    
    try {
      const { data, error } = await supabase
        .from('assignment_rules')
        .select(`
          *,
          counselors (
            name,
            email
          )
        `)
        .order('rule_priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignment rules:', error);
        throw error;
      }

      const rules: AssignmentRule[] = (data || []).map((row: any) => ({
        id: row.id,
        rule_name: row.rule_name,
        rule_priority: row.rule_priority,
        trigger_lead_category: row.trigger_lead_category,
        trigger_lead_status: row.trigger_lead_status,
        assigned_counselor_id: row.assigned_counselor_id,
        assigned_counselor_name: row.counselors?.name || null,
        assigned_counselor_email: row.counselors?.email || null,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      console.log(`📊 Fetched ${rules.length} assignment rules`);
      return rules;
    } catch (error) {
      console.error('Error in getAllAssignmentRules:', error);
      throw error;
    }
  }

  // Get currently active assignment rules (within date range and is_active = true)
  static async getActiveAssignmentRules(): Promise<AssignmentRule[]> {
    console.log('📋 Fetching active assignment rules...');
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data, error } = await supabase
        .from('assignment_rules')
        .select(`
          *,
          counselors (
            name,
            email
          )
        `)
        .eq('is_active', true)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('rule_priority', { ascending: true });

      if (error) {
        console.error('Error fetching active assignment rules:', error);
        throw error;
      }

      const rules: AssignmentRule[] = (data || []).map((row: any) => ({
        id: row.id,
        rule_name: row.rule_name,
        rule_priority: row.rule_priority,
        trigger_lead_category: row.trigger_lead_category,
        trigger_lead_status: row.trigger_lead_status,
        assigned_counselor_id: row.assigned_counselor_id,
        assigned_counselor_name: row.counselors?.name || null,
        assigned_counselor_email: row.counselors?.email || null,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      console.log(`📊 Fetched ${rules.length} active assignment rules`);
      return rules;
    } catch (error) {
      console.error('Error in getActiveAssignmentRules:', error);
      throw error;
    }
  }

  // Find the best matching rule for a lead
  static async findMatchingRule(leadCategory: string | null, leadStatus: string): Promise<AssignmentRule | null> {
    console.log(`🔍 Finding matching rule for category: ${leadCategory}, status: ${leadStatus}`);
    
    try {
      const activeRules = await this.getActiveAssignmentRules();
      
      // Find the first matching rule (already ordered by priority)
      for (const rule of activeRules) {
        const categoryMatches = !rule.trigger_lead_category || rule.trigger_lead_category === leadCategory;
        const statusMatches = !rule.trigger_lead_status || rule.trigger_lead_status === leadStatus;
        
        if (categoryMatches && statusMatches) {
          console.log(`✅ Found matching rule: ${rule.rule_name} (priority: ${rule.rule_priority})`);
          return rule;
        }
      }
      
      console.log('❌ No matching rule found');
      return null;
    } catch (error) {
      console.error('Error in findMatchingRule:', error);
      throw error;
    }
  }

  // Create a new assignment rule
  static async createAssignmentRule(ruleData: CreateAssignmentRule): Promise<AssignmentRule> {
    console.log('📝 Creating new assignment rule:', ruleData.rule_name);
    
    try {
      const { data, error } = await supabase
        .from('assignment_rules')
        .insert(ruleData)
        .select(`
          *,
          counselors (
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error creating assignment rule:', error);
        throw error;
      }

      const rule: AssignmentRule = {
        id: data.id,
        rule_name: data.rule_name,
        rule_priority: data.rule_priority,
        trigger_lead_category: data.trigger_lead_category,
        trigger_lead_status: data.trigger_lead_status,
        assigned_counselor_id: data.assigned_counselor_id,
        assigned_counselor_name: data.counselors?.name || null,
        assigned_counselor_email: data.counselors?.email || null,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      console.log(`✅ Created assignment rule: ${rule.rule_name}`);
      return rule;
    } catch (error) {
      console.error('Error in createAssignmentRule:', error);
      throw error;
    }
  }

  // Update an existing assignment rule
  static async updateAssignmentRule(ruleData: UpdateAssignmentRule): Promise<AssignmentRule> {
    console.log(`📝 Updating assignment rule: ${ruleData.id}`);
    
    try {
      const { data, error } = await supabase
        .from('assignment_rules')
        .update(ruleData)
        .eq('id', ruleData.id)
        .select(`
          *,
          counselors (
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error updating assignment rule:', error);
        throw error;
      }

      const rule: AssignmentRule = {
        id: data.id,
        rule_name: data.rule_name,
        rule_priority: data.rule_priority,
        trigger_lead_category: data.trigger_lead_category,
        trigger_lead_status: data.trigger_lead_status,
        assigned_counselor_id: data.assigned_counselor_id,
        assigned_counselor_name: data.counselors?.name || null,
        assigned_counselor_email: data.counselors?.email || null,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      console.log(`✅ Updated assignment rule: ${rule.rule_name}`);
      return rule;
    } catch (error) {
      console.error('Error in updateAssignmentRule:', error);
      throw error;
    }
  }

  // Delete an assignment rule
  static async deleteAssignmentRule(ruleId: string): Promise<void> {
    console.log(`🗑️ Deleting assignment rule: ${ruleId}`);
    
    try {
      const { error } = await supabase
        .from('assignment_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        console.error('Error deleting assignment rule:', error);
        throw error;
      }

      console.log(`✅ Deleted assignment rule: ${ruleId}`);
    } catch (error) {
      console.error('Error in deleteAssignmentRule:', error);
      throw error;
    }
  }

  // Toggle rule active status
  static async toggleRuleStatus(ruleId: string, isActive: boolean): Promise<AssignmentRule> {
    console.log(`🔄 Toggling rule status: ${ruleId} to ${isActive ? 'active' : 'inactive'}`);
    
    try {
      return await this.updateAssignmentRule({ id: ruleId, is_active: isActive });
    } catch (error) {
      console.error('Error in toggleRuleStatus:', error);
      throw error;
    }
  }
}