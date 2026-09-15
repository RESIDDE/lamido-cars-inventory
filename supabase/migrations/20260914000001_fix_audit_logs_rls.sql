-- Fix RLS policy on audit_logs so authenticated admin users can view logs without permission blocks

DROP POLICY IF EXISTS "Allow super admins to view logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow admins to view audit logs" ON public.audit_logs;

CREATE POLICY "Allow admins to view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
      )
    );
