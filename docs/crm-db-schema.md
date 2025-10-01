# CRM Database Schema Documentation

**Last Updated**: October 1, 2025
**Project**: Beacon House CRM Application
**Purpose**: Complete database schema documentation for CRM tables, excluding form_sessions which belongs to a separate system

---

## Table of Contents
1. [Overview](#overview)
2. [Tables](#tables)
3. [Functions](#functions)
4. [Triggers](#triggers)
5. [Indexes](#indexes)
6. [RLS Policies](#rls-policies)
7. [Constraints](#constraints)
8. [Complete SQL Recreation Script](#complete-sql-recreation-script)

---

## Overview

This document provides a complete specification of the CRM database schema. The schema consists of 5 main tables that manage counselors, lead assignments, comments, WhatsApp operations, and automatic assignment rules.

### Core Tables
- **counselors**: User accounts for CRM system (admin, senior_counselor, junior_counselor)
- **crm_leads**: CRM-specific data for leads (status, assignments, contact history)
- **crm_comments**: Activity log and notes for each lead
- **whatsapp_leads**: WhatsApp export tracking and message status
- **assignment_rules**: Admin-configurable rules for automatic lead assignment

### Key Design Principles
- All tables use UUID primary keys
- Timestamp tracking (created_at, updated_at) on all tables
- Row Level Security (RLS) enabled on all tables
- Foreign key relationships maintain referential integrity
- Indexes optimize common query patterns
- Triggers automate timestamp updates and lead assignment

---

## Tables

### 1. counselors

**Purpose**: Stores CRM user accounts with role-based access control

```sql
CREATE TABLE IF NOT EXISTS public.counselors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'senior_counselor', 'junior_counselor')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Columns**:
- `id` (uuid, PK): Unique identifier, also used as auth.uid() in Supabase Auth
- `name` (text, NOT NULL): Full name of the counselor
- `email` (text, NOT NULL, UNIQUE): Email address for authentication
- `role` (text, NOT NULL): User role - 'admin', 'senior_counselor', or 'junior_counselor'
- `is_active` (boolean, default true): Whether the counselor account is active
- `created_at` (timestamptz): Record creation timestamp
- `updated_at` (timestamptz): Last modification timestamp

**Special Records**:
- System Auto-Assigner: id = '00000000-0000-0000-0000-000000000000', used for system-generated comments

**Relationships**:
- Referenced by: crm_leads.assigned_to
- Referenced by: crm_comments.counselor_id
- Referenced by: whatsapp_leads.exported_by
- Referenced by: assignment_rules.assigned_counselor_id

---

### 2. crm_leads

**Purpose**: CRM-specific data for leads, stores status and assignment information

```sql
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  lead_status text NOT NULL DEFAULT '01_yet_to_contact' CHECK (
    lead_status IN (
      '01_yet_to_contact',
      '02_failed_to_contact',
      '03_counselling_call_booked',
      '04_counselling_call_rescheduled',
      '05_counselling_call_no_show',
      '05b_to_be_rescheduled',
      '06_counselling_call_done',
      '07_followup_call_requested',
      '07a_followup_call_requested_vishy',
      '07b_followup_call_requested_karthik',
      '07c_followup_call_requested_matt',
      '08_interest_exploration',
      '09_price_negotiation',
      '10_converted',
      '11_drop',
      '12_conversion_followup'
    )
  ),
  assigned_to uuid REFERENCES public.counselors(id) ON DELETE SET NULL,
  last_contacted timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_crm_leads_session_id FOREIGN KEY (session_id) REFERENCES public.form_sessions(session_id) ON DELETE CASCADE
);
```

**Columns**:
- `id` (uuid, PK): Unique identifier for the CRM lead record
- `session_id` (text, NOT NULL, UNIQUE): Links to form_sessions.session_id (source of truth)
- `lead_status` (text, NOT NULL): Current stage in the CRM funnel
- `assigned_to` (uuid, FK to counselors): Counselor assigned to this lead (nullable)
- `last_contacted` (timestamptz): When the lead was last contacted
- `created_at` (timestamptz): When lead entered CRM
- `updated_at` (timestamptz): Last status/assignment change

**Lead Status Values**:
1. `01_yet_to_contact` - New lead, not yet contacted
2. `02_failed_to_contact` - Unable to reach lead
3. `03_counselling_call_booked` - Counseling session scheduled
4. `04_counselling_call_rescheduled` - Session rescheduled
5. `05_counselling_call_no_show` - Lead didn't attend scheduled call
6. `05b_to_be_rescheduled` - Needs rescheduling
7. `06_counselling_call_done` - Counseling session completed
8. `07_followup_call_requested` - Lead requested follow-up
9. `07a_followup_call_requested_vishy` - Follow-up assigned to Vishy
10. `07b_followup_call_requested_karthik` - Follow-up assigned to Karthik
11. `07c_followup_call_requested_matt` - Follow-up assigned to Matt
12. `08_interest_exploration` - Exploring interest level
13. `09_price_negotiation` - Negotiating pricing
14. `10_converted` - Lead converted to customer
15. `11_drop` - Lead dropped out
16. `12_conversion_followup` - Post-conversion follow-up

---

### 3. crm_comments

**Purpose**: Activity log and notes for each lead

```sql
CREATE TABLE IF NOT EXISTS public.crm_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  counselor_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  lead_status_at_comment text NOT NULL CHECK (
    lead_status_at_comment IN (
      '01_yet_to_contact',
      '02_failed_to_contact',
      '03_counselling_call_booked',
      '04_counselling_call_rescheduled',
      '05_counselling_call_no_show',
      '05b_to_be_rescheduled',
      '06_counselling_call_done',
      '07_followup_call_requested',
      '07a_followup_call_requested_vishy',
      '07b_followup_call_requested_karthik',
      '07c_followup_call_requested_matt',
      '08_interest_exploration',
      '09_price_negotiation',
      '10_converted',
      '11_drop',
      '12_conversion_followup'
    )
  ),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_crm_comments_session_id FOREIGN KEY (session_id) REFERENCES public.form_sessions(session_id) ON DELETE CASCADE
);
```

**Columns**:
- `id` (uuid, PK): Unique identifier for the comment
- `session_id` (text, NOT NULL, FK): Links to form_sessions and crm_leads
- `counselor_id` (uuid, NOT NULL, FK to counselors): Who created the comment (including system user)
- `comment_text` (text, NOT NULL): The comment content
- `lead_status_at_comment` (text, NOT NULL): Lead status when comment was created
- `created_at` (timestamptz): When comment was created

**Usage**:
- Manual notes from counselors
- System-generated audit trail (assignments, status changes)
- Auto-assignment notifications

---

### 4. whatsapp_leads

**Purpose**: Tracks WhatsApp export operations and message status

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  whatsapp_status text NOT NULL DEFAULT 'not_exported' CHECK (
    whatsapp_status IN ('not_exported', 'exported', 'message_sent')
  ),
  export_date timestamptz,
  last_message_date timestamptz,
  exported_by uuid REFERENCES public.counselors(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_whatsapp_leads_session_id FOREIGN KEY (session_id) REFERENCES public.form_sessions(session_id) ON DELETE CASCADE
);
```

**Columns**:
- `id` (uuid, PK): Unique identifier
- `session_id` (text, NOT NULL, UNIQUE, FK): Links to form_sessions
- `whatsapp_status` (text, NOT NULL): Export/message status
- `export_date` (timestamptz): When lead was exported to Interakt
- `last_message_date` (timestamptz): When last message was sent
- `exported_by` (uuid, FK to counselors): Who exported the lead
- `notes` (text): Additional notes about WhatsApp campaigns
- `created_at` (timestamptz): Record creation
- `updated_at` (timestamptz): Last update

**WhatsApp Status Values**:
- `not_exported` - Lead eligible for export but not yet exported
- `exported` - Lead exported to Interakt for WhatsApp campaign
- `message_sent` - WhatsApp message confirmed sent

---

### 5. assignment_rules

**Purpose**: Admin-configurable rules for automatic lead assignment

```sql
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_priority integer NOT NULL DEFAULT 100 CHECK (rule_priority >= 0),
  trigger_lead_category text,
  trigger_lead_status text,
  assigned_counselor_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date CHECK (end_date IS NULL OR end_date >= start_date),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Columns**:
- `id` (uuid, PK): Unique identifier
- `rule_name` (text, NOT NULL): Descriptive name for the rule
- `rule_priority` (integer, NOT NULL): Lower number = higher priority
- `trigger_lead_category` (text, nullable): Lead category filter (null = any category)
- `trigger_lead_status` (text, nullable): Lead status filter (null = any status)
- `assigned_counselor_id` (uuid, NOT NULL, FK): Target counselor for assignment
- `start_date` (date, NOT NULL): When rule becomes active
- `end_date` (date, nullable): When rule expires (null = perpetual)
- `is_active` (boolean): Whether rule is currently enabled
- `created_at` (timestamptz): Record creation
- `updated_at` (timestamptz): Last modification

**Rule Matching Logic**:
1. Rules are evaluated in order of priority (ascending)
2. First matching rule wins
3. NULL trigger values act as wildcards (match any)
4. Both category and status must match if specified
5. Only active rules within date range are considered

---

## Functions

### 1. update_timestamp()

**Purpose**: Automatically updates the `updated_at` column on row updates

```sql
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
```

**Usage**: Attached to all CRM tables via BEFORE UPDATE triggers

---

### 2. auto_assign_new_lead()

**Purpose**: Automatically assigns new leads based on assignment rules when they're inserted into form_sessions

```sql
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_system_counselor_id uuid := '00000000-0000-0000-0000-000000000000';
    v_assigned_counselor_id uuid;
    v_crm_lead_exists boolean := FALSE;
    v_counselor_name text;
BEGIN
    -- Only process on INSERT (new form submissions)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Auto-assignment triggered for session_id: % (lead_category: %, is_qualified: %)',
        NEW.session_id, NEW.lead_category, NEW.is_qualified_lead;

    -- Check if crm_leads entry already exists
    SELECT EXISTS (
        SELECT 1 FROM public.crm_leads
        WHERE session_id = NEW.session_id
    ) INTO v_crm_lead_exists;

    -- Create crm_leads entry for ALL leads (qualified and unqualified)
    IF NOT v_crm_lead_exists THEN
        -- Determine assignment based on lead_category
        IF NEW.lead_category = 'bch' THEN
            SELECT id INTO v_assigned_counselor_id FROM public.counselors WHERE email = 'vishy@beaconhouse.com';
        ELSIF NEW.lead_category IN ('lum-l1', 'lum-l2') THEN
            SELECT id INTO v_assigned_counselor_id FROM public.counselors WHERE email = 'karthik@beaconhouse.com';
        ELSE
            v_assigned_counselor_id := NULL; -- Unqualified leads remain unassigned
        END IF;

        -- Create crm_leads entry
        INSERT INTO public.crm_leads (
            session_id,
            lead_status,
            assigned_to,
            created_at,
            updated_at
        ) VALUES (
            NEW.session_id,
            '01_yet_to_contact',
            v_assigned_counselor_id,
            now(),
            now()
        );

        RAISE NOTICE 'Created crm_leads entry for lead: % (category: %, assigned: %)',
            NEW.session_id, NEW.lead_category,
            CASE WHEN v_assigned_counselor_id IS NOT NULL THEN 'Yes' ELSE 'No' END;
    ELSE
        RAISE NOTICE 'crm_leads entry already exists for session: %', NEW.session_id;
    END IF;

    -- Add system comment for audit trail
    IF v_assigned_counselor_id IS NOT NULL THEN
        SELECT name INTO v_counselor_name FROM public.counselors WHERE id = v_assigned_counselor_id;

        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            v_system_counselor_id,
            format('Auto-assigned to %s (Category: %s, Qualified: %s)',
                v_counselor_name,
                COALESCE(NEW.lead_category, 'Unknown'),
                CASE WHEN NEW.is_qualified_lead THEN 'Yes' ELSE 'No' END
            ),
            '01_yet_to_contact',
            now()
        );
    ELSE
        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            v_system_counselor_id,
            format('Lead added to CRM as unassigned (Category: %s, Qualified: %s)',
                COALESCE(NEW.lead_category, 'Unknown'),
                CASE WHEN NEW.is_qualified_lead THEN 'Yes' ELSE 'No' END
            ),
            '01_yet_to_contact',
            now()
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original form_sessions insert
        RAISE WARNING 'Auto-assignment failed for session %: % %', NEW.session_id, SQLSTATE, SQLERRM;
        RETURN NEW;
END;
$function$;
```

**Behavior**:
- Triggers on INSERT to form_sessions table
- Creates crm_leads entry for ALL new leads
- Assigns based on hardcoded logic: bch → vishy@beaconhouse.com, lum-l1/lum-l2 → karthik@beaconhouse.com
- Adds system comment for audit trail
- Fails gracefully without blocking form submission

**Note**: Current implementation uses hardcoded assignments. The assignment_rules table exists but is not yet integrated into this function.

---

## Triggers

### Timestamp Update Triggers

```sql
-- counselors
CREATE TRIGGER update_counselors_timestamp
BEFORE UPDATE ON public.counselors
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- crm_leads
CREATE TRIGGER update_crm_leads_timestamp
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- whatsapp_leads
CREATE TRIGGER update_whatsapp_leads_timestamp
BEFORE UPDATE ON public.whatsapp_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- assignment_rules
CREATE TRIGGER update_assignment_rules_timestamp
BEFORE UPDATE ON public.assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();
```

### Auto-Assignment Trigger

```sql
-- form_sessions (external table, included for completeness)
CREATE TRIGGER trigger_auto_assign_new_lead
AFTER INSERT ON public.form_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_new_lead();
```

**Note**: form_sessions also has an update_form_sessions_timestamp trigger (not part of CRM schema)

---

## Indexes

### counselors

```sql
CREATE INDEX counselors_email_idx ON public.counselors USING btree (email);
CREATE INDEX counselors_role_active_idx ON public.counselors USING btree (role, is_active);
```

### crm_leads

```sql
CREATE INDEX crm_leads_session_id_idx ON public.crm_leads USING btree (session_id);
CREATE INDEX crm_leads_assigned_to_idx ON public.crm_leads USING btree (assigned_to);
CREATE INDEX crm_leads_status_idx ON public.crm_leads USING btree (lead_status);
CREATE INDEX crm_leads_last_contacted_idx ON public.crm_leads USING btree (last_contacted);
```

### crm_comments

```sql
CREATE INDEX crm_comments_session_id_idx ON public.crm_comments USING btree (session_id);
CREATE INDEX crm_comments_counselor_id_idx ON public.crm_comments USING btree (counselor_id);
CREATE INDEX crm_comments_created_at_idx ON public.crm_comments USING btree (created_at);
```

### whatsapp_leads

```sql
CREATE INDEX whatsapp_leads_session_id_idx ON public.whatsapp_leads USING btree (session_id);
CREATE INDEX whatsapp_leads_status_idx ON public.whatsapp_leads USING btree (whatsapp_status);
CREATE INDEX whatsapp_leads_export_date_idx ON public.whatsapp_leads USING btree (export_date);
```

### assignment_rules

```sql
CREATE INDEX assignment_rules_category_idx ON public.assignment_rules USING btree (trigger_lead_category);
CREATE INDEX assignment_rules_status_idx ON public.assignment_rules USING btree (trigger_lead_status);
CREATE INDEX assignment_rules_counselor_idx ON public.assignment_rules USING btree (assigned_counselor_id);
CREATE INDEX assignment_rules_dates_idx ON public.assignment_rules USING btree (start_date, end_date);
CREATE INDEX assignment_rules_priority_idx ON public.assignment_rules USING btree (rule_priority);
CREATE INDEX assignment_rules_active_idx ON public.assignment_rules USING btree (is_active);
```

---

## RLS Policies

### counselors

**Table**: Row Level Security ENABLED

```sql
-- Allow all authenticated users to view counselors
CREATE POLICY "Anyone can view counselors"
ON public.counselors FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to manage counselors
CREATE POLICY "Anyone can manage counselors"
ON public.counselors FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

**Security Note**: These policies are permissive for operational flexibility. Consider restricting to admin-only in production.

---

### crm_leads

**Table**: Row Level Security ENABLED

```sql
-- All active counselors can view all leads
CREATE POLICY "Active counselors can view all leads"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- All active counselors can insert leads
CREATE POLICY "Counselors can insert leads"
ON public.crm_leads FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- Senior counselors and admins can update any lead
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

-- Junior counselors can only update their own assigned leads
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
```

---

### crm_comments

**Table**: Row Level Security ENABLED

```sql
-- Counselors can view comments based on role
-- Admins and senior counselors: all comments
-- Junior counselors: only comments on their assigned leads
CREATE POLICY "Counselors can view comments based on role"
ON public.crm_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
      AND c.is_active = true
      AND (
        -- Admins and senior counselors see all
        c.role IN ('admin', 'senior_counselor')
        OR
        -- Junior counselors see only their leads
        (
          c.role = 'junior_counselor'
          AND EXISTS (
            SELECT 1 FROM public.crm_leads cl
            WHERE cl.session_id = crm_comments.session_id
              AND cl.assigned_to = c.id
          )
        )
      )
  )
);

-- Counselors can insert comments on accessible leads
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
        -- Admins and senior counselors can comment on any lead
        c.role IN ('admin', 'senior_counselor')
        OR
        -- Junior counselors can only comment on assigned leads
        (
          c.role = 'junior_counselor'
          AND EXISTS (
            SELECT 1 FROM public.crm_leads cl
            WHERE cl.session_id = crm_comments.session_id
              AND cl.assigned_to = c.id
          )
        )
      )
  )
);
```

---

### whatsapp_leads

**Table**: Row Level Security ENABLED

```sql
-- All active counselors can view WhatsApp leads
CREATE POLICY "Counselors can view whatsapp leads"
ON public.whatsapp_leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- All active counselors can manage WhatsApp leads
CREATE POLICY "Counselors can manage whatsapp leads"
ON public.whatsapp_leads FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);
```

---

### assignment_rules

**Table**: Row Level Security ENABLED

```sql
-- All active counselors can view assignment rules
CREATE POLICY "Counselors can view assignment rules"
ON public.assignment_rules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- Only admins can manage assignment rules
CREATE POLICY "Admins can manage assignment rules"
ON public.assignment_rules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
      AND c.is_active = true
      AND c.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
      AND c.is_active = true
      AND c.role = 'admin'
  )
);
```

---

## Constraints

### Check Constraints

**counselors**:
- `counselors_role_check`: `role IN ('admin', 'senior_counselor', 'junior_counselor')`

**crm_leads**:
- `crm_leads_lead_status_check`: Validates lead_status against allowed values (16 statuses)

**crm_comments**:
- `crm_comments_lead_status_at_comment_check`: Validates lead_status_at_comment against allowed values (16 statuses)

**whatsapp_leads**:
- `whatsapp_leads_whatsapp_status_check`: `whatsapp_status IN ('not_exported', 'exported', 'message_sent')`

**assignment_rules**:
- `assignment_rules_priority_positive`: `rule_priority >= 0`
- `assignment_rules_valid_date_range`: `end_date IS NULL OR end_date >= start_date`

### Foreign Key Constraints

**crm_leads**:
- `crm_leads_assigned_to_fkey`: `assigned_to` → `counselors(id)` ON DELETE SET NULL
- `fk_crm_leads_session_id`: `session_id` → `form_sessions(session_id)` ON DELETE CASCADE

**crm_comments**:
- `crm_comments_counselor_id_fkey`: `counselor_id` → `counselors(id)` ON DELETE CASCADE
- `fk_crm_comments_session_id`: `session_id` → `form_sessions(session_id)` ON DELETE CASCADE

**whatsapp_leads**:
- `whatsapp_leads_exported_by_fkey`: `exported_by` → `counselors(id)` ON DELETE SET NULL
- `fk_whatsapp_leads_session_id`: `session_id` → `form_sessions(session_id)` ON DELETE CASCADE

**assignment_rules**:
- `assignment_rules_assigned_counselor_id_fkey`: `assigned_counselor_id` → `counselors(id)` ON DELETE CASCADE

### Unique Constraints

- `counselors.email` - UNIQUE
- `crm_leads.session_id` - UNIQUE (one-to-one with form_sessions)
- `whatsapp_leads.session_id` - UNIQUE (one-to-one with form_sessions)

---

## Complete SQL Recreation Script

The following script will recreate the entire CRM schema from scratch. Run these statements in order.

### Prerequisites
```sql
-- Ensure form_sessions table exists (external dependency)
-- This script assumes form_sessions is already created with:
--   - session_id (text, unique, primary key candidate)
--   - lead_category (text)
--   - is_qualified_lead (boolean)
```

### Step 1: Create Functions

```sql
-- Function: update_timestamp()
-- Purpose: Automatically update updated_at column on row updates
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### Step 2: Create Tables

```sql
-- Table: counselors
CREATE TABLE IF NOT EXISTS public.counselors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'senior_counselor', 'junior_counselor')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: crm_leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  lead_status text NOT NULL DEFAULT '01_yet_to_contact' CHECK (
    lead_status IN (
      '01_yet_to_contact',
      '02_failed_to_contact',
      '03_counselling_call_booked',
      '04_counselling_call_rescheduled',
      '05_counselling_call_no_show',
      '05b_to_be_rescheduled',
      '06_counselling_call_done',
      '07_followup_call_requested',
      '07a_followup_call_requested_vishy',
      '07b_followup_call_requested_karthik',
      '07c_followup_call_requested_matt',
      '08_interest_exploration',
      '09_price_negotiation',
      '10_converted',
      '11_drop',
      '12_conversion_followup'
    )
  ),
  assigned_to uuid REFERENCES public.counselors(id) ON DELETE SET NULL,
  last_contacted timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key to form_sessions (external table)
ALTER TABLE public.crm_leads
ADD CONSTRAINT fk_crm_leads_session_id
FOREIGN KEY (session_id)
REFERENCES public.form_sessions(session_id)
ON DELETE CASCADE;

-- Table: crm_comments
CREATE TABLE IF NOT EXISTS public.crm_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  counselor_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  lead_status_at_comment text NOT NULL CHECK (
    lead_status_at_comment IN (
      '01_yet_to_contact',
      '02_failed_to_contact',
      '03_counselling_call_booked',
      '04_counselling_call_rescheduled',
      '05_counselling_call_no_show',
      '05b_to_be_rescheduled',
      '06_counselling_call_done',
      '07_followup_call_requested',
      '07a_followup_call_requested_vishy',
      '07b_followup_call_requested_karthik',
      '07c_followup_call_requested_matt',
      '08_interest_exploration',
      '09_price_negotiation',
      '10_converted',
      '11_drop',
      '12_conversion_followup'
    )
  ),
  created_at timestamptz DEFAULT now()
);

-- Add foreign key to form_sessions
ALTER TABLE public.crm_comments
ADD CONSTRAINT fk_crm_comments_session_id
FOREIGN KEY (session_id)
REFERENCES public.form_sessions(session_id)
ON DELETE CASCADE;

-- Table: whatsapp_leads
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  whatsapp_status text NOT NULL DEFAULT 'not_exported' CHECK (
    whatsapp_status IN ('not_exported', 'exported', 'message_sent')
  ),
  export_date timestamptz,
  last_message_date timestamptz,
  exported_by uuid REFERENCES public.counselors(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key to form_sessions
ALTER TABLE public.whatsapp_leads
ADD CONSTRAINT fk_whatsapp_leads_session_id
FOREIGN KEY (session_id)
REFERENCES public.form_sessions(session_id)
ON DELETE CASCADE;

-- Table: assignment_rules
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_priority integer NOT NULL DEFAULT 100 CHECK (rule_priority >= 0),
  trigger_lead_category text,
  trigger_lead_status text,
  assigned_counselor_id uuid NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date CHECK (end_date IS NULL OR end_date >= start_date),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Step 3: Create Indexes

```sql
-- counselors indexes
CREATE INDEX IF NOT EXISTS counselors_email_idx ON public.counselors (email);
CREATE INDEX IF NOT EXISTS counselors_role_active_idx ON public.counselors (role, is_active);

-- crm_leads indexes
CREATE INDEX IF NOT EXISTS crm_leads_session_id_idx ON public.crm_leads (session_id);
CREATE INDEX IF NOT EXISTS crm_leads_assigned_to_idx ON public.crm_leads (assigned_to);
CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON public.crm_leads (lead_status);
CREATE INDEX IF NOT EXISTS crm_leads_last_contacted_idx ON public.crm_leads (last_contacted);

-- crm_comments indexes
CREATE INDEX IF NOT EXISTS crm_comments_session_id_idx ON public.crm_comments (session_id);
CREATE INDEX IF NOT EXISTS crm_comments_counselor_id_idx ON public.crm_comments (counselor_id);
CREATE INDEX IF NOT EXISTS crm_comments_created_at_idx ON public.crm_comments (created_at);

-- whatsapp_leads indexes
CREATE INDEX IF NOT EXISTS whatsapp_leads_session_id_idx ON public.whatsapp_leads (session_id);
CREATE INDEX IF NOT EXISTS whatsapp_leads_status_idx ON public.whatsapp_leads (whatsapp_status);
CREATE INDEX IF NOT EXISTS whatsapp_leads_export_date_idx ON public.whatsapp_leads (export_date);

-- assignment_rules indexes
CREATE INDEX IF NOT EXISTS assignment_rules_category_idx ON public.assignment_rules (trigger_lead_category);
CREATE INDEX IF NOT EXISTS assignment_rules_status_idx ON public.assignment_rules (trigger_lead_status);
CREATE INDEX IF NOT EXISTS assignment_rules_counselor_idx ON public.assignment_rules (assigned_counselor_id);
CREATE INDEX IF NOT EXISTS assignment_rules_dates_idx ON public.assignment_rules (start_date, end_date);
CREATE INDEX IF NOT EXISTS assignment_rules_priority_idx ON public.assignment_rules (rule_priority);
CREATE INDEX IF NOT EXISTS assignment_rules_active_idx ON public.assignment_rules (is_active);
```

### Step 4: Enable RLS

```sql
ALTER TABLE public.counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
```

### Step 5: Create RLS Policies

```sql
-- counselors policies
CREATE POLICY "Anyone can view counselors"
ON public.counselors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can manage counselors"
ON public.counselors FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- crm_leads policies
CREATE POLICY "Active counselors can view all leads"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Counselors can insert leads"
ON public.crm_leads FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
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

-- crm_comments policies
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
        OR
        (
          c.role = 'junior_counselor'
          AND EXISTS (
            SELECT 1 FROM public.crm_leads cl
            WHERE cl.session_id = crm_comments.session_id
              AND cl.assigned_to = c.id
          )
        )
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
        OR
        (
          c.role = 'junior_counselor'
          AND EXISTS (
            SELECT 1 FROM public.crm_leads cl
            WHERE cl.session_id = crm_comments.session_id
              AND cl.assigned_to = c.id
          )
        )
      )
  )
);

-- whatsapp_leads policies
CREATE POLICY "Counselors can view whatsapp leads"
ON public.whatsapp_leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Counselors can manage whatsapp leads"
ON public.whatsapp_leads FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

-- assignment_rules policies
CREATE POLICY "Counselors can view assignment rules"
ON public.assignment_rules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid() AND c.is_active = true
  )
);

CREATE POLICY "Admins can manage assignment rules"
ON public.assignment_rules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
      AND c.is_active = true
      AND c.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
      AND c.is_active = true
      AND c.role = 'admin'
  )
);
```

### Step 6: Create Triggers

```sql
-- Timestamp update triggers
CREATE TRIGGER update_counselors_timestamp
BEFORE UPDATE ON public.counselors
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_crm_leads_timestamp
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_whatsapp_leads_timestamp
BEFORE UPDATE ON public.whatsapp_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_assignment_rules_timestamp
BEFORE UPDATE ON public.assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();
```

### Step 7: Create Auto-Assignment Function and Trigger

```sql
-- Function: auto_assign_new_lead()
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_system_counselor_id uuid := '00000000-0000-0000-0000-000000000000';
    v_assigned_counselor_id uuid;
    v_crm_lead_exists boolean := FALSE;
    v_counselor_name text;
BEGIN
    -- Only process on INSERT (new form submissions)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Auto-assignment triggered for session_id: % (lead_category: %, is_qualified: %)',
        NEW.session_id, NEW.lead_category, NEW.is_qualified_lead;

    -- Check if crm_leads entry already exists
    SELECT EXISTS (
        SELECT 1 FROM public.crm_leads
        WHERE session_id = NEW.session_id
    ) INTO v_crm_lead_exists;

    -- Create crm_leads entry for ALL leads (qualified and unqualified)
    IF NOT v_crm_lead_exists THEN
        -- Determine assignment based on lead_category
        IF NEW.lead_category = 'bch' THEN
            SELECT id INTO v_assigned_counselor_id FROM public.counselors WHERE email = 'vishy@beaconhouse.com';
        ELSIF NEW.lead_category IN ('lum-l1', 'lum-l2') THEN
            SELECT id INTO v_assigned_counselor_id FROM public.counselors WHERE email = 'karthik@beaconhouse.com';
        ELSE
            v_assigned_counselor_id := NULL; -- Unqualified leads remain unassigned
        END IF;

        -- Create crm_leads entry
        INSERT INTO public.crm_leads (
            session_id,
            lead_status,
            assigned_to,
            created_at,
            updated_at
        ) VALUES (
            NEW.session_id,
            '01_yet_to_contact',
            v_assigned_counselor_id,
            now(),
            now()
        );

        RAISE NOTICE 'Created crm_leads entry for lead: % (category: %, assigned: %)',
            NEW.session_id, NEW.lead_category,
            CASE WHEN v_assigned_counselor_id IS NOT NULL THEN 'Yes' ELSE 'No' END;
    ELSE
        RAISE NOTICE 'crm_leads entry already exists for session: %', NEW.session_id;
    END IF;

    -- Add system comment for audit trail
    IF v_assigned_counselor_id IS NOT NULL THEN
        SELECT name INTO v_counselor_name FROM public.counselors WHERE id = v_assigned_counselor_id;

        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            v_system_counselor_id,
            format('Auto-assigned to %s (Category: %s, Qualified: %s)',
                v_counselor_name,
                COALESCE(NEW.lead_category, 'Unknown'),
                CASE WHEN NEW.is_qualified_lead THEN 'Yes' ELSE 'No' END
            ),
            '01_yet_to_contact',
            now()
        );
    ELSE
        INSERT INTO public.crm_comments (
            session_id,
            counselor_id,
            comment_text,
            lead_status_at_comment,
            created_at
        ) VALUES (
            NEW.session_id,
            v_system_counselor_id,
            format('Lead added to CRM as unassigned (Category: %s, Qualified: %s)',
                COALESCE(NEW.lead_category, 'Unknown'),
                CASE WHEN NEW.is_qualified_lead THEN 'Yes' ELSE 'No' END
            ),
            '01_yet_to_contact',
            now()
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original form_sessions insert
        RAISE WARNING 'Auto-assignment failed for session %: % %', NEW.session_id, SQLSTATE, SQLERRM;
        RETURN NEW;
END;
$$;

-- Trigger on form_sessions
CREATE TRIGGER trigger_auto_assign_new_lead
AFTER INSERT ON public.form_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_new_lead();
```

### Step 8: Create System Counselor

```sql
-- Insert system counselor for auto-assignment comments
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
)
ON CONFLICT (id) DO NOTHING;
```

### Step 9: Grant Permissions

```sql
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on tables
GRANT ALL ON public.counselors TO authenticated;
GRANT ALL ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_comments TO authenticated;
GRANT ALL ON public.whatsapp_leads TO authenticated;
GRANT ALL ON public.assignment_rules TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.update_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_new_lead() TO authenticated, anon, service_role;
```

---

## Migration History

This schema was created through the following migrations:

1. **20250926051800_jade_breeze.sql** - Created assignment_rules table with RLS policies
2. **20250926060525_lingering_haze.sql** - Fixed RLS policy for crm_leads global count queries
3. **20250926061318_purple_credit.sql** - Created auto_assign_new_lead() function and trigger (first version)
4. **20250926061641_rapid_art.sql** - Replaced auto_assign_new_lead() with improved version
5. **20250926070443_broken_sun.sql** - Final comprehensive auto-assignment implementation with system counselor

---

## Notes

### Data Integrity
- **Golden Rule**: form_sessions is read-only from CRM perspective. Only crm_leads and crm_comments are editable.
- All CRM tables have CASCADE delete on session_id foreign keys
- Counselor deletions are handled gracefully (SET NULL for assignments, CASCADE for rules)

### Performance Considerations
- All frequently-queried columns are indexed
- Composite indexes optimize role-based queries
- session_id is indexed in all tables for efficient joins

### Security
- RLS enforces role-based access at database level
- Junior counselors can only access their assigned leads
- Admin-only operations protected by RLS policies
- System counselor (id = '00000000...') used for automated actions

### Future Improvements
1. Integrate assignment_rules table into auto_assign_new_lead() function
2. Add soft-delete functionality for historical data
3. Consider partitioning for high-volume tables (if needed)
4. Add materialized views for common aggregate queries

---

**End of Documentation**
