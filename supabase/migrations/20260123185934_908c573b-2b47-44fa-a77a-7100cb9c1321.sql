-- Drop existing policies and recreate for public (anon) access

-- Issues table policies
DROP POLICY IF EXISTS "Allow authenticated users to view issues" ON public.issues;
DROP POLICY IF EXISTS "Allow authenticated users to insert issues" ON public.issues;
DROP POLICY IF EXISTS "Allow authenticated users to update issues" ON public.issues;

CREATE POLICY "Allow public to view issues"
ON public.issues FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public to insert issues"
ON public.issues FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public to update issues"
ON public.issues FOR UPDATE
TO anon, authenticated
USING (true);

-- Versions table policies
DROP POLICY IF EXISTS "Allow authenticated users to view versions" ON public.versions;
DROP POLICY IF EXISTS "Allow authenticated users to insert versions" ON public.versions;
DROP POLICY IF EXISTS "Allow authenticated users to update versions" ON public.versions;

CREATE POLICY "Allow public to view versions"
ON public.versions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public to insert versions"
ON public.versions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public to update versions"
ON public.versions FOR UPDATE
TO anon, authenticated
USING (true);

-- Imports table policies
DROP POLICY IF EXISTS "Allow authenticated users to view imports" ON public.imports;
DROP POLICY IF EXISTS "Allow authenticated users to insert imports" ON public.imports;

CREATE POLICY "Allow public to view imports"
ON public.imports FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public to insert imports"
ON public.imports FOR INSERT
TO anon, authenticated
WITH CHECK (true);