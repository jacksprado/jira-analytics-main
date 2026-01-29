-- Tabela: versions (gestão de versões do Jira)
CREATE TABLE public.versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  system TEXT,
  status TEXT,
  start_date DATE,
  release_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: issues (issues do Jira)
CREATE TABLE public.issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_key TEXT UNIQUE NOT NULL,
  summary TEXT,
  issue_type TEXT,
  status TEXT,
  project TEXT,
  system TEXT,
  fix_version TEXT,
  created_date DATE,
  resolved_date DATE,
  lead_time_days INTEGER,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: imports (histórico de importações)
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_rows INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- Policies para versions (apenas usuários autenticados podem ler)
CREATE POLICY "Authenticated users can view versions" 
ON public.versions FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert versions" 
ON public.versions FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update versions" 
ON public.versions FOR UPDATE 
TO authenticated
USING (true);

-- Policies para issues (apenas usuários autenticados podem ler)
CREATE POLICY "Authenticated users can view issues" 
ON public.issues FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert issues" 
ON public.issues FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update issues" 
ON public.issues FOR UPDATE 
TO authenticated
USING (true);

-- Policies para imports (apenas usuários autenticados podem ler)
CREATE POLICY "Authenticated users can view imports" 
ON public.imports FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert imports" 
ON public.imports FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_versions_updated_at
BEFORE UPDATE ON public.versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();