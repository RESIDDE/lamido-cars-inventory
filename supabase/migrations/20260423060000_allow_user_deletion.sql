-- Migration: Enable PERMANENT user deletion (Auth + Database records)

-- 1. Create a secure function to delete users from Supabase Auth
-- This function MUST be run in the Supabase SQL Editor to have proper permissions.
CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Security check: Only allow if the executor is a admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can delete users permanently.';
  END IF;

  -- Delete from auth.users. 
  -- Because of 'ON DELETE CASCADE' in our table definitions, 
  -- this will automatically remove their 'profiles' and 'user_roles' records.
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

-- 2. Grant access to the function
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(uuid) TO authenticated;

-- 3. Keep RLS policies as a fallback
CREATE POLICY "Super Admins can delete user roles" ON public.user_roles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Super Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
