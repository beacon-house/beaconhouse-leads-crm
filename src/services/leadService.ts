// Lead data service for fetching from form_sessions + crm_leads + counselors
// Implements golden rule: form_sessions is read-only, only crm_leads can be modified

import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, FilterTab, LeadDetails, TimelineEvent, GetLeadsResult, PaginationMetadata } from '../types/leads';
import { AssignmentRuleService } from './assignmentRuleService';
import { getLeadStatusLabel } from '../utils/leadUtils';

export class LeadService {
  // Main query to get leads with pagination - show ALL form_sessions with optional CRM data
  static async getLeads(filter: FilterTab = 'all', page: number = 1, pageSize: number = 50): Promise<GetLeadsResult> {
    console.log(`📋 Fetching leads: filter=${filter}, page=${page}, pageSize=${pageSize}`);
    
    // Build base query function to ensure identical filtering for both count and data queries
    const buildBaseQuery = () => supabase
      .from('form_sessions')
      .select('*'); // Simple select for filtering

    // Function to apply filters to any query
    const applyFilters = (query: any) => {
      switch (filter) {
        case 'form_completions':
          return query.in('funnel_stage', ['10_form_submit', 'form_complete_legacy_26_aug']);
        case 'qualified':
          return query
            .in('lead_category', ['bch', 'lum-l1', 'lum-l2'])
            .not('funnel_stage', 'in', '("10_form_submit","form_complete_legacy_26_aug")');
        case 'counseling_booked':
          return query
            .eq('is_counselling_booked', true)
            .in('funnel_stage', ['10_form_submit', 'form_complete_legacy_26_aug']);
        case 'unassigned':
          // Fixed: Correctly catches both types of unassigned leads:
          // 1. Leads with no crm_leads record (crm_leads.id.is.null)  
          // 2. Leads with crm_leads record but assigned_to is null
          return query.or('crm_leads.id.is.null,crm_leads.assigned_to.is.null');
        default:
          return query;
      }
    };

    // Execute count query - using correct Supabase count API
    const countQuery = applyFilters(buildBaseQuery());
    const { count: totalCount, error: countError } = await countQuery
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error fetching total count:', countError);
      throw countError;
    }

    console.log(`📊 Total count for ${filter}: ${totalCount}`);

    // Execute data query with full joins, ordering and pagination
    const dataQuery = applyFilters(supabase
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
        )
      `));
      
    const { data: rawData, error: dataError } = await dataQuery
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (dataError) {
      console.error('Error fetching leads data:', dataError);
      throw dataError;
    }

    console.log(`📋 Fetched ${rawData?.length || 0} leads for page ${page}`);

    // Transform data to match our Lead interface
    const leads: Lead[] = (rawData || []).map((row: any) => ({
      // From form_sessions (read-only)
      id: row.id,
      session_id: row.session_id,
      student_name: row.student_name,
      current_grade: row.current_grade,
      curriculum_type: row.curriculum_type,
      lead_category: row.lead_category,
      phone_number: row.phone_number,
      parent_email: row.parent_email,
      school_name: row.school_name,
      form_filler_type: row.form_filler_type,
      grade_format: row.grade_format,
      gpa_value: row.gpa_value,
      percentage_value: row.percentage_value,
      scholarship_requirement: row.scholarship_requirement,
      target_geographies: row.target_geographies,
      parent_name: row.parent_name,
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
      
      // From crm_leads (editable) - may be null if not in CRM yet
      crm_lead_id: row.crm_leads?.id || null,
      lead_status: row.crm_leads?.lead_status || '01_yet_to_contact',
      assigned_to: row.crm_leads?.assigned_to || null,
      last_contacted: row.crm_leads?.last_contacted || null,
      
      // From counselors (joined) - may be null if not assigned
      assigned_counselor_name: row.crm_leads?.counselors?.name || null,
      assigned_counselor_email: row.crm_leads?.counselors?.email || null,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil((totalCount || 0) / pageSize);
    const pagination: PaginationMetadata = {
      totalCount: totalCount || 0,
      currentPage: page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    // Get tab counts (existing functionality)
    const tabCounts = await this.getLeadCounts();

    console.log(`📊 Pagination: page ${page}/${totalPages}, total: ${totalCount}`);

    return { data: leads, pagination, tabCounts };
  }

  // Update lead status in crm_leads table (never touches form_sessions)
  static async updateLeadStatus(sessionId: string, newStatus: LeadStatus, counselorId: string, comment: string): Promise<void> {
    console.log(`Updating lead status for session ${sessionId} to ${newStatus}`);

    // Check if comment indicates a contact interaction that should update last_contacted
    const contactKeywords = ['called', 'contacted', 'spoke', 'talked', 'reached', 'connected', 'phoned', 'emailed'];
    const isContactInteraction = contactKeywords.some(keyword => 
      comment.toLowerCase().includes(keyword)
    );

    // Also update last_contacted for these specific statuses
    const contactStatuses = [
      '02_failed_to_contact',
      '03_counselling_call_booked', 
      '04_counselling_call_rescheduled',
      '06_counselling_call_done',
      '07_followup_call_requested'
    ];
    const shouldUpdateLastContacted = isContactInteraction || contactStatuses.includes(newStatus);

    // Get lead category from form_sessions for auto-assignment
    const { data: formSession } = await supabase
      .from('form_sessions')
      .select('lead_category')
      .eq('session_id', sessionId)
      .single();

    const leadCategory = formSession?.lead_category || null;

    // First, check if lead exists in crm_leads
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    // Find matching assignment rule for auto-assignment
    let autoAssignedCounselor: string | null = null;
    let autoAssignmentRuleName: string | null = null;
    
    try {
      const matchingRule = await AssignmentRuleService.findMatchingRule(leadCategory, newStatus);
      if (matchingRule) {
        autoAssignedCounselor = matchingRule.assigned_counselor_id;
        autoAssignmentRuleName = matchingRule.rule_name;
        console.log(`🎯 Auto-assignment rule matched: ${autoAssignmentRuleName} → ${matchingRule.assigned_counselor_name}`);
      }
    } catch (error) {
      console.error('Error finding assignment rule:', error);
      // Continue without auto-assignment if rule lookup fails
    }

    if (!existingLead) {
      console.log('Creating new CRM lead entry');
      // Create new crm_lead if it doesn't exist
      const insertData: any = {
        session_id: sessionId,
        lead_status: newStatus,
        last_contacted: shouldUpdateLastContacted ? new Date().toISOString() : null,
      };
      
      // Apply auto-assignment if rule found and no manual assignment
      if (autoAssignedCounselor) {
        insertData.assigned_to = autoAssignedCounselor;
      }
      
      const { error: insertError } = await supabase
        .from('crm_leads')
        .insert(insertData);

      if (insertError) {
        console.error('Error creating crm_lead:', insertError);
        throw insertError;
      }
    } else {
      console.log('Updating existing CRM lead entry');
      // Update existing crm_lead
      const updateData: any = {
        lead_status: newStatus,
      };
      
      if (shouldUpdateLastContacted) {
        updateData.last_contacted = new Date().toISOString();
      }
      
      // Apply auto-assignment if rule found and lead is currently unassigned
      const { data: currentLead } = await supabase
        .from('crm_leads')
        .select('assigned_to')
        .eq('session_id', sessionId)
        .single();
        
      if (autoAssignedCounselor && !currentLead?.assigned_to) {
        updateData.assigned_to = autoAssignedCounselor;
      }
      
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating lead status:', updateError);
        throw updateError;
      }
    }

    // Add auto-assignment comment if assignment was made
    if (autoAssignedCounselor && autoAssignmentRuleName) {
      const { error: autoCommentError } = await supabase
        .from('crm_comments')
        .insert({
          session_id: sessionId,
          counselor_id: counselorId,
          comment_text: `Auto-assigned by rule: ${autoAssignmentRuleName}`,
          lead_status_at_comment: newStatus,
        });

      if (autoCommentError) {
        console.error('Error adding auto-assignment comment:', autoCommentError);
        // Don't throw here as main operation succeeded
      }
    }

    // Add comment to crm_comments
    const { error: commentError } = await supabase
      .from('crm_comments')
      .insert({
        session_id: sessionId,
        counselor_id: counselorId, // Now comes from authenticated user
        comment_text: comment,
        lead_status_at_comment: newStatus,
      });

    if (commentError) {
      console.error('Error adding comment:', commentError);
      throw commentError;
    }
  }

  // Assign lead to counselor
  static async assignLead(sessionId: string, counselorId: string | null, comment: string): Promise<void> {
    console.log(`🔄 ASSIGNMENT START: session=${sessionId}, counselor=${counselorId}, comment="${comment}"`);

    // Get current user for comment logging
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Must be authenticated to assign leads');
    }

    // Check if lead exists in crm_leads
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    console.log(`🔍 Existing CRM lead check:`, existingLead);
    if (!existingLead) {
      console.log('📝 Creating new CRM lead entry for assignment');
      // Create new crm_lead if it doesn't exist
      const { error: insertError } = await supabase
        .from('crm_leads')
        .insert({
          session_id: sessionId,
          assigned_to: counselorId,
        });

      if (insertError) {
        console.error('Error creating crm_lead for assignment:', insertError);
        throw insertError;
      } else {
        console.log('✅ Successfully created new crm_lead entry with assigned_to:', counselorId);
      }
    } else {
      console.log('📝 Updating existing CRM lead assignment');
      // Update existing crm_lead
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({
          assigned_to: counselorId,
        })
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating lead assignment:', updateError);
        throw updateError;
      } else {
        console.log('✅ Successfully updated crm_lead assignment with assigned_to:', counselorId);
      }
    }

    // Add comment about the assignment change
    const { data: currentLead } = await supabase
      .from('crm_leads')
      .select('lead_status')
      .eq('session_id', sessionId)
      .maybeSingle();

    console.log('💬 Adding assignment comment for lead status:', currentLead?.lead_status);
    const { error: commentError } = await supabase
      .from('crm_comments')
      .insert({
        session_id: sessionId,
        counselor_id: user.id,
        comment_text: comment,
        lead_status_at_comment: currentLead?.lead_status || '01_yet_to_contact',
      });

    if (commentError) {
      console.error('Error adding assignment comment:', commentError);
      // Don't throw here as assignment was successful, just comment failed
      console.log('Assignment successful, but comment logging failed');
    } else {
      console.log('✅ Successfully added assignment comment');
    }
    
    console.log(`✅ ASSIGNMENT COMPLETE: session=${sessionId} assigned to counselor=${counselorId}`);
    
    // Verify assignment by checking database
    const { data: verifyLead } = await supabase
      .from('crm_leads')
      .select('assigned_to')
      .eq('session_id', sessionId)
      .single();
    
    console.log(`🔍 VERIFICATION: assigned_to value in database:`, verifyLead?.assigned_to);
  }

  // Get lead counts for filter tabs
  static async getLeadCounts() {
    console.log('📊 CALCULATING LEAD COUNTS...');
    
    try {
      const queries = await Promise.all([
        // All leads in form_sessions
        supabase.from('form_sessions').select('id', { count: 'exact' }),
        
        // Form completions
        supabase.from('form_sessions')
          .select('id', { count: 'exact' })
          .in('funnel_stage', ['10_form_submit', 'form_complete_legacy_26_aug']),
        
        // Qualified leads
        supabase.from('form_sessions')
          .select('id', { count: 'exact' })
          .in('lead_category', ['bch', 'lum-l1', 'lum-l2'])
          .not('funnel_stage', 'in', '("10_form_submit","form_complete_legacy_26_aug")'),
        
        // Counseling booked
        supabase.from('form_sessions')
          .select('id', { count: 'exact' })
          .eq('is_counselling_booked', true)
          .in('funnel_stage', ['10_form_submit', 'form_complete_legacy_26_aug']),
      ]);
      
      // Calculate unassigned leads separately using a different approach
      const { count: totalLeads } = await supabase
        .from('form_sessions')
        .select('id', { count: 'exact' });
        
      const { count: assignedLeads } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact' })
        .not('assigned_to', 'is', null);

      const unassignedCount = (totalLeads || 0) - (assignedLeads || 0);

      const counts = {
        all: queries[0].count || 0,
        form_completions: queries[1].count || 0,
        qualified: queries[2].count || 0,
        counseling_booked: queries[3].count || 0,
        unassigned: unassignedCount,
      };
      
      console.log('📊 CALCULATED COUNTS:', counts);
      console.log(`📊 UNASSIGNED CALCULATION: ${totalLeads} total - ${assignedLeads} assigned = ${unassignedCount} unassigned`);
      
      return counts;
    } catch (error) {
      console.error('❌ ERROR in getLeadCounts:', error);
      throw error;
    }
  }

  // Get counselors for assignment dropdown
  static async getCounselors() {
    const { data, error } = await supabase
      .from('counselors')
      .select('id, name, email, role')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching counselors:', error);
      throw error;
    }

    return data || [];
  }

  // Get detailed lead information including timeline events
  static async getLeadDetails(sessionId: string): Promise<LeadDetails> {
    console.log(`📋 FETCHING LEAD DETAILS for session: ${sessionId}`);

    // Fetch main lead data with all joins
    const { data: leadData, error: leadError } = await supabase
      .from('form_sessions')
      .select(`
        *,
        crm_leads (
          id,
          lead_status,
          assigned_to,
          last_contacted,
          created_at,
          counselors (
            name,
            email
          )
        )
      `)
      .eq('session_id', sessionId)
      .single();

    if (leadError || !leadData) {
      console.error('Error fetching lead details:', leadError);
      throw leadError || new Error('Lead not found');
    }

    // Fetch all comments for this lead with counselor info
    const { data: commentsData, error: commentsError } = await supabase
      .from('crm_comments')
      .select(`
        *,
        counselors (
          name,
          email
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw commentsError;
    }

    // Transform lead data to match Lead interface
    const lead: Lead = {
      // From form_sessions
      id: leadData.id,
      session_id: leadData.session_id,
      student_name: leadData.student_name,
      current_grade: leadData.current_grade,
      curriculum_type: leadData.curriculum_type,
      lead_category: leadData.lead_category,
      phone_number: leadData.phone_number,
      parent_email: leadData.parent_email,
      school_name: leadData.school_name,
      form_filler_type: leadData.form_filler_type,
      grade_format: leadData.grade_format,
      gpa_value: leadData.gpa_value,
      percentage_value: leadData.percentage_value,
      scholarship_requirement: leadData.scholarship_requirement,
      target_geographies: leadData.target_geographies,
      parent_name: leadData.parent_name,
      selected_date: leadData.selected_date,
      selected_slot: leadData.selected_slot,
      environment: leadData.environment,
      updated_at: leadData.updated_at,
      utm_source: leadData.utm_source,
      utm_medium: leadData.utm_medium,
      utm_campaign: leadData.utm_campaign,
      utm_term: leadData.utm_term,
      utm_content: leadData.utm_content,
      utm_id: leadData.utm_id,
      funnel_stage: leadData.funnel_stage,
      is_qualified_lead: leadData.is_qualified_lead,
      is_counselling_booked: leadData.is_counselling_booked,
      created_at: leadData.created_at,
      
      // From crm_leads
      crm_lead_id: leadData.crm_leads?.id || null,
      lead_status: leadData.crm_leads?.lead_status || '01_yet_to_contact',
      assigned_to: leadData.crm_leads?.assigned_to || null,
      last_contacted: leadData.crm_leads?.last_contacted || null,
      
      // From counselors
      assigned_counselor_name: leadData.crm_leads?.counselors?.name || null,
      assigned_counselor_email: leadData.crm_leads?.counselors?.email || null,
    };

    // Build timeline events
    const timelineEvents: TimelineEvent[] = [];

    // Add form submission event (always first)
    timelineEvents.push({
      id: `form_submission_${leadData.id}`,
      timestamp: leadData.created_at,
      type: 'form_submission',
      description: 'Form submitted',
      leadStatus: '01_yet_to_contact',
    });

    // Add CRM lead creation event if exists
    if (leadData.crm_leads?.created_at) {
      timelineEvents.push({
        id: `lead_created_${leadData.crm_leads.id}`,
        timestamp: leadData.crm_leads.created_at,
        type: 'lead_created',
        description: 'Added to CRM system',
        leadStatus: leadData.crm_leads.lead_status,
      });
    }

    // Add comment events
    if (commentsData && commentsData.length > 0) {
      commentsData.forEach((comment: any) => {
        const isStatusChange = comment.comment_text.toLowerCase().includes('status') || 
                              comment.comment_text.toLowerCase().includes('updated to');
        const isAssignmentChange = comment.comment_text.toLowerCase().includes('assigned') || 
                                  comment.comment_text.toLowerCase().includes('reassigned');

        let eventType: TimelineEvent['type'] = 'comment';
        let description = `Comment at status: ${getLeadStatusLabel(comment.lead_status_at_comment)}`;

        if (isStatusChange) {
          eventType = 'status_change';
          description = `Status updated to ${comment.lead_status_at_comment.replace(/_/g, ' ').replace(/^\d+\s/, '')}`;
        } else if (isAssignmentChange) {
          eventType = 'assignment_change';
          description = 'Lead assignment changed';
        }

        timelineEvents.push({
          id: comment.id,
          timestamp: comment.created_at,
          type: eventType,
          description,
          counselorName: comment.counselors?.name,
          counselorEmail: comment.counselors?.email,
          commentText: comment.comment_text,
          leadStatus: comment.lead_status_at_comment,
        });
      });
    }

    // Sort timeline events by timestamp
    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`📋 LEAD DETAILS FETCHED: ${timelineEvents.length} timeline events`);

    return {
      ...lead,
      timelineEvents,
    };
  }

  // Add a general comment to a lead
  static async addLeadComment(sessionId: string, counselorId: string, commentText: string, currentLeadStatus: LeadStatus): Promise<void> {
    console.log(`💬 ADDING COMMENT to lead ${sessionId}: "${commentText}"`);

    const { error } = await supabase
      .from('crm_comments')
      .insert({
        session_id: sessionId,
        counselor_id: counselorId,
        comment_text: commentText,
        lead_status_at_comment: currentLeadStatus,
      });

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    console.log(`✅ COMMENT ADDED successfully to lead ${sessionId}`);
  }
}