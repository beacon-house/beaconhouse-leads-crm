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