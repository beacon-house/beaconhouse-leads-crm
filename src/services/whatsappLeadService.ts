// WhatsApp lead service for managing WhatsApp export operations
// Handles all data interactions for WhatsApp lead management functionality

import { supabase } from '../lib/supabase';
import { WhatsappLead, WhatsappStatus, WhatsappFilterTab, WhatsappLeadCounts } from '../types/whatsappLeads';

export class WhatsappLeadService {
  
  // Initialize WhatsApp leads for all qualified leads
  static async initializeWhatsappLeads(): Promise<void> {
    console.log('🔄 Initializing WhatsApp leads for qualified leads...');
    
    try {
      // Get all form sessions that don't have WhatsApp entries
      const { data: qualifiedLeads, error: selectError } = await supabase
        .from('form_sessions')
        .select(`
          session_id,
          lead_category,
          is_counselling_booked,
          funnel_stage
        `);

      if (selectError) {
        console.error('Error fetching form sessions:', selectError);
        throw selectError;
      }

      if (!qualifiedLeads || qualifiedLeads.length === 0) {
        console.log('No form sessions found');
        return;
      }

      // Get existing WhatsApp lead entries
      const { data: existingWhatsappLeads, error: whatsappError } = await supabase
        .from('whatsapp_leads')
        .select('session_id');

      if (whatsappError) {
        console.error('Error fetching existing WhatsApp leads:', whatsappError);
        throw whatsappError;
      }

      const existingSessionIds = new Set(
        existingWhatsappLeads?.map(lead => lead.session_id) || []
      );

      // Filter out leads that already have WhatsApp entries
      const newWhatsappLeads = qualifiedLeads
        .filter(lead => !existingSessionIds.has(lead.session_id))
        .map(lead => ({
          session_id: lead.session_id,
          whatsapp_status: 'not_exported' as const
        }));

      if (newWhatsappLeads.length === 0) {
        console.log('All form sessions already have WhatsApp entries');
        return;
      }

      // Insert new WhatsApp lead entries
      const { error: insertError } = await supabase
        .from('whatsapp_leads')
        .insert(newWhatsappLeads, { ignoreDuplicates: true });

      if (insertError) {
        // Handle duplicate key errors gracefully (these are expected when using ignoreDuplicates)
        if (insertError.code === '23505') {
          console.warn('⚠️ Duplicate key detected during WhatsApp leads initialization (this is expected and safely ignored):', insertError.message);
        } else {
          // For any other type of error, throw it as a critical error
          console.error('Critical error inserting WhatsApp leads:', insertError);
          throw insertError;
        }
      } else {
        console.log(`✅ Initialized ${newWhatsappLeads.length} new WhatsApp lead entries`);
      }
    } catch (error) {
      console.error('Error initializing WhatsApp leads:', error);
      throw error;
    }
  }

  // Get WhatsApp leads based on filter tab
  static async getWhatsappLeads(filter: WhatsappFilterTab = 'call_not_booked', selectedStages?: string[]): Promise<{ data: WhatsappLead[], counts: WhatsappLeadCounts }> {
    console.log(`📋 Fetching WhatsApp leads for filter: ${filter}`);
    
    // Base query with all necessary joins
    let query = supabase
      .from('form_sessions')
      .select(`
        *,
        crm_leads (
          id,
          lead_status,
          assigned_to,
          last_contacted,
          counselors (
            name,
            email
          )
        ),
        whatsapp_leads (
          id,
          whatsapp_status,
          export_date,
          last_message_date,
          exported_by,
          notes,
          created_at,
          updated_at,
          counselors (
            name,
            email
          )
        )
      `)
      .in('lead_category', ['bch', 'lum-l1', 'lum-l2'])
      .order('created_at', { ascending: false });

    // Apply filter-specific conditions
    switch (filter) {
      case 'call_not_booked':
        // Qualified leads who haven't booked counseling
        query = query.eq('is_counselling_booked', false);
        break;
        
      case 'call_booked_5_days':
      case 'call_booked_more_5_days':
        // Qualified leads who have booked counseling - will filter by date on frontend
        query = query.eq('is_counselling_booked', true);
        break;
        
      case 'filter_by_stage':
        // Early return if no stages selected
        if (!selectedStages || selectedStages.length === 0) {
          console.log('📋 No stages selected, returning empty results');
          const counts = await this.getWhatsappLeadCounts();
          return { data: [], counts };
        }

        // Build OR conditions for database-level filtering
        const orConditions: string[] = [];
        
        // Check for "Not in CRM" selection
        if (selectedStages.includes('not_in_crm')) {
          orConditions.push('crm_leads.id.is.null');
        }
        
        // Check for actual CRM lead statuses
        const crmLeadStatuses = selectedStages.filter(stage => stage !== 'not_in_crm');
        if (crmLeadStatuses.length > 0) {
          orConditions.push(`crm_leads.lead_status.in.(${crmLeadStatuses.map(s => `"${s}"`).join(',')})`);
        }

        if (orConditions.length === 0) {
          console.log('📋 No valid conditions, returning empty results');
          const counts = await this.getWhatsappLeadCounts();
          return { data: [], counts };
        }

        // Build query with proper database-level filtering
        query = supabase
          .from('form_sessions')
          .select(`
            *,
            crm_leads (
              id,
              lead_status,
              assigned_to,
              last_contacted,
              counselors (
                name,
                email
              )
            ),
            whatsapp_leads (
              id,
              whatsapp_status,
              export_date,
              last_message_date,
              exported_by,
              notes,
              created_at,
              updated_at,
              counselors (
                name,
                email
              )
            )
          `)
          .eq('whatsapp_leads.whatsapp_status', 'not_exported')
          .or(orConditions.join(','))
          .order('created_at', { ascending: false });
        
        console.log(`📋 Filter by stage query built with OR conditions: ${orConditions.join(' OR ')}`);
        break;
        
      case 'exported_leads':
        // Only show leads that have been exported
        // This will be filtered after the query based on whatsapp_status
        break;
    }

    const { data: rawData, error } = await query;

    if (error) {
      console.error('Error fetching WhatsApp leads:', error);
      throw error;
    }

    // Transform and filter data
    let whatsappLeads: WhatsappLead[] = (rawData || []).map((row: any) => ({
      // Form sessions data
      id: row.id,
      session_id: row.session_id,
      student_name: row.student_name,
      current_grade: row.current_grade,
      curriculum_type: row.curriculum_type,
      lead_category: row.lead_category,
      phone_number: row.phone_number,
      parent_email: row.parent_email,
      parent_name: row.parent_name,
      school_name: row.school_name,
      form_filler_type: row.form_filler_type,
      grade_format: row.grade_format,
      gpa_value: row.gpa_value,
      percentage_value: row.percentage_value,
      scholarship_requirement: row.scholarship_requirement,
      target_geographies: row.target_geographies,
      selected_date: row.selected_date,
      selected_slot: row.selected_slot,
      environment: row.environment,
      updated_at: row.updated_at,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      utm_term: row.utm_term,
      utm_content: row.utm_content,
      utm_id: row.utm_id,
      funnel_stage: row.funnel_stage,
      is_qualified_lead: row.is_qualified_lead,
      is_counselling_booked: row.is_counselling_booked,
      created_at: row.created_at,
      
      // CRM data
      crm_lead_id: row.crm_leads?.id || null,
      lead_status: row.crm_leads?.lead_status || '01_yet_to_contact',
      assigned_to: row.crm_leads?.assigned_to || null,
      last_contacted: row.crm_leads?.last_contacted || null,
      assigned_counselor_name: row.crm_leads?.counselors?.name || null,
      assigned_counselor_email: row.crm_leads?.counselors?.email || null,
      
      // WhatsApp data
      whatsapp_id: row.whatsapp_leads?.id || null,
      whatsapp_status: row.whatsapp_leads?.whatsapp_status || 'not_exported',
      export_date: row.whatsapp_leads?.export_date || null,
      last_message_date: row.whatsapp_leads?.last_message_date || null,
      exported_by: row.whatsapp_leads?.exported_by || null,
      exported_by_name: row.whatsapp_leads?.counselors?.name || null,
      exported_by_email: row.whatsapp_leads?.counselors?.email || null,
      whatsapp_notes: row.whatsapp_leads?.notes || null,
      whatsapp_created_at: row.whatsapp_leads?.created_at || null,
      whatsapp_updated_at: row.whatsapp_leads?.updated_at || null,
    }));

    // Apply client-side filtering for specific cases
    if (filter === 'call_booked_5_days' || filter === 'call_booked_more_5_days') {
      whatsappLeads = whatsappLeads.filter(lead => {
        if (!lead.selected_date || !lead.created_at || !lead.lead_category || !['bch', 'lum-l1', 'lum-l2'].includes(lead.lead_category)) return false;
        
        const selectedDate = new Date(lead.selected_date);
        const createdDate = new Date(lead.created_at);
        const daysDifference = Math.ceil((selectedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (filter === 'call_booked_5_days') {
          return daysDifference <= 5 && lead.whatsapp_status === 'not_exported';
        } else {
          return daysDifference > 5 && lead.whatsapp_status === 'not_exported';
        }
      });
    } else if (filter === 'exported_leads') {
      whatsappLeads = whatsappLeads.filter(lead => 
        lead.whatsapp_status === 'exported' || lead.whatsapp_status === 'message_sent'
      );
    } else if (filter === 'call_not_booked') {
      whatsappLeads = whatsappLeads.filter(lead => 
        lead.whatsapp_status === 'not_exported' && 
        lead.lead_category && 
        ['bch', 'lum-l1', 'lum-l2'].includes(lead.lead_category)
      );
    }

    // Get counts
    const counts = await this.getWhatsappLeadCounts();

    console.log(`📊 Fetched ${whatsappLeads.length} WhatsApp leads for ${filter}`);
    
    return { data: whatsappLeads, counts };
  }

  // Get lead counts for WhatsApp filter tabs
  static async getWhatsappLeadCounts(): Promise<WhatsappLeadCounts> {
    console.log('📊 Calculating WhatsApp lead counts...');
    
    try {
      // Get all qualified leads with WhatsApp data
      const { data: allLeads, error } = await supabase
        .from('form_sessions')
        .select(`
          session_id,
          is_counselling_booked,
          selected_date,
          created_at,
          whatsapp_leads (
            whatsapp_status
          )
        `)
        .in('lead_category', ['bch', 'lum-l1', 'lum-l2']);

      if (error) {
        console.error('Error fetching leads for count:', error);
        throw error;
      }

      let callNotBooked = 0;
      let callBooked5Days = 0;
      let callBookedMore5Days = 0;
      let exportedLeads = 0;

      (allLeads || []).forEach((lead: any) => {
        const whatsappStatus = lead.whatsapp_leads?.whatsapp_status || 'not_exported';
        
        if (whatsappStatus === 'exported' || whatsappStatus === 'message_sent') {
          exportedLeads++;
        } else if (whatsappStatus === 'not_exported') {
          if (!lead.is_counselling_booked) {
            callNotBooked++;
          } else if (lead.selected_date && lead.created_at) {
            const selectedDate = new Date(lead.selected_date);
            const createdDate = new Date(lead.created_at);
            const daysDifference = Math.ceil((selectedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDifference <= 5) {
              callBooked5Days++;
            } else {
              callBookedMore5Days++;
            }
          }
        }
      });

      // Get filter by stage counts
      const filterByStageCount = await this.getFilterByStageLeadCounts();
      const counts = {
        call_not_booked: callNotBooked,
        call_booked_5_days: callBooked5Days,
        call_booked_more_5_days: callBookedMore5Days,
        filter_by_stage_counts: filterByStageCount,
        exported_leads: exportedLeads,
      };

      console.log('📊 WhatsApp lead counts:', counts);
      return counts;
      
    } catch (error) {
      console.error('Error calculating WhatsApp lead counts:', error);
      throw error;
    }
  }

  // Get lead counts by CRM stage for filter by stage tab
  static async getFilterByStageLeadCounts(): Promise<Record<string, number>> {
    console.log('📊 Calculating filter by stage counts...');
    
    try {
      // Get all form sessions with CRM and WhatsApp data
      const { data: allLeads, error } = await supabase
        .from('form_sessions')
        .select(`
          session_id,
          crm_leads (
            id,
            lead_status
          ),
          whatsapp_leads (
            whatsapp_status
          )
        `);

      if (error) {
        console.error('Error fetching leads for stage counts:', error);
        throw error;
      }

      const stageCounts: Record<string, number> = {};
      let notInCrmCount = 0;

      (allLeads || []).forEach((lead: any) => {
        const whatsappStatus = lead.whatsapp_leads?.whatsapp_status || 'not_exported';
        
        // Only count leads that are not exported
        if (whatsappStatus === 'not_exported') {
          if (!lead.crm_leads?.id) {
            // Lead not in CRM
            notInCrmCount++;
          } else {
            // Lead in CRM with status
            const leadStatus = lead.crm_leads.lead_status;
            stageCounts[leadStatus] = (stageCounts[leadStatus] || 0) + 1;
          }
        }
      });

      // Add not_in_crm count
      if (notInCrmCount > 0) {
        stageCounts['not_in_crm'] = notInCrmCount;
      }

      console.log('📊 Filter by stage counts:', stageCounts);
      return stageCounts;
      
    } catch (error) {
      console.error('Error calculating filter by stage counts:', error);
      throw error;
    }
  }

  // Export selected leads
  static async exportSelectedLeads(sessionIds: string[], exportedBy: string): Promise<void> {
    console.log(`📤 Exporting ${sessionIds.length} leads...`);
    
    try {
      const { error } = await supabase
        .from('whatsapp_leads')
        .update({
          whatsapp_status: 'exported',
          export_date: new Date().toISOString(),
          exported_by: exportedBy,
        })
        .in('session_id', sessionIds);

      if (error) {
        console.error('Error exporting leads:', error);
        throw error;
      }

      console.log(`✅ Successfully exported ${sessionIds.length} leads`);
    } catch (error) {
      console.error('Error in exportSelectedLeads:', error);
      throw error;
    }
  }

  // Update WhatsApp lead status
  static async updateWhatsappLeadStatus(
    sessionId: string, 
    newStatus: WhatsappStatus, 
    notes?: string
  ): Promise<void> {
    console.log(`🔄 Updating WhatsApp lead status: ${sessionId} to ${newStatus}`);
    
    try {
      const updateData: any = {
        whatsapp_status: newStatus,
      };

      if (newStatus === 'message_sent') {
        updateData.last_message_date = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('whatsapp_leads')
        .update(updateData)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error updating WhatsApp lead status:', error);
        throw error;
      }

      console.log(`✅ Updated WhatsApp lead status: ${sessionId}`);
    } catch (error) {
      console.error('Error in updateWhatsappLeadStatus:', error);
      throw error;
    }
  }

  // Bulk update WhatsApp lead status
  static async bulkUpdateWhatsappLeadStatus(
    sessionIds: string[], 
    newStatus: WhatsappStatus, 
    notes?: string
  ): Promise<void> {
    console.log(`🔄 Bulk updating ${sessionIds.length} WhatsApp lead statuses to ${newStatus}`);
    
    try {
      const updateData: any = {
        whatsapp_status: newStatus,
      };

      if (newStatus === 'message_sent') {
        updateData.last_message_date = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('whatsapp_leads')
        .update(updateData)
        .in('session_id', sessionIds);

      if (error) {
        console.error('Error bulk updating WhatsApp lead statuses:', error);
        throw error;
      }

      console.log(`✅ Bulk updated ${sessionIds.length} WhatsApp lead statuses`);
    } catch (error) {
      console.error('Error in bulkUpdateWhatsappLeadStatus:', error);
      throw error;
    }
  }
}