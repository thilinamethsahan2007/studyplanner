-- ========================================================
-- Supabase Schema for Daily Nutrition & Calorie Tracking
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hfdtnbggsyyihaxkbmde/sql
-- ========================================================

-- 1. Daily Nutrition Logs
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    date DATE PRIMARY KEY,
    meals JSONB NOT NULL DEFAULT '{"breakfast":[],"lunch":[],"dinner":[],"snacks":[]}'::jsonb,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Nutrition Targets & Macro Split
CREATE TABLE IF NOT EXISTS public.nutrition_targets (
    id TEXT PRIMARY KEY DEFAULT 'default',
    daily_calories INTEGER NOT NULL DEFAULT 2200,
    protein_grams NUMERIC NOT NULL DEFAULT 155,
    carbs_grams NUMERIC NOT NULL DEFAULT 235,
    fat_grams NUMERIC NOT NULL DEFAULT 70,
    fiber_grams NUMERIC NOT NULL DEFAULT 30,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS) & Public Policies (Anon Access)
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to nutrition_logs" ON public.nutrition_logs;
CREATE POLICY "Allow all access to nutrition_logs" 
    ON public.nutrition_logs 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to nutrition_targets" ON public.nutrition_targets;
CREATE POLICY "Allow all access to nutrition_targets" 
    ON public.nutrition_targets 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
