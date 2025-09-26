/*
  # Automatic Lead Assignment for New Form Submissions

  1. Function to apply assignment rules to new leads
    - Only applies to qualified leads (bch, lum-l1, lum-l2) 
    - Finds matching assignment rule based on category
    - Creates crm_leads entry with assigned counselor
    - Does not affect existing leads

  2. Trigger on form_sessions
    - Runs only on INSERT (new leads)
    - Only for qualified lead categories
    - Applies assignment rules automatically

  This ensures new qualified leads get automatically assigned based on active rules.
*/

-- Function to automatically assign new leads based on rules
CREATE OR REPLACE FUNCTION auto_assign_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_rule_record RECORD;
  rule_found BOOLEAN := FALSE;
BEGIN
  -- Only process qualified lead categories
  IF NEW.lead_category NOT IN ('bch', 'lum-l1', 'lum-l2') THEN
    RETURN NEW;
  END IF;

  -- Find matching assignment rule (ordered by priority)
  FOR matching_rule_record IN
    SELECT ar.assigned_counselor_id, ar.rule_name, c.name as counselor_name
    FROM assignment_rules ar
    JOIN counselors c ON ar.assigned_counselor_id = c.id
    WHERE ar.is_active = true
      AND ar.start_date <= CURRENT_DATE
      AND (ar.end_date IS NULL OR ar.end_date >= CURRENT_DATE)
      AND (ar.trigger_lead_category IS NULL OR ar.trigger_lead_category = NEW.lead_category)
      AND (ar.trigger_lead_status IS NULL OR ar.trigger_lead_status = '01_yet_to_contact')
    ORDER BY ar.rule_priority ASC
    LIMIT 1
  LOOP
    -- Create crm_leads entry with assignment
    INSERT INTO crm_leads (
      session_id,
      lead_status,
      assigned_to
    ) VALUES (
      NEW.session_id,
      '01_yet_to_contact',
      matching_rule_record.assigned_counselor_id
    );

    -- Add comment about auto-assignment
    INSERT INTO crm_comments (
      session_id,
      counselor_id,
      comment_text,
      lead_status_at_comment
    ) VALUES (
      NEW.session_id,
      matching_rule_record.assigned_counselor_id,
      'Auto-assigned by rule: ' || matching_rule_record.rule_name,
      '01_yet_to_contact'
    );

    rule_found := TRUE;
    EXIT; -- Exit loop after first match
  END LOOP;

  -- Log for debugging
  IF rule_found THEN
    RAISE NOTICE 'Auto-assigned lead % (category: %) to counselor via rule', NEW.session_id, NEW.lead_category;
  ELSE
    RAISE NOTICE 'No assignment rule found for lead % (category: %)', NEW.session_id, NEW.lead_category;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that runs on new form submissions
DROP TRIGGER IF EXISTS trigger_auto_assign_new_lead ON form_sessions;

CREATE TRIGGER trigger_auto_assign_new_lead
  AFTER INSERT ON form_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_new_lead();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_assign_new_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_assign_new_lead() TO service_role;
GRANT EXECUTE ON FUNCTION auto_assign_new_lead() TO anon;