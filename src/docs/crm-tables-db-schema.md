# Beacon House \- Complete Consolidated Database Schema

## Overview

This is the complete, consolidated database schema for both the Landing Page and CRM projects. This represents the current production state after all incremental updates have been applied.

**Projects Covered:**

- **Landing Page Project**: `form_sessions` table (read/write)  
- **CRM Project**: `counselors`, `crm_leads`, `crm_comments` tables (CRM-owned)

**Key Principles:**

- CRM project has READ-ONLY access to `form_sessions` table  
- All schema changes are idempotent (safe to run multiple times)  
- Includes all incremental updates applied to date

---

## PART 1: SHARED FUNCTIONS & UTILITIES

\-- \====================================

\-- SHARED FUNCTIONS (Used by both projects)

\-- \====================================

\-- Create the update\_timestamp function (used by triggers)

CREATE OR REPLACE FUNCTION public.update\_timestamp()

RETURNS TRIGGER

LANGUAGE plpgsql

SECURITY DEFINER

SET search\_path \= ''

AS $$

BEGIN

  NEW.updated\_at \= now();

  RETURN NEW;

END;

$$;

---

## PART 2: LANDING PAGE SCHEMA (form\_sessions)

\-- \====================================

\-- LANDING PAGE PROJECT \- FORM\_SESSIONS TABLE

\-- \====================================

\-- This table is owned by the landing page project

\-- CRM project has READ-ONLY access via foreign keys

\-- Create the main form\_sessions table

CREATE TABLE IF NOT EXISTS public.form\_sessions (

  \-- Primary key and session identifier

  id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),

  session\_id text UNIQUE NOT NULL,

  

  \-- System fields

  environment text,

  created\_at timestamptz DEFAULT now(),

  updated\_at timestamptz DEFAULT now(),

  

  \-- Page 1: Student Information

  form\_filler\_type text,

  student\_name text,

  current\_grade text,

  phone\_number text,

  

  \-- Page 1: Academic Information

  curriculum\_type text,

  grade\_format text,

  gpa\_value text,

  percentage\_value text,

  school\_name text,

  

  \-- Page 1: Study Preferences

  scholarship\_requirement text,

  target\_geographies jsonb,

  

  \-- Page 2: Parent Contact Information

  parent\_name text,

  parent\_email text,

  

  \-- Page 2A: Counseling Information

  selected\_date text,

  selected\_slot text,

  

  \-- System/Calculated Fields

  lead\_category text,

  is\_counselling\_booked boolean DEFAULT false,

  funnel\_stage text DEFAULT '01\_form\_start',

  is\_qualified\_lead boolean DEFAULT false,

  page\_completed integer DEFAULT 1,

  triggered\_events jsonb DEFAULT '\[\]'::jsonb,

  

  \-- UTM Parameters (Campaign Tracking)

  utm\_source text,

  utm\_medium text,

  utm\_campaign text,

  utm\_term text,

  utm\_content text,

  utm\_id text,

  

  \-- Location field (added at end via ALTER TABLE)

  location text

);

\-- Create indexes for performance

CREATE INDEX IF NOT EXISTS form\_sessions\_session\_id\_idx ON public.form\_sessions USING btree (session\_id);

CREATE INDEX IF NOT EXISTS form\_sessions\_environment\_idx ON public.form\_sessions USING btree (environment);

CREATE INDEX IF NOT EXISTS form\_sessions\_lead\_category\_idx ON public.form\_sessions USING btree (lead\_category);

CREATE INDEX IF NOT EXISTS form\_sessions\_funnel\_stage\_idx ON public.form\_sessions USING btree (funnel\_stage);

CREATE INDEX IF NOT EXISTS form\_sessions\_created\_at\_idx ON public.form\_sessions USING btree (created\_at);

\-- Enable Row Level Security

ALTER TABLE public.form\_sessions ENABLE ROW LEVEL SECURITY;

\-- Create RLS policies for form\_sessions (matching actual database granularity)

CREATE POLICY IF NOT EXISTS "Anonymous users can view form sessions"

ON public.form\_sessions FOR SELECT

TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Anonymous users can create form sessions"

ON public.form\_sessions FOR INSERT

TO anon WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anonymous users can update form sessions"

ON public.form\_sessions FOR UPDATE

TO anon USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can view form sessions"

ON public.form\_sessions FOR SELECT

TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can insert form sessions"

ON public.form\_sessions FOR INSERT

TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can update form sessions"

ON public.form\_sessions FOR UPDATE

TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role can access all form sessions"

ON public.form\_sessions FOR ALL

TO service\_role USING (true) WITH CHECK (true);

\-- Create the upsert function (with location field included)

CREATE OR REPLACE FUNCTION public.upsert\_form\_session(

  p\_session\_id text,

  p\_form\_data jsonb

)

RETURNS uuid

LANGUAGE plpgsql

SECURITY DEFINER

SET search\_path \= ''

AS $$

DECLARE

  v\_id uuid;

BEGIN

  \-- Insert or update the form session

  INSERT INTO public.form\_sessions (

    session\_id,

    environment,

    form\_filler\_type,

    student\_name,

    current\_grade,

    phone\_number,

    location,

    curriculum\_type,

    grade\_format,

    gpa\_value,

    percentage\_value,

    school\_name,

    scholarship\_requirement,

    target\_geographies,

    parent\_name,

    parent\_email,

    selected\_date,

    selected\_slot,

    lead\_category,

    is\_counselling\_booked,

    funnel\_stage,

    is\_qualified\_lead,

    page\_completed,

    triggered\_events,

    utm\_source,

    utm\_medium,

    utm\_campaign,

    utm\_term,

    utm\_content,

    utm\_id

  )

  VALUES (

    p\_session\_id,

    p\_form\_data-\>\>'environment',

    p\_form\_data-\>\>'form\_filler\_type',

    p\_form\_data-\>\>'student\_name',

    p\_form\_data-\>\>'current\_grade',

    p\_form\_data-\>\>'phone\_number',

    p\_form\_data-\>\>'location',

    p\_form\_data-\>\>'curriculum\_type',

    p\_form\_data-\>\>'grade\_format',

    p\_form\_data-\>\>'gpa\_value',

    p\_form\_data-\>\>'percentage\_value',

    p\_form\_data-\>\>'school\_name',

    p\_form\_data-\>\>'scholarship\_requirement',

    p\_form\_data-\>'target\_geographies',

    p\_form\_data-\>\>'parent\_name',

    p\_form\_data-\>\>'parent\_email',

    p\_form\_data-\>\>'selected\_date',

    p\_form\_data-\>\>'selected\_slot',

    p\_form\_data-\>\>'lead\_category',

    COALESCE((p\_form\_data-\>\>'is\_counselling\_booked')::boolean, false),

    COALESCE(p\_form\_data-\>\>'funnel\_stage', 'initial\_capture'),

    COALESCE((p\_form\_data-\>\>'is\_qualified\_lead')::boolean, false),

    COALESCE((p\_form\_data-\>\>'page\_completed')::integer, 1),

    COALESCE(p\_form\_data-\>'triggered\_events', '\[\]'::jsonb),

    p\_form\_data-\>\>'utm\_source',

    p\_form\_data-\>\>'utm\_medium',

    p\_form\_data-\>\>'utm\_campaign',

    p\_form\_data-\>\>'utm\_term',

    p\_form\_data-\>\>'utm\_content',

    p\_form\_data-\>\>'utm\_id'

  )

  ON CONFLICT (session\_id)

  DO UPDATE SET

    environment \= COALESCE(EXCLUDED.environment, form\_sessions.environment),

    form\_filler\_type \= COALESCE(EXCLUDED.form\_filler\_type, form\_sessions.form\_filler\_type),

    student\_name \= COALESCE(EXCLUDED.student\_name, form\_sessions.student\_name),

    current\_grade \= COALESCE(EXCLUDED.current\_grade, form\_sessions.current\_grade),

    phone\_number \= COALESCE(EXCLUDED.phone\_number, form\_sessions.phone\_number),

    location \= COALESCE(EXCLUDED.location, form\_sessions.location),

    curriculum\_type \= COALESCE(EXCLUDED.curriculum\_type, form\_sessions.curriculum\_type),

    grade\_format \= COALESCE(EXCLUDED.grade\_format, form\_sessions.grade\_format),

    gpa\_value \= COALESCE(EXCLUDED.gpa\_value, form\_sessions.gpa\_value),

    percentage\_value \= COALESCE(EXCLUDED.percentage\_value, form\_sessions.percentage\_value),

    school\_name \= COALESCE(EXCLUDED.school\_name, form\_sessions.school\_name),

    scholarship\_requirement \= COALESCE(EXCLUDED.scholarship\_requirement, form\_sessions.scholarship\_requirement),

    target\_geographies \= COALESCE(EXCLUDED.target\_geographies, form\_sessions.target\_geographies),

    parent\_name \= COALESCE(EXCLUDED.parent\_name, form\_sessions.parent\_name),

    parent\_email \= COALESCE(EXCLUDED.parent\_email, form\_sessions.parent\_email),

    selected\_date \= COALESCE(EXCLUDED.selected\_date, form\_sessions.selected\_date),

    selected\_slot \= COALESCE(EXCLUDED.selected\_slot, form\_sessions.selected\_slot),

    lead\_category \= COALESCE(EXCLUDED.lead\_category, form\_sessions.lead\_category),

    is\_counselling\_booked \= COALESCE(EXCLUDED.is\_counselling\_booked, form\_sessions.is\_counselling\_booked),

    funnel\_stage \= COALESCE(EXCLUDED.funnel\_stage, form\_sessions.funnel\_stage),

    is\_qualified\_lead \= COALESCE(EXCLUDED.is\_qualified\_lead, form\_sessions.is\_qualified\_lead),

    page\_completed \= COALESCE(EXCLUDED.page\_completed, form\_sessions.page\_completed),

    triggered\_events \= COALESCE(EXCLUDED.triggered\_events, form\_sessions.triggered\_events),

    utm\_source \= COALESCE(EXCLUDED.utm\_source, form\_sessions.utm\_source),

    utm\_medium \= COALESCE(EXCLUDED.utm\_medium, form\_sessions.utm\_medium),

    utm\_campaign \= COALESCE(EXCLUDED.utm\_campaign, form\_sessions.utm\_campaign),

    utm\_term \= COALESCE(EXCLUDED.utm\_term, form\_sessions.utm\_term),

    utm\_content \= COALESCE(EXCLUDED.utm\_content, form\_sessions.utm\_content),

    utm\_id \= COALESCE(EXCLUDED.utm\_id, form\_sessions.utm\_id),

    updated\_at \= now()

  RETURNING id INTO v\_id;

  

  RETURN v\_id;

END;

$$;

\-- Create trigger for form\_sessions

CREATE TRIGGER update\_form\_sessions\_timestamp

  BEFORE UPDATE ON public.form\_sessions

  FOR EACH ROW

  EXECUTE FUNCTION public.update\_timestamp();

\-- Grant permissions for form\_sessions

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON public.form\_sessions TO anon;

GRANT ALL ON public.form\_sessions TO authenticated;

GRANT ALL ON public.form\_sessions TO service\_role;

GRANT EXECUTE ON FUNCTION public.upsert\_form\_session(text, jsonb) TO anon;

GRANT EXECUTE ON FUNCTION public.upsert\_form\_session(text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.upsert\_form\_session(text, jsonb) TO service\_role;

---

## PART 3: CRM PROJECT SCHEMA (New Tables)

\-- \====================================

\-- CRM PROJECT \- NEW TABLES

\-- \====================================

\-- These tables are owned by the CRM project

\-- They reference form\_sessions via foreign keys (READ-ONLY)

\-- Drop existing CRM policies if they exist (clean slate approach)

DROP POLICY IF EXISTS "Anyone can view counselors" ON public.counselors;

DROP POLICY IF EXISTS "Anyone can manage counselors" ON public.counselors;

DROP POLICY IF EXISTS "Authenticated users can view counselors" ON public.counselors;

DROP POLICY IF EXISTS "Authenticated users can manage counselors" ON public.counselors;

DROP POLICY IF EXISTS "Admins can manage counselors" ON public.counselors;

DROP POLICY IF EXISTS "Counselors can view leads based on role" ON public.crm\_leads;

DROP POLICY IF EXISTS "Senior counselors and admins can update leads" ON public.crm\_leads;

DROP POLICY IF EXISTS "Junior counselors can update assigned leads" ON public.crm\_leads;

DROP POLICY IF EXISTS "Counselors can insert leads" ON public.crm\_leads;

DROP POLICY IF EXISTS "Counselors can view comments based on role" ON public.crm\_comments;

DROP POLICY IF EXISTS "Counselors can insert comments on accessible leads" ON public.crm\_comments;

\-- Create counselors table

CREATE TABLE IF NOT EXISTS public.counselors (

  id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),

  name text NOT NULL,

  email text UNIQUE NOT NULL,

  role text NOT NULL CHECK (role IN ('admin', 'senior\_counselor', 'junior\_counselor')),

  is\_active boolean DEFAULT true,

  created\_at timestamptz DEFAULT now(),

  updated\_at timestamptz DEFAULT now()

);

\-- Create crm\_leads table (with updated lead statuses)

CREATE TABLE IF NOT EXISTS public.crm\_leads (

  id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),

  session\_id text UNIQUE NOT NULL, \-- FK to form\_sessions.session\_id

  lead\_status text NOT NULL DEFAULT '01\_yet\_to\_contact'

    CHECK (lead\_status IN (

      '01\_yet\_to\_contact',

      '02\_failed\_to\_contact',

      '03\_counselling\_call\_booked',

      '04\_counselling\_call\_rescheduled',

      '05\_counselling\_call\_no\_show',

      '06\_counselling\_call\_done',

      '07\_followup\_call\_requested',

      '05b\_to\_be\_rescheduled',

      '07a\_followup\_call\_requested\_vishy',

      '07b\_followup\_call\_requested\_karthik',

      '07c\_followup\_call\_requested\_matt',

      '08\_interest\_exploration',

      '09\_price\_negotiation',

      '10\_converted',

      '11\_drop',

      '12\_conversion\_followup'

    )),

  assigned\_to uuid REFERENCES public.counselors(id) ON DELETE SET NULL,

  last\_contacted timestamptz,

  created\_at timestamptz DEFAULT now(),

  updated\_at timestamptz DEFAULT now()

);

\-- Create crm\_comments table (with updated lead statuses)

CREATE TABLE IF NOT EXISTS public.crm\_comments (

  id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),

  session\_id text NOT NULL, \-- FK to form\_sessions.session\_id

  counselor\_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,

  comment\_text text NOT NULL,

  lead\_status\_at\_comment text NOT NULL

    CHECK (lead\_status\_at\_comment IN (

      '01\_yet\_to\_contact',

      '02\_failed\_to\_contact',

      '03\_counselling\_call\_booked',

      '04\_counselling\_call\_rescheduled',

      '05\_counselling\_call\_no\_show',

      '06\_counselling\_call\_done',

      '07\_followup\_call\_requested',

      '05b\_to\_be\_rescheduled',

      '07a\_followup\_call\_requested\_vishy',

      '07b\_followup\_call\_requested\_karthik',

      '07c\_followup\_call\_requested\_matt',

      '08\_interest\_exploration',

      '09\_price\_negotiation',

      '10\_converted',

      '11\_drop',

      '12\_conversion\_followup'

    )),

  created\_at timestamptz DEFAULT now()

);

\-- Create indexes for CRM tables

CREATE INDEX IF NOT EXISTS counselors\_email\_idx ON public.counselors USING btree (email);

CREATE INDEX IF NOT EXISTS counselors\_role\_active\_idx ON public.counselors USING btree (role, is\_active);

CREATE INDEX IF NOT EXISTS crm\_leads\_session\_id\_idx ON public.crm\_leads USING btree (session\_id);

CREATE INDEX IF NOT EXISTS crm\_leads\_status\_idx ON public.crm\_leads USING btree (lead\_status);

CREATE INDEX IF NOT EXISTS crm\_leads\_assigned\_to\_idx ON public.crm\_leads USING btree (assigned\_to);

CREATE INDEX IF NOT EXISTS crm\_leads\_last\_contacted\_idx ON public.crm\_leads USING btree (last\_contacted);

CREATE INDEX IF NOT EXISTS crm\_comments\_session\_id\_idx ON public.crm\_comments USING btree (session\_id);

CREATE INDEX IF NOT EXISTS crm\_comments\_counselor\_id\_idx ON public.crm\_comments USING btree (counselor\_id);

CREATE INDEX IF NOT EXISTS crm\_comments\_created\_at\_idx ON public.crm\_comments USING btree (created\_at);

\-- Add foreign key constraints linking to form\_sessions (READ-ONLY relationship)

DO $$

BEGIN

    \-- Add foreign key for crm\_leads.session\_id if it doesn't exist

    IF NOT EXISTS (

        SELECT 1 FROM information\_schema.table\_constraints 

        WHERE constraint\_name \= 'fk\_crm\_leads\_session\_id'

        AND table\_name \= 'crm\_leads'

    ) THEN

        ALTER TABLE public.crm\_leads

        ADD CONSTRAINT fk\_crm\_leads\_session\_id

        FOREIGN KEY (session\_id) REFERENCES public.form\_sessions(session\_id) ON DELETE CASCADE;

    END IF;

    \-- Add foreign key for crm\_comments.session\_id if it doesn't exist

    IF NOT EXISTS (

        SELECT 1 FROM information\_schema.table\_constraints 

        WHERE constraint\_name \= 'fk\_crm\_comments\_session\_id'

        AND table\_name \= 'crm\_comments'

    ) THEN

        ALTER TABLE public.crm\_comments

        ADD CONSTRAINT fk\_crm\_comments\_session\_id

        FOREIGN KEY (session\_id) REFERENCES public.form\_sessions(session\_id) ON DELETE CASCADE;

    END IF;

END $$;

\-- Enable Row Level Security on CRM tables

ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crm\_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crm\_comments ENABLE ROW LEVEL SECURITY;

\-- Create RLS Policies for CRM tables

\-- Counselors table policies \- Simplified approach

CREATE POLICY "Anyone can view counselors"

ON public.counselors FOR SELECT

TO authenticated USING (true);

CREATE POLICY "Anyone can manage counselors"  

ON public.counselors FOR ALL

TO authenticated USING (true) WITH CHECK (true);

\-- CRM Leads table policies

CREATE POLICY "Counselors can view leads based on role"

ON public.crm\_leads FOR SELECT

TO authenticated

USING (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND (

      c.role IN ('admin', 'senior\_counselor')

      OR (c.role \= 'junior\_counselor' AND crm\_leads.assigned\_to \= c.id)

    )

  )

);

CREATE POLICY "Senior counselors and admins can update leads"

ON public.crm\_leads FOR UPDATE

TO authenticated

USING (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND c.role IN ('admin', 'senior\_counselor')

  )

)

WITH CHECK (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND c.role IN ('admin', 'senior\_counselor')

  )

);

CREATE POLICY "Junior counselors can update assigned leads"

ON public.crm\_leads FOR UPDATE

TO authenticated

USING (

  assigned\_to \= auth.uid()

  AND EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND c.role \= 'junior\_counselor'

  )

)

WITH CHECK (

  assigned\_to \= auth.uid()

  AND EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND c.role \= 'junior\_counselor'

  )

);

CREATE POLICY "Counselors can insert leads"

ON public.crm\_leads FOR INSERT

TO authenticated

WITH CHECK (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

  )

);

\-- CRM Comments table policies

CREATE POLICY "Counselors can view comments based on role"

ON public.crm\_comments FOR SELECT

TO authenticated

USING (

  EXISTS (

    SELECT 1 FROM public.counselors c

    LEFT JOIN public.crm\_leads l ON l.session\_id \= crm\_comments.session\_id

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND (

      c.role IN ('admin', 'senior\_counselor')

      OR (c.role \= 'junior\_counselor' AND l.assigned\_to \= c.id)

    )

  )

);

CREATE POLICY "Counselors can insert comments on accessible leads"

ON public.crm\_comments FOR INSERT

TO authenticated

WITH CHECK (

  EXISTS (

    SELECT 1 FROM public.counselors c

    LEFT JOIN public.crm\_leads l ON l.session\_id \= crm\_comments.session\_id

    WHERE c.id \= auth.uid()

    AND c.is\_active \= true

    AND (

      c.role IN ('admin', 'senior\_counselor')

      OR (c.role \= 'junior\_counselor' AND l.assigned\_to \= c.id)

    )

  )

);

\-- Create triggers for CRM tables

CREATE TRIGGER update\_counselors\_timestamp

  BEFORE UPDATE ON public.counselors

  FOR EACH ROW

  EXECUTE FUNCTION public.update\_timestamp();

CREATE TRIGGER update\_crm\_leads\_timestamp

  BEFORE UPDATE ON public.crm\_leads

  FOR EACH ROW

  EXECUTE FUNCTION public.update\_timestamp();

\-- Grant permissions for CRM tables

GRANT ALL ON public.counselors TO authenticated;

GRANT ALL ON public.crm\_leads TO authenticated;

GRANT ALL ON public.crm\_comments TO authenticated;

---

## PART 4: INITIAL DATA (Production-Ready)

\-- \====================================

\-- INITIAL DATA SEEDING

\-- \====================================

\-- Insert initial counselor data only if table is empty

DO $$

BEGIN

    \-- Only insert if counselors table is empty

    IF (SELECT COUNT(\*) FROM public.counselors) \= 0 THEN

        INSERT INTO public.counselors (id, name, email, role, is\_active) VALUES 

        ('233aaf20-d120-4cf3-92f7-0d5256090b8f', 'Savitha', 'tech@beaconhouse.in', 'admin', true),

        ('95d6b39a-9f0c-4e52-b6a6-a92b8b2a7bb7', 'Vishy', 'vishy@beaconhouse.com', 'senior\_counselor', true),

        ('833520d0-42d4-4b1f-9a11-b2aafc79fadb', 'Karthik', 'karthik@beaconhouse.com', 'senior\_counselor', true),

        ('9a3d0260-3f1b-4d4e-97e8-5ae3afd00550', 'KG', 'nkgoutham@gmail.com', 'senior\_counselor', true);

        

        RAISE NOTICE 'Inserted % counselor records', (SELECT COUNT(\*) FROM public.counselors);

    ELSE

        RAISE NOTICE 'Counselors table already has % records, skipping insert', (SELECT COUNT(\*) FROM public.counselors);

    END IF;

END $$;

---

## PART 6: WHATSAPP LEADS TABLE

\-- \====================================

\-- WHATSAPP\_LEADS TABLE 

\-- \====================================

\-- This table manages WhatsApp lead exports and tracking

\-- Links to form\_sessions via session\_id (READ-ONLY relationship)

\-- Create whatsapp\_leads table

CREATE TABLE IF NOT EXISTS public.whatsapp\_leads (

  id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),

  session\_id text NOT NULL, \-- FK to form\_sessions.session\_id

  whatsapp\_status text NOT NULL DEFAULT 'not\_exported'::text,

  export\_date timestamptz,

  last\_message\_date timestamptz,

  exported\_by uuid, \-- Could reference counselors.id

  notes text,

  created\_at timestamptz DEFAULT now(),

  updated\_at timestamptz DEFAULT now()

);

\-- Create indexes for whatsapp\_leads

CREATE INDEX IF NOT EXISTS whatsapp\_leads\_session\_id\_idx ON public.whatsapp\_leads USING btree (session\_id);

CREATE INDEX IF NOT EXISTS whatsapp\_leads\_status\_idx ON public.whatsapp\_leads USING btree (whatsapp\_status);

CREATE INDEX IF NOT EXISTS whatsapp\_leads\_export\_date\_idx ON public.whatsapp\_leads USING btree (export\_date);

CREATE INDEX IF NOT EXISTS whatsapp\_leads\_exported\_by\_idx ON public.whatsapp\_leads USING btree (exported\_by);

\-- Add foreign key constraint linking to form\_sessions

DO $

BEGIN

    \-- Add foreign key for whatsapp\_leads.session\_id if it doesn't exist

    IF NOT EXISTS (

        SELECT 1 FROM information\_schema.table\_constraints 

        WHERE constraint\_name \= 'fk\_whatsapp\_leads\_session\_id'

        AND table\_name \= 'whatsapp\_leads'

    ) THEN

        ALTER TABLE public.whatsapp\_leads

        ADD CONSTRAINT fk\_whatsapp\_leads\_session\_id

        FOREIGN KEY (session\_id) REFERENCES public.form\_sessions(session\_id) ON DELETE CASCADE;

    END IF;

END $;

\-- Enable Row Level Security

ALTER TABLE public.whatsapp\_leads ENABLE ROW LEVEL SECURITY;

\-- Create RLS Policies for whatsapp\_leads (matching actual database)

CREATE POLICY IF NOT EXISTS "Counselors can view whatsapp leads"

ON public.whatsapp\_leads FOR SELECT

TO authenticated

USING (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid() 

    AND c.is\_active \= true

  )

);

CREATE POLICY IF NOT EXISTS "Counselors can manage whatsapp leads"

ON public.whatsapp\_leads FOR ALL

TO authenticated

USING (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid() 

    AND c.is\_active \= true

  )

)

WITH CHECK (

  EXISTS (

    SELECT 1 FROM public.counselors c

    WHERE c.id \= auth.uid() 

    AND c.is\_active \= true

  )

);

\-- Create trigger for whatsapp\_leads

CREATE TRIGGER update\_whatsapp\_leads\_timestamp

  BEFORE UPDATE ON public.whatsapp\_leads

  FOR EACH ROW

  EXECUTE FUNCTION public.update\_timestamp();

\-- Grant permissions for whatsapp\_leads

GRANT ALL ON public.whatsapp\_leads TO authenticated;

---

## PART 7: VERIFICATION & STATUS

\-- \====================================

\-- VERIFICATION QUERIES

\-- \====================================

\-- Show record counts across all tables

SELECT 

    'form\_sessions' as table\_name,

    COUNT(\*) as record\_count,

    'Landing Page Project' as owned\_by

FROM public.form\_sessions

UNION ALL

SELECT 

    'counselors' as table\_name,

    COUNT(\*) as record\_count,

    'CRM Project' as owned\_by

FROM public.counselors

UNION ALL

SELECT 

    'crm\_leads' as table\_name,

    COUNT(\*) as record\_count,

    'CRM Project' as owned\_by

FROM public.crm\_leads

UNION ALL

SELECT 

    'crm\_comments' as table\_name,

    COUNT(\*) as record\_count,

    'CRM Project' as owned\_by

FROM public.crm\_comments

UNION ALL

SELECT 

    'whatsapp\_leads' as table\_name,

    COUNT(\*) as record\_count,

    'Unknown Project' as owned\_by

FROM public.whatsapp\_leads

ORDER BY owned\_by, table\_name;

\-- Show counselor data with roles

SELECT id, name, email, role, is\_active, created\_at 

FROM public.counselors 

ORDER BY role DESC, name;

\-- Show all tables and their RLS status

SELECT schemaname, tablename, rowsecurity, 

       CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls\_status

FROM pg\_tables 

WHERE schemaname \= 'public' 

AND tablename IN ('form\_sessions', 'counselors', 'crm\_leads', 'crm\_comments', 'whatsapp\_leads')

ORDER BY tablename;

\-- Show policy count for each table

SELECT schemaname, tablename, COUNT(\*) as policy\_count

FROM pg\_policies 

WHERE schemaname \= 'public' 

AND tablename IN ('form\_sessions', 'counselors', 'crm\_leads', 'crm\_comments', 'whatsapp\_leads')

GROUP BY schemaname, tablename

ORDER BY tablename;

\-- Show foreign key relationships

SELECT 

    tc.constraint\_name,

    tc.table\_name as child\_table,

    kcu.column\_name as child\_column,

    ccu.table\_name as parent\_table,

    ccu.column\_name as parent\_column

FROM information\_schema.table\_constraints tc

JOIN information\_schema.key\_column\_usage kcu 

    ON tc.constraint\_name \= kcu.constraint\_name

JOIN information\_schema.constraint\_column\_usage ccu 

    ON ccu.constraint\_name \= tc.constraint\_name

WHERE tc.constraint\_type \= 'FOREIGN KEY'

AND tc.table\_schema \= 'public'

ORDER BY tc.table\_name;

---

## Schema Summary

### Tables Overview

| Table | Owner | Purpose | Key Fields |
| :---- | :---- | :---- | :---- |
| `form_sessions` | Landing Page | Lead capture & tracking | session\_id, student\_name, location, lead\_category |
| `counselors` | CRM | Staff management | name, email, role |
| `crm_leads` | CRM | Lead management | session\_id (FK), lead\_status, assigned\_to |
| `crm_comments` | CRM | Lead communication | session\_id (FK), comment\_text, counselor\_id |

| `whatsapp_leads` | CRM | WhatsApp lead export tracking | session\_id, whatsapp\_status, export\_date |

### Key Relationships

- `crm_leads.session_id` → `form_sessions.session_id` (READ-ONLY)  
- `crm_comments.session_id` → `form_sessions.session_id` (READ-ONLY)  
- `crm_leads.assigned_to` → `counselors.id`  
- `crm_comments.counselor_id` → `counselors.id`  
- `whatsapp_leads.session_id` → `form_sessions.session_id` (READ-ONLY)  
- `whatsapp_leads.exported_by` → `counselors.id` (likely, not enforced)

### Latest Updates Applied

- ✅ Added `location` field to form\_sessions (at end of table, position 49\)  
- ✅ Updated lead statuses with new categories (05b, 07a-c, 08-12)  
- ✅ Granular RLS policies matching actual database structure  
- ✅ Production-ready counselor data with correct email addresses  
- ✅ Discovered and documented complete `whatsapp_leads` table structure  
- ✅ Added foreign key relationships and indexes for `whatsapp_leads`

### Environment Notes

- **Staging**: Safe to run complete schema (will reset/update everything)  
- **Production**: Idempotent \- only adds missing elements, preserves existing data  
- **Migration**: This represents the exact current state for future incremental changes

### Deviations Fixed

- ✅ Column positioning: `location` field now at end (matches actual DB)  
- ✅ RLS policies: Now uses granular policies (matches actual DB)  
- ✅ Missing table: `whatsapp_leads` documented (structure needs separate verification)  
- ✅ Email addresses: Match current production data


### Creating Lead Assignment Rules
/*
  # Create Assignment Rules System

  1. New Tables
    - `assignment_rules`
      - `id` (uuid, primary key)
      - `rule_name` (text) - Descriptive name for the rule
      - `rule_priority` (integer) - Lower number = higher priority
      - `trigger_lead_category` (text, nullable) - Lead category that triggers rule
      - `trigger_lead_status` (text, nullable) - Lead status that triggers rule
      - `assigned_counselor_id` (uuid, foreign key) - Counselor to assign to
      - `start_date` (date) - When rule becomes active
      - `end_date` (date, nullable) - When rule expires (NULL = perpetual)
      - `is_active` (boolean) - Enable/disable rule
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `assignment_rules` table
    - Add policies for admin management and counselor reading
  
  3. Default Rules
    - BCH leads → Vishy
    - Lum-L1/L2 leads → Karthik  
    - To be rescheduled → Savitha
*/

-- Create assignment_rules table
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_priority integer NOT NULL DEFAULT 100,
  trigger_lead_category text,
  trigger_lead_status text,
  assigned_counselor_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE public.assignment_rules 
ADD CONSTRAINT assignment_rules_priority_positive CHECK (rule_priority >= 0);

ALTER TABLE public.assignment_rules
ADD CONSTRAINT assignment_rules_valid_date_range CHECK (end_date IS NULL OR end_date >= start_date);

-- Create indexes for efficient rule lookup
CREATE INDEX IF NOT EXISTS assignment_rules_category_idx ON public.assignment_rules (trigger_lead_category);
CREATE INDEX IF NOT EXISTS assignment_rules_status_idx ON public.assignment_rules (trigger_lead_status);
CREATE INDEX IF NOT EXISTS assignment_rules_counselor_idx ON public.assignment_rules (assigned_counselor_id);
CREATE INDEX IF NOT EXISTS assignment_rules_dates_idx ON public.assignment_rules (start_date, end_date);
CREATE INDEX IF NOT EXISTS assignment_rules_priority_idx ON public.assignment_rules (rule_priority);
CREATE INDEX IF NOT EXISTS assignment_rules_active_idx ON public.assignment_rules (is_active);

-- Enable RLS
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage assignment rules"
ON public.assignment_rules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true AND c.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true AND c.role = 'admin'
  )
);

CREATE POLICY "Counselors can view assignment rules"
ON public.assignment_rules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- Create update timestamp trigger
CREATE TRIGGER update_assignment_rules_timestamp
BEFORE UPDATE ON public.assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Grant permissions
GRANT ALL ON public.assignment_rules TO authenticated;

-- Insert default assignment rules
DO $$
DECLARE
  vishy_id uuid;
  karthik_id uuid;
  savitha_id uuid;
BEGIN
  -- Get counselor IDs
  SELECT id INTO vishy_id FROM public.counselors WHERE email = 'vishy@beaconhouse.com';
  SELECT id INTO karthik_id FROM public.counselors WHERE email = 'karthik@beaconhouse.com';
  SELECT id INTO savitha_id FROM public.counselors WHERE email = 'savitha@beaconhouse.com';
  
  -- Only insert default rules if table is empty
  IF (SELECT COUNT(*) FROM public.assignment_rules) = 0 THEN
    -- Status-based rule (highest priority)
    IF savitha_id IS NOT NULL THEN
      INSERT INTO public.assignment_rules (
        rule_name,
        rule_priority,
        trigger_lead_category,
        trigger_lead_status,
        assigned_counselor_id,
        start_date,
        end_date,
        is_active
      ) VALUES (
        'To Be Rescheduled → Savitha',
        1,
        NULL,
        '05b_to_be_rescheduled',
        savitha_id,
        CURRENT_DATE,
        NULL,
        true
      );
    END IF;
    
    -- Category-based rules (lower priority)
    IF vishy_id IS NOT NULL THEN
      INSERT INTO public.assignment_rules (
        rule_name,
        rule_priority,
        trigger_lead_category,
        trigger_lead_status,
        assigned_counselor_id,
        start_date,
        end_date,
        is_active
      ) VALUES (
        'BCH Leads → Vishy',
        10,
        'bch',
        NULL,
        vishy_id,
        CURRENT_DATE,
        NULL,
        true
      );
    END IF;
    
    IF karthik_id IS NOT NULL THEN
      INSERT INTO public.assignment_rules (
        rule_name,
        rule_priority,
        trigger_lead_category,
        trigger_lead_status,
        assigned_counselor_id,
        start_date,
        end_date,
        is_active
      ) VALUES (
        'Lum-L1 Leads → Karthik',
        20,
        'lum-l1',
        NULL,
        karthik_id,
        CURRENT_DATE,
        NULL,
        true
      ), (
        'Lum-L2 Leads → Karthik',
        21,
        'lum-l2',
        NULL,
        karthik_id,
        CURRENT_DATE,
        NULL,
        true
      );
    END IF;
    
    RAISE NOTICE 'Inserted default assignment rules';
  ELSE
    RAISE NOTICE 'Assignment rules table already has data, skipping default inserts';
  END IF;
END $$;

-- Fix RLS policy for crm_leads to allow global count queries
-- This addresses the "Failed to fetch" error when counting assigned leads

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Counselors can view leads based on role" ON public.crm_leads;

-- Create a simpler policy that allows all active counselors to view all leads
CREATE POLICY "Active counselors can view all leads"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
    AND c.is_active = true
  )
);

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

