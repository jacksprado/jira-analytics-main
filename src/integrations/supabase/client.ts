import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nijzbbpifliirihfjkgr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5panpiYnBpZmxpaXJpaGZqa2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDc5OTEsImV4cCI6MjA4NDY4Mzk5MX0.JrokXw8xR51zypTMLMDN6gJw3Se4q0oEkwKrDFPvUr0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
