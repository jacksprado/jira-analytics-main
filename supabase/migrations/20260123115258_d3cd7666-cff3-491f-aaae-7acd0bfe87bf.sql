-- Drop existing restrictive policies and recreate as permissive

-- Issues table policies
DROP POLICY IF EXISTS "Authenticated users can view issues" ON public.issues;
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON public.issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON public.issues;

CREATE POLICY "Allow authenticated users to view issues"
ON public.issues FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert issues"
ON public.issues FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update issues"
ON public.issues FOR UPDATE
TO authenticated
USING (true);

-- Versions table policies
DROP POLICY IF EXISTS "Authenticated users can view versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can insert versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can update versions" ON public.versions;

CREATE POLICY "Allow authenticated users to view versions"
ON public.versions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert versions"
ON public.versions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update versions"
ON public.versions FOR UPDATE
TO authenticated
USING (true);

-- Imports table policies
DROP POLICY IF EXISTS "Authenticated users can view imports" ON public.imports;
DROP POLICY IF EXISTS "Authenticated users can insert imports" ON public.imports;

CREATE POLICY "Allow authenticated users to view imports"
ON public.imports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert imports"
ON public.imports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);