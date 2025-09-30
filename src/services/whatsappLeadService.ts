// WhatsApp lead service for managing WhatsApp export operations
// Handles all data interactions for WhatsApp lead management functionality

import { supabase } from '../lib/supabase';
import { WhatsappLead, WhatsappStatus, WhatsappFilterTab, WhatsappLeadCounts } from '../types/whatsappLeads';

export class WhatsappLeadService {
  
  // Initialize WhatsApp leads for all qualified leads
  static async initializeWhatsappLeads(): Promise<void> {
    console.log('🔄 Initializing WhatsApp leads for qualified leads...');
    
    try {
      // Get all qualified leads that don't have WhatsApp entries
      const { data: qualifiedLeads, error: selectError } = await supabase
        .from('form_sessions')
        .select(`
          session_id,
          lead_category,
          is_counselling_booked,
          funnel_stage
        `)
        .in('lead_category', ['bch', 'lum-l1', 'lum-l2']);

      if (selectError) {
        console.error('Error fetching qualified leads:', selectError);
        throw selectError;
      }

      if (!qualifiedLeads || qualifiedLeads.length === 0) {
        console.log('No qualified leads found');
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
        console.log('All qualified leads already have WhatsApp entries');
        return;
      }

      // Insert new WhatsApp lead entries (idempotent by session_id)
      const { error: insertError } = await supabase
        .from('whatsapp_leads')
        .upsert(newWhatsappLeads, { onConflict: 'session_id' });

      if (insertError) {
        // Handle duplicate key errors gracefully (these are expected when using ignoreDuplicates)
        if (insertError.code === '23505') {
          console.warn('⚠️ Duplicate key detected during WhatsApp leads initialization (this is expected and safely ignored):', insertError.message);
        } else {
          // For any other type of error, throw it as a critical error
          console.error('Error inserting WhatsApp leads:', insertError);
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
          updated_at,
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
        // Stage-based filtering over ALL leads (not limited to qualified categories)
        // This view is for analysis and selective export eligibility will be enforced in UI
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
          .order('created_at', { ascending: false });
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
    let whatsappLeads: WhatsappLead[] = (rawData || []).map((row: any) => {
      // Normalize nested relations that can be arrays depending on PostgREST relationship inference
      let crm = Array.isArray(row.crm_leads) ? row.crm_leads : (row.crm_leads ? [row.crm_leads] : []);
      if (crm.length > 1) {
        crm = crm.sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
      }
      const crmLatest = crm[0];
      const wa = Array.isArray(row.whatsapp_leads) ? row.whatsapp_leads[0] : row.whatsapp_leads;

      return ({
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
      crm_lead_id: crmLatest?.id || null,
      lead_status: crmLatest?.lead_status || '01_yet_to_contact',
      assigned_to: crmLatest?.assigned_to || null,
      last_contacted: crmLatest?.last_contacted || null,
      assigned_counselor_name: crmLatest?.counselors?.name || null,
      assigned_counselor_email: crmLatest?.counselors?.email || null,
      
      // WhatsApp data
      whatsapp_id: wa?.id || null,
      whatsapp_status: wa?.whatsapp_status || 'not_exported',
      export_date: wa?.export_date || null,
      last_message_date: wa?.last_message_date || null,
      exported_by: wa?.exported_by || null,
      exported_by_name: wa?.counselors?.name || null,
      exported_by_email: wa?.counselors?.email || null,
      whatsapp_notes: wa?.notes || null,
      whatsapp_created_at: wa?.created_at || null,
      whatsapp_updated_at: wa?.updated_at || null,
    })});

    // Apply client-side filtering for specific cases
    if (filter === 'call_booked_5_days' || filter === 'call_booked_more_5_days') {
      whatsappLeads = whatsappLeads.filter(lead => {
        if (!lead.selected_date || !lead.created_at) return false;
        
        const selectedDate = new Date(lead.selected_date);
        const createdDate = new Date(lead.created_at);
        const daysDifference = Math.ceil((selectedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (filter === 'call_booked_5_days') {
          return daysDifference <= 5 && lead.whatsapp_status === 'not_exported';
        } else {
          return daysDifference > 5 && lead.whatsapp_status === 'not_exported';
        }
      });
    } else if (filter === 'filter_by_stage') {
      // Filter by selected stages if provided; otherwise return ALL leads
      if (selectedStages && selectedStages.length > 0) {
        whatsappLeads = whatsappLeads.filter(lead => {
          const matchesNotInCrm = selectedStages.includes('not_in_crm') && !lead.crm_lead_id;
          const matchesStage = selectedStages.includes(lead.lead_status);
          return matchesNotInCrm || matchesStage;
        });
      }
    } else if (filter === 'exported_leads') {
      whatsappLeads = whatsappLeads.filter(lead => 
        lead.whatsapp_status === 'exported' || lead.whatsapp_status === 'message_sent'
      );
    } else if (filter === 'call_not_booked') {
      whatsappLeads = whatsappLeads.filter(lead => lead.whatsapp_status === 'not_exported');
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
      // Get qualified leads with CRM and WhatsApp data
      const { data: allLeads, error } = await supabase
        .from('form_sessions')
        .select(`
          session_id,
          lead_category,
          created_at,
          crm_leads (
            id,
            lead_status
          ),
          whatsapp_leads (
            whatsapp_status
          )
        `)
        // IMPORTANT: Keep ordering consistent with the main Tab 4 query so
        // the per-stage counts match the leads displayed in the table.
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads for stage counts:', error);
        throw error;
      }

      const stageCounts: Record<string, number> = {};
      let notInCrmCount = 0;

      (allLeads || []).forEach((lead: any) => {
        // Normalize nested relation which can be an array
        const crm = Array.isArray(lead.crm_leads) ? lead.crm_leads[0] : lead.crm_leads;
        // Count ALL leads regardless of whatsapp/export status
        if (!crm?.id) {
          notInCrmCount++;
        } else {
          const leadStatus = crm.lead_status;
          stageCounts[leadStatus] = (stageCounts[leadStatus] || 0) + 1;
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
      // First, validate that all selected leads are eligible for export
      const { data: existingLeads, error: validationError } = await supabase
        .from('whatsapp_leads')
        .select('session_id, whatsapp_status')
        .in('session_id', sessionIds);

      if (validationError) {
        console.error('Error validating leads for export:', validationError);
        throw validationError;
      }

      // Check if any leads are already exported or have invalid status
      const invalidLeads = existingLeads?.filter(lead => lead.whatsapp_status !== 'not_exported') || [];
      if (invalidLeads.length > 0) {
        const invalidSessionIds = invalidLeads.map(lead => lead.session_id);
        throw new Error(`Cannot export leads that are already exported or have invalid status: ${invalidSessionIds.join(', ')}`);
      }

      // Check if any session IDs don't have WhatsApp lead records
      const existingSessionIds = existingLeads?.map(lead => lead.session_id) || [];
      const missingSessionIds = sessionIds.filter(id => !existingSessionIds.includes(id));
      if (missingSessionIds.length > 0) {
        throw new Error(`Cannot export leads that don't have WhatsApp records: ${missingSessionIds.join(', ')}`);
      }

      // Proceed with export
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
    notes?: string,
    _updatedBy?: string
  ): Promise<void> {
    console.log(`🔄 Updating WhatsApp lead status: ${sessionId} to ${newStatus}`);
    
    try {
      // Get current status for audit trail
      const { data: currentLead, error: fetchError } = await supabase
        .from('whatsapp_leads')
        .select('whatsapp_status, notes')
        .eq('session_id', sessionId)
        .single();

      if (fetchError) {
        console.error('Error fetching current lead status:', fetchError);
        throw fetchError;
      }

      const updateData: any = {
        whatsapp_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'message_sent') {
        updateData.last_message_date = new Date().toISOString();
      }

      // Enhanced notes with audit trail
      const auditNote = `Status changed from '${currentLead?.whatsapp_status}' to '${newStatus}' on ${new Date().toISOString()}`;
      const combinedNotes = [
        currentLead?.notes,
        notes,
        auditNote
      ].filter(Boolean).join(' | ');

      updateData.notes = combinedNotes;

      const { error } = await supabase
        .from('whatsapp_leads')
        .update(updateData)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error updating WhatsApp lead status:', error);
        throw error;
      }

      console.log(`✅ Updated WhatsApp lead status: ${sessionId} (${currentLead?.whatsapp_status} → ${newStatus})`);
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
      // Validate that all leads exist and have appropriate status for the update
      const { data: existingLeads, error: validationError } = await supabase
        .from('whatsapp_leads')
        .select('session_id, whatsapp_status')
        .in('session_id', sessionIds);

      if (validationError) {
        console.error('Error validating leads for status update:', validationError);
        throw validationError;
      }

      // Check if any session IDs don't have WhatsApp lead records
      const existingSessionIds = existingLeads?.map(lead => lead.session_id) || [];
      const missingSessionIds = sessionIds.filter(id => !existingSessionIds.includes(id));
      if (missingSessionIds.length > 0) {
        throw new Error(`Cannot update leads that don't have WhatsApp records: ${missingSessionIds.join(', ')}`);
      }

      // Validate status transitions
      if (newStatus === 'message_sent') {
        // Can only mark as 'message_sent' if currently 'exported'
        const invalidLeads = existingLeads?.filter(lead => lead.whatsapp_status !== 'exported') || [];
        if (invalidLeads.length > 0) {
          const invalidSessionIds = invalidLeads.map(lead => lead.session_id);
          throw new Error(`Can only mark 'exported' leads as 'message_sent'. Invalid leads: ${invalidSessionIds.join(', ')}`);
        }
      }

      const updateData: any = {
        whatsapp_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'message_sent') {
        updateData.last_message_date = new Date().toISOString();
      }

      // Enhanced notes with audit trail for bulk updates
      const auditNote = `Bulk status update to '${newStatus}' on ${new Date().toISOString()} (${sessionIds.length} leads)`;
      const combinedNotes = notes ? `${notes} | ${auditNote}` : auditNote;
      updateData.notes = combinedNotes;

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