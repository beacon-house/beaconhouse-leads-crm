/*
# Auto Assignment for New Leads

1. New Function
   - `auto_assign_new_lead()` - Processes new form submissions and applies assignment rules dynamically
   - Uses assignment_rules table to find matching rules (not hardcoded categories)
   - Supports any lead_category or lead_status that admin configures

2. Trigger  
   - Runs AFTER INSERT on form_sessions for each new lead
   - Only creates crm_leads entry if a matching rule is found
   - Leaves leads unassigned if no matching rule exists

3. Logic Flow
   - Find active assignment rules for the new lead's category/status
   - Select highest priority rule (lowest rule_priority number)
   - Create crm_leads entry with assigned counselor
   - Add auto-assignment comment
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_auto_assign_new_lead ON public.form_sessions;
DROP FUNCTION IF EXISTS public.auto_assign_new_lead();

-- Create the auto assignment function
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    matching_rule RECORD;
    current_date_val DATE;
BEGIN
    -- Get current date for rule date range checking
    current_date_val := CURRENT_DATE;
    
    -- Find the highest priority active assignment rule that matches this lead
    SELECT ar.*, c.name as counselor_name
    INTO matching_rule
    FROM public.assignment_rules ar
    JOIN public.counselors c ON ar.assigned_counselor_id = c.id
    WHERE ar.is_active = true
      AND ar.start_date <= current_date_val
      AND (ar.end_date IS NULL OR ar.end_date >= current_date_val)
      AND c.is_active = true
      AND (ar.trigger_lead_category IS NULL OR ar.trigger_lead_category = NEW.lead_category)
      AND (ar.trigger_lead_status IS NULL OR ar.trigger_lead_status = '01_yet_to_contact')
    ORDER BY ar.rule_priority ASC, ar.created_at ASC
    LIMIT 1;
    
    -- If a matching rule is found, create crm_leads entry and add comment
    IF matching_rule.id IS NOT NULL THEN
        -- Create crm_leads entry with assignment
        INSERT INTO public.crm_leads (
            session_id,
            lead_status,
            assigned_to,
            created_at,
            updated_at
        ) VALUES (
            NEW.session_id,
            '01_yet_to_contact',
            matching_rule.assigned_counselor_id,
            now(),
            now()
        );
        
        -- Add auto-assignment comment
        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            matching_rule.assigned_counselor_id,
            'Auto-assigned by rule: ' || matching_rule.rule_name || ' (Priority: ' || matching_rule.rule_priority || ')',
            '01_yet_to_contact',
            now()
        );
        
        RAISE NOTICE 'Auto-assigned lead % to % using rule: %', 
                     NEW.session_id, matching_rule.counselor_name, matching_rule.rule_name;
    ELSE
        RAISE NOTICE 'No matching assignment rule found for lead %, leaving unassigned', NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger that runs after new form submissions
CREATE TRIGGER trigger_auto_assign_new_lead
AFTER INSERT ON public.form_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_new_lead();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_assign_new_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_new_lead() TO anon;

-- Test the setup
SELECT 'Auto assignment trigger installed successfully' as status;