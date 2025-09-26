/*
  # Comprehensive Auto-Assignment for New Leads

  This migration implements automatic lead assignment based on admin-configured rules.
  
  ## Key Features:
  - Triggers when funnel_stage transitions to '06_lead_evaluated' 
  - Respects is_qualified_lead flag from form_sessions
  - Uses dynamic assignment_rules from admin panel (no hardcoding)
  - Creates crm_leads entry for all qualified leads (assigned or unassigned)
  - Adds system comments for audit trail
  - Fully idempotent and safe to run multiple times
  
  ## Flow:
  1. Lead fills form progressively
  2. When funnel_stage → '06_lead_evaluated', trigger fires
  3. Check is_qualified_lead flag
  4. Create crm_leads entry if qualified
  5. Find matching assignment rule from admin panel
  6. Apply assignment if rule found, or leave unassigned
  7. Log system comment about the action
*/

-- Step 1: Create System Counselor for system-generated comments (IDEMPOTENT)
DO $$
BEGIN
    -- Insert system counselor if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM public.counselors 
        WHERE id = '00000000-0000-0000-0000-000000000000'
    ) THEN
        INSERT INTO public.counselors (
            id,
            name,
            email,
            role,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            'System Auto-Assigner',
            'system@beaconhouse.com',
            'admin',
            true,
            now(),
            now()
        );
        
        RAISE NOTICE 'Created System Auto-Assigner counselor';
    ELSE
        RAISE NOTICE 'System Auto-Assigner counselor already exists';
    END IF;
END $$;

-- Step 2: Create/Replace Auto-Assignment Function (IDEMPOTENT)
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_system_counselor_id uuid := '00000000-0000-0000-0000-000000000000';
    v_matching_rule RECORD;
    v_crm_lead_exists boolean := FALSE;
    v_rule_found boolean := FALSE;
BEGIN
    -- Only process when funnel_stage transitions TO '06_lead_evaluated'
    IF NEW.funnel_stage != '06_lead_evaluated' OR OLD.funnel_stage = '06_lead_evaluated' THEN
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Auto-assignment triggered for session_id: % (lead_category: %, is_qualified: %)', 
        NEW.session_id, NEW.lead_category, NEW.is_qualified_lead;

    -- Check if lead is qualified - respect the form_sessions flag
    IF NEW.is_qualified_lead IS NOT TRUE THEN
        RAISE NOTICE 'Lead % is not qualified (is_qualified_lead = FALSE), skipping auto-assignment', NEW.session_id;
        RETURN NEW;
    END IF;

    -- Check if crm_leads entry already exists
    SELECT EXISTS (
        SELECT 1 FROM public.crm_leads 
        WHERE session_id = NEW.session_id
    ) INTO v_crm_lead_exists;

    -- Create crm_leads entry if it doesn't exist (GUARANTEED for all qualified leads)
    IF NOT v_crm_lead_exists THEN
        INSERT INTO public.crm_leads (
            session_id,
            lead_status,
            assigned_to,
            created_at,
            updated_at
        ) VALUES (
            NEW.session_id,
            '01_yet_to_contact',
            NULL, -- Will be updated if rule found
            now(),
            now()
        );
        
        RAISE NOTICE 'Created crm_leads entry for qualified lead: %', NEW.session_id;
    ELSE
        RAISE NOTICE 'crm_leads entry already exists for session: %', NEW.session_id;
    END IF;

    -- Find the best matching assignment rule from admin panel (DYNAMIC)
    SELECT 
        ar.*,
        c.name as counselor_name
    INTO v_matching_rule
    FROM public.assignment_rules ar
    LEFT JOIN public.counselors c ON c.id = ar.assigned_counselor_id
    WHERE 
        -- Rule must be active
        ar.is_active = TRUE
        -- Rule must be within date range
        AND ar.start_date <= CURRENT_DATE
        AND (ar.end_date IS NULL OR ar.end_date >= CURRENT_DATE)
        -- Category filter (NULL means "any category")
        AND (ar.trigger_lead_category IS NULL OR ar.trigger_lead_category = NEW.lead_category)
        -- Status filter (NULL means "any status" - new leads start at '01_yet_to_contact')
        AND (ar.trigger_lead_status IS NULL OR ar.trigger_lead_status = '01_yet_to_contact')
        -- Counselor must be active
        AND c.is_active = TRUE
    ORDER BY 
        ar.rule_priority ASC,  -- Lower number = higher priority
        ar.created_at ASC      -- Older rules win if same priority
    LIMIT 1;

    -- Apply assignment if rule found
    IF v_matching_rule.id IS NOT NULL THEN
        v_rule_found := TRUE;
        
        -- Update crm_leads with assignment
        UPDATE public.crm_leads 
        SET 
            assigned_to = v_matching_rule.assigned_counselor_id,
            updated_at = now()
        WHERE session_id = NEW.session_id;

        -- Add system comment about auto-assignment
        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            v_system_counselor_id,
            format('Auto-assigned to %s by rule "%s" (Priority: %s, Category: %s)', 
                v_matching_rule.counselor_name,
                v_matching_rule.rule_name,
                v_matching_rule.rule_priority,
                COALESCE(v_matching_rule.trigger_lead_category, 'Any')
            ),
            '01_yet_to_contact',
            now()
        );

        RAISE NOTICE 'Auto-assigned lead % to counselor % using rule "%s"', 
            NEW.session_id, v_matching_rule.counselor_name, v_matching_rule.rule_name;
    ELSE
        -- No rule found, but lead is qualified - add to CRM as unassigned
        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            v_system_counselor_id,
            format('Qualified lead added to CRM as unassigned. No assignment rule matched (Category: %s)', 
                COALESCE(NEW.lead_category, 'Unknown')
            ),
            '01_yet_to_contact',
            now()
        );

        RAISE NOTICE 'No assignment rule found for qualified lead % (category: %), added as unassigned', 
            NEW.session_id, NEW.lead_category;
    END IF;

    RETURN NEW;
EXCEPTION 
    WHEN OTHERS THEN
        -- Log error but don't fail the original form_sessions update
        RAISE WARNING 'Auto-assignment failed for session %: % %', NEW.session_id, SQLSTATE, SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 3: Create/Replace Trigger (IDEMPOTENT)
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_assign_new_lead ON public.form_sessions;

-- Create new trigger with proper WHEN clause
CREATE TRIGGER trigger_auto_assign_new_lead
    AFTER UPDATE ON public.form_sessions
    FOR EACH ROW
    WHEN (
        NEW.funnel_stage = '06_lead_evaluated' 
        AND OLD.funnel_stage IS DISTINCT FROM '06_lead_evaluated'
    )
    EXECUTE FUNCTION public.auto_assign_new_lead();

-- Step 4: Grant necessary permissions (IDEMPOTENT)
GRANT EXECUTE ON FUNCTION public.auto_assign_new_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_new_lead() TO service_role;

-- Step 5: Verification and summary
DO $$
DECLARE
    v_system_counselor_exists boolean;
    v_function_exists boolean;
    v_trigger_exists boolean;
    v_active_rules_count integer;
BEGIN
    -- Check system counselor
    SELECT EXISTS (
        SELECT 1 FROM public.counselors 
        WHERE id = '00000000-0000-0000-0000-000000000000'
    ) INTO v_system_counselor_exists;

    -- Check function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'auto_assign_new_lead'
    ) INTO v_function_exists;

    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_auto_assign_new_lead'
    ) INTO v_trigger_exists;

    -- Count active rules
    SELECT COUNT(*) FROM public.assignment_rules 
    WHERE is_active = TRUE 
    AND start_date <= CURRENT_DATE 
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    INTO v_active_rules_count;

    -- Summary
    RAISE NOTICE '=== AUTO-ASSIGNMENT SETUP COMPLETE ===';
    RAISE NOTICE 'System Counselor Exists: %', v_system_counselor_exists;
    RAISE NOTICE 'Auto-Assignment Function Exists: %', v_function_exists;  
    RAISE NOTICE 'Trigger Exists: %', v_trigger_exists;
    RAISE NOTICE 'Active Assignment Rules: %', v_active_rules_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Auto-assignment will now trigger when:';
    RAISE NOTICE '1. form_sessions.funnel_stage transitions to "06_lead_evaluated"';
    RAISE NOTICE '2. form_sessions.is_qualified_lead = TRUE';
    RAISE NOTICE '3. A matching assignment rule exists in admin panel';
    RAISE NOTICE '';
    RAISE NOTICE 'All qualified leads will get crm_leads entry (assigned or unassigned)';
    RAISE NOTICE 'System comments will be added for audit trail';
END $$;