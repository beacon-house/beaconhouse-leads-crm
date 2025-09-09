-- ====================================
-- BEACON HOUSE - COMPLETE FORM_SESSIONS SCHEMA
-- ====================================
-- Master schema for replicating production setup in new Supabase projects
-- Run this complete script in your new staging project


-- 1. Create the update_timestamp function (used by trigger)
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$;


-- 2. Create the main form_sessions table
CREATE TABLE IF NOT EXISTS public.form_sessions (
 -- Primary key and session identifier
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id text UNIQUE NOT NULL,
  -- System fields
 environment text,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now(),
  -- Page 1: Student Information
 form_filler_type text,
 student_name text,
 current_grade text,
 phone_number text,
  -- Page 1: Academic Information
 curriculum_type text,
 grade_format text,
 gpa_value text,
 percentage_value text,
 school_name text,
  -- Page 1: Study Preferences
 scholarship_requirement text,
 target_geographies jsonb,
  -- Page 2: Parent Contact Information
 parent_name text,
 parent_email text,
  -- Page 2A: Counseling Information
 selected_date text,
 selected_slot text,
  -- System/Calculated Fields
 lead_category text,
 is_counselling_booked boolean DEFAULT false,
 funnel_stage text DEFAULT '01_form_start',
 is_qualified_lead boolean DEFAULT false,
 page_completed integer DEFAULT 1,
 triggered_events jsonb DEFAULT '[]'::jsonb,
  -- UTM Parameters (Campaign Tracking)
 utm_source text,
 utm_medium text,
 utm_campaign text,
 utm_term text,
 utm_content text,
 utm_id text
);


-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS form_sessions_session_id_idx ON public.form_sessions USING btree (session_id);
CREATE INDEX IF NOT EXISTS form_sessions_environment_idx ON public.form_sessions USING btree (environment);
CREATE INDEX IF NOT EXISTS form_sessions_lead_category_idx ON public.form_sessions USING btree (lead_category);
CREATE INDEX IF NOT EXISTS form_sessions_funnel_stage_idx ON public.form_sessions USING btree (funnel_stage);
CREATE INDEX IF NOT EXISTS form_sessions_created_at_idx ON public.form_sessions USING btree (created_at);


-- 4. Enable Row Level Security
ALTER TABLE public.form_sessions ENABLE ROW LEVEL SECURITY;


-- 5. Create RLS Policies


-- Policy for anonymous users (form submissions)
CREATE POLICY "Anonymous users can create form sessions"
ON public.form_sessions
FOR INSERT
TO anon
WITH CHECK (true);


CREATE POLICY "Anonymous users can update form sessions"
ON public.form_sessions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);


CREATE POLICY "Anonymous users can view form sessions"
ON public.form_sessions
FOR SELECT
TO anon
USING (true);


-- Policy for authenticated users
CREATE POLICY "Authenticated users can insert form sessions"
ON public.form_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);


CREATE POLICY "Authenticated users can update form sessions"
ON public.form_sessions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


CREATE POLICY "Authenticated users can view form sessions"
ON public.form_sessions
FOR SELECT
TO authenticated
USING (true);


-- Policy for service role (full access)
CREATE POLICY "Service role can access all form sessions"
ON public.form_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- 6. Create the upsert function
CREATE OR REPLACE FUNCTION public.upsert_form_session(
 p_session_id text,
 p_form_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
 v_id uuid;
BEGIN
 -- Insert or update the form session
 INSERT INTO public.form_sessions (
   session_id,
   environment,
   form_filler_type,
   student_name,
   current_grade,
   phone_number,
   curriculum_type,
   grade_format,
   gpa_value,
   percentage_value,
   school_name,
   scholarship_requirement,
   target_geographies,
   parent_name,
   parent_email,
   selected_date,
   selected_slot,
   lead_category,
   is_counselling_booked,
   funnel_stage,
   is_qualified_lead,
   page_completed,
   triggered_events,
   utm_source,
   utm_medium,
   utm_campaign,
   utm_term,
   utm_content,
   utm_id
 )
 VALUES (
   p_session_id,
   p_form_data->>'environment',
   p_form_data->>'form_filler_type',
   p_form_data->>'student_name',
   p_form_data->>'current_grade',
   p_form_data->>'phone_number',
   p_form_data->>'curriculum_type',
   p_form_data->>'grade_format',
   p_form_data->>'gpa_value',
   p_form_data->>'percentage_value',
   p_form_data->>'school_name',
   p_form_data->>'scholarship_requirement',
   p_form_data->'target_geographies',
   p_form_data->>'parent_name',
   p_form_data->>'parent_email',
   p_form_data->>'selected_date',
   p_form_data->>'selected_slot',
   p_form_data->>'lead_category',
   COALESCE((p_form_data->>'is_counselling_booked')::boolean, false),
   COALESCE(p_form_data->>'funnel_stage', '01_form_start'),
   COALESCE((p_form_data->>'is_qualified_lead')::boolean, false),
   COALESCE((p_form_data->>'page_completed')::integer, 1),
   COALESCE(p_form_data->'triggered_events', '[]'::jsonb),
   p_form_data->>'utm_source',
   p_form_data->>'utm_medium',
   p_form_data->>'utm_campaign',
   p_form_data->>'utm_term',
   p_form_data->>'utm_content',
   p_form_data->>'utm_id'
 )
 ON CONFLICT (session_id)
 DO UPDATE SET
   environment = COALESCE(EXCLUDED.environment, form_sessions.environment),
   form_filler_type = COALESCE(EXCLUDED.form_filler_type, form_sessions.form_filler_type),
   student_name = COALESCE(EXCLUDED.student_name, form_sessions.student_name),
   current_grade = COALESCE(EXCLUDED.current_grade, form_sessions.current_grade),
   phone_number = COALESCE(EXCLUDED.phone_number, form_sessions.phone_number),
   curriculum_type = COALESCE(EXCLUDED.curriculum_type, form_sessions.curriculum_type),
   grade_format = COALESCE(EXCLUDED.grade_format, form_sessions.grade_format),
   gpa_value = COALESCE(EXCLUDED.gpa_value, form_sessions.gpa_value),
   percentage_value = COALESCE(EXCLUDED.percentage_value, form_sessions.percentage_value),
   school_name = COALESCE(EXCLUDED.school_name, form_sessions.school_name),
   scholarship_requirement = COALESCE(EXCLUDED.scholarship_requirement, form_sessions.scholarship_requirement),
   target_geographies = COALESCE(EXCLUDED.target_geographies, form_sessions.target_geographies),
   parent_name = COALESCE(EXCLUDED.parent_name, form_sessions.parent_name),
   parent_email = COALESCE(EXCLUDED.parent_email, form_sessions.parent_email),
   selected_date = COALESCE(EXCLUDED.selected_date, form_sessions.selected_date),
   selected_slot = COALESCE(EXCLUDED.selected_slot, form_sessions.selected_slot),
   lead_category = COALESCE(EXCLUDED.lead_category, form_sessions.lead_category),
   is_counselling_booked = COALESCE(EXCLUDED.is_counselling_booked, form_sessions.is_counselling_booked),
   funnel_stage = COALESCE(EXCLUDED.funnel_stage, form_sessions.funnel_stage),
   is_qualified_lead = COALESCE(EXCLUDED.is_qualified_lead, form_sessions.is_qualified_lead),
   page_completed = COALESCE(EXCLUDED.page_completed, form_sessions.page_completed),
   triggered_events = COALESCE(EXCLUDED.triggered_events, form_sessions.triggered_events),
   utm_source = COALESCE(EXCLUDED.utm_source, form_sessions.utm_source),
   utm_medium = COALESCE(EXCLUDED.utm_medium, form_sessions.utm_medium),
   utm_campaign = COALESCE(EXCLUDED.utm_campaign, form_sessions.utm_campaign),
   utm_term = COALESCE(EXCLUDED.utm_term, form_sessions.utm_term),
   utm_content = COALESCE(EXCLUDED.utm_content, form_sessions.utm_content),
   utm_id = COALESCE(EXCLUDED.utm_id, form_sessions.utm_id),
   updated_at = now()
 RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


-- 7. Create triggers


-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_form_sessions_timestamp
 BEFORE UPDATE ON public.form_sessions
 FOR EACH ROW
 EXECUTE FUNCTION public.update_timestamp();


-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.form_sessions TO anon;
GRANT ALL ON public.form_sessions TO authenticated;
GRANT ALL ON public.form_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_form_session(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_form_session(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_form_session(text, jsonb) TO service_role;

