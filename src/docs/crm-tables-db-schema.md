-- ====================================
-- BEACON HOUSE CRM - IDEMPOTENT SCHEMA
-- ====================================
-- Safe to run multiple times in staging and production
-- Will only create/update what's needed, skip what exists correctly
-- Assumes form_sessions table and update_timestamp() function already exist from db-schema-v3.md

-- STEP 0: Drop and recreate all RLS policies to ensure clean state
-- This prevents conflicts and ensures we have the working policies

-- Drop existing CRM policies if they exist
DROP POLICY IF EXISTS "Anyone can view counselors" ON public.counselors;
DROP POLICY IF EXISTS "Anyone can manage counselors" ON public.counselors;
DROP POLICY IF EXISTS "Authenticated users can view counselors" ON public.counselors;
DROP POLICY IF EXISTS "Authenticated users can manage counselors" ON public.counselors;
DROP POLICY IF EXISTS "Admins can manage counselors" ON public.counselors;

DROP POLICY IF EXISTS "Counselors can view leads based on role" ON public.crm_leads;
DROP POLICY IF EXISTS "Senior counselors and admins can update leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Junior counselors can update assigned leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Counselors can insert leads" ON public.crm_leads;

DROP POLICY IF EXISTS "Counselors can view comments based on role" ON public.crm_comments;
DROP POLICY IF EXISTS "Counselors can insert comments on accessible leads" ON public.crm_comments;

-- STEP 1: Create tables only if they don't exist

CREATE TABLE IF NOT EXISTS public.counselors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 email text UNIQUE NOT NULL,
 role text NOT NULL CHECK (role IN ('admin', 'senior_counselor', 'junior_counselor')),
 is_active boolean DEFAULT true,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id text UNIQUE NOT NULL, -- FK to form_sessions.session_id
 lead_status text NOT NULL DEFAULT '01_yet_to_contact'
   CHECK (lead_status IN (
     '01_yet_to_contact',
     '02_failed_to_contact',
     '03_counselling_call_booked',
     '04_counselling_call_rescheduled',
     '05_counselling_call_no_show',
     '06_counselling_call_done',
     '07_followup_call_requested',
     '08_interest_intent_received',
     '09_converted_paid'
   )),
 assigned_to uuid REFERENCES public.counselors(id) ON DELETE SET NULL,
 last_contacted timestamptz,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id text NOT NULL, -- FK to form_sessions.session_id
 counselor_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
 comment_text text NOT NULL,
 lead_status_at_comment text NOT NULL
   CHECK (lead_status_at_comment IN (
     '01_yet_to_contact',
     '02_failed_to_contact',
     '03_counselling_call_booked',
     '04_counselling_call_rescheduled',
     '05_counselling_call_no_show',
     '06_counselling_call_done',
     '07_followup_call_requested',
     '08_interest_intent_received',
     '09_converted_paid'
   )),
 created_at timestamptz DEFAULT now()
);

-- STEP 2: Create indexes only if they don't exist (IF NOT EXISTS handles this)

CREATE INDEX IF NOT EXISTS counselors_email_idx ON public.counselors USING btree (email);
CREATE INDEX IF NOT EXISTS counselors_role_active_idx ON public.counselors USING btree (role, is_active);

CREATE INDEX IF NOT EXISTS crm_leads_session_id_idx ON public.crm_leads USING btree (session_id);
CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON public.crm_leads USING btree (lead_status);
CREATE INDEX IF NOT EXISTS crm_leads_assigned_to_idx ON public.crm_leads USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS crm_leads_last_contacted_idx ON public.crm_leads USING btree (last_contacted);

CREATE INDEX IF NOT EXISTS crm_comments_session_id_idx ON public.crm_comments USING btree (session_id);
CREATE INDEX IF NOT EXISTS crm_comments_counselor_id_idx ON public.crm_comments USING btree (counselor_id);
CREATE INDEX IF NOT EXISTS crm_comments_created_at_idx ON public.crm_comments USING btree (created_at);

-- STEP 3: Add foreign key constraints only if they don't exist
-- Check and add constraints safely

DO $$
BEGIN
    -- Add foreign key for crm_leads.session_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_crm_leads_session_id'
        AND table_name = 'crm_leads'
    ) THEN
        ALTER TABLE public.crm_leads
        ADD CONSTRAINT fk_crm_leads_session_id
        FOREIGN KEY (session_id) REFERENCES public.form_sessions(session_id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for crm_comments.session_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_crm_comments_session_id'
        AND table_name = 'crm_comments'
    ) THEN
        ALTER TABLE public.crm_comments
        ADD CONSTRAINT fk_crm_comments_session_id
        FOREIGN KEY (session_id) REFERENCES public.form_sessions(session_id) ON DELETE CASCADE;
    END IF;
END $$;

-- STEP 4: Enable Row Level Security (safe to run multiple times)

ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_comments ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create all RLS Policies (fresh, since we dropped old ones above)

-- Counselors table policies - Simplified approach that worked in staging
CREATE POLICY "Anyone can view counselors"
ON public.counselors FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Anyone can manage counselors"  
ON public.counselors FOR ALL
TO authenticated USING (true) WITH CHECK (true);

-- CRM Leads table policies
CREATE POLICY "Counselors can view leads based on role"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
 EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND (
     c.role IN ('admin', 'senior_counselor')
     OR (c.role = 'junior_counselor' AND crm_leads.assigned_to = c.id)
   )
 )
);

CREATE POLICY "Senior counselors and admins can update leads"
ON public.crm_leads FOR UPDATE
TO authenticated
USING (
 EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND c.role IN ('admin', 'senior_counselor')
 )
)
WITH CHECK (
 EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND c.role IN ('admin', 'senior_counselor')
 )
);

CREATE POLICY "Junior counselors can update assigned leads"
ON public.crm_leads FOR UPDATE
TO authenticated
USING (
 assigned_to = auth.uid()
 AND EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND c.role = 'junior_counselor'
 )
)
WITH CHECK (
 assigned_to = auth.uid()
 AND EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND c.role = 'junior_counselor'
 )
);

CREATE POLICY "Counselors can insert leads"
ON public.crm_leads FOR INSERT
TO authenticated
WITH CHECK (
 EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
 )
);

-- CRM Comments table policies
CREATE POLICY "Counselors can view comments based on role"
ON public.crm_comments FOR SELECT
TO authenticated
USING (
 EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND (
     c.role IN ('admin', 'senior_counselor')
     OR (c.role = 'junior_counselor' AND EXISTS (
       SELECT 1 FROM public.crm_leads cl
       WHERE cl.session_id = crm_comments.session_id
       AND cl.assigned_to = c.id
     ))
   )
 )
);

CREATE POLICY "Counselors can insert comments on accessible leads"
ON public.crm_comments FOR INSERT
TO authenticated
WITH CHECK (
 counselor_id = auth.uid()
 AND EXISTS (
   SELECT 1 FROM public.counselors c
   WHERE c.id = auth.uid()
   AND c.is_active = true
   AND (
     c.role IN ('admin', 'senior_counselor')
     OR (c.role = 'junior_counselor' AND EXISTS (
       SELECT 1 FROM public.crm_leads cl
       WHERE cl.session_id = crm_comments.session_id
       AND cl.assigned_to = c.id
     ))
   )
 )
);

-- STEP 6: Create update timestamp triggers only if they don't exist

DO $$
BEGIN
    -- Create trigger for counselors if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_counselors_timestamp'
    ) THEN
        CREATE TRIGGER update_counselors_timestamp
        BEFORE UPDATE ON public.counselors
        FOR EACH ROW
        EXECUTE FUNCTION public.update_timestamp();
    END IF;

    -- Create trigger for crm_leads if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_crm_leads_timestamp'
    ) THEN
        CREATE TRIGGER update_crm_leads_timestamp
        BEFORE UPDATE ON public.crm_leads
        FOR EACH ROW
        EXECUTE FUNCTION public.update_timestamp();
    END IF;
END $$;

-- STEP 7: Grant necessary permissions (safe to run multiple times)

GRANT ALL ON public.counselors TO authenticated;
GRANT ALL ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_comments TO authenticated;

-- STEP 8: Insert initial counselor data only if table is empty
-- This ensures we don't duplicate or conflict with existing data

DO $$
BEGIN
    -- Only insert if counselors table is empty
    IF (SELECT COUNT(*) FROM public.counselors) = 0 THEN
        INSERT INTO public.counselors (id, name, email, role, is_active) VALUES 
        ('233aaf20-d120-4cf3-92f7-0d5256090b8f', 'Savitha', 'savitha@beaconhouse.com', 'admin', true),
        ('95d6b39a-9f0c-4e52-b6a6-a92b8b2a7bb7', 'Vishy', 'vishy@beaconhouse.com', 'senior_counselor', true),
        ('833520d0-42d4-4b1f-9a11-b2aafc79fadb', 'Karthik', 'karthik@beaconhouse.com', 'senior_counselor', true),
        ('9a3d0260-3f1b-4d4e-97e8-5ae3afd00550', 'KG', 'kg@beaconhouse.com', 'senior_counselor', true);
        
        RAISE NOTICE 'Inserted % counselor records', (SELECT COUNT(*) FROM public.counselors);
    ELSE
        RAISE NOTICE 'Counselors table already has % records, skipping insert', (SELECT COUNT(*) FROM public.counselors);
    END IF;
END $$;

-- STEP 9: Verification and status report

SELECT 
    'counselors' as table_name,
    COUNT(*) as record_count
FROM public.counselors
UNION ALL
SELECT 
    'crm_leads' as table_name,
    COUNT(*) as record_count
FROM public.crm_leads
UNION ALL
SELECT 
    'crm_comments' as table_name,
    COUNT(*) as record_count
FROM public.crm_comments
UNION ALL
SELECT 
    'form_sessions' as table_name,
    COUNT(*) as record_count
FROM public.form_sessions;

-- Show counselor data with roles
SELECT id, name, email, role, is_active, created_at 
FROM public.counselors 
ORDER BY role DESC, name;

-- Show all tables and their RLS status
SELECT schemaname, tablename, rowsecurity, 
       CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('form_sessions', 'counselors', 'crm_leads', 'crm_comments')
ORDER BY tablename;

-- Show policy count for each table
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('counselors', 'crm_leads', 'crm_comments')
GROUP BY schemaname, tablename
ORDER BY tablename;