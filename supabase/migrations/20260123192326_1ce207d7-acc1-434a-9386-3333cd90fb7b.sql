-- Add new columns to issues table for enhanced Jira import
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS original_estimate numeric,
ADD COLUMN IF NOT EXISTS time_spent numeric,
ADD COLUMN IF NOT EXISTS parent_key text;