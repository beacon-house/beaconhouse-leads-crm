@@ .. @@
-- CRM Leads table policies
-CREATE POLICY "Counselors can view leads based on role"
+CREATE POLICY "All counselors can view all leads"
 ON public.crm_leads FOR SELECT
 TO authenticated
 USING (
  EXISTS (
    SELECT 1 FROM public.counselors c
    WHERE c.id = auth.uid()
    AND c.is_active = true
-   AND (
-     c.role IN ('admin', 'senior_counselor')
-     OR (c.role = 'junior_counselor' AND crm_leads.assigned_to = c.id)
-   )
  )
 );