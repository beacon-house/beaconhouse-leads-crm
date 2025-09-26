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