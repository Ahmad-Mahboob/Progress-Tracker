import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Paste your Supabase values below.
const SUPABASE_URL = "https://qkjerjvgtxomyybgagqh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFramVyanZndHhvbXl5YmdhZ3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTQwMDgsImV4cCI6MjA4NzE5MDAwOH0.4qU0OY2wEsTkpApYaE1kWVGFh4F22k6W31KgrTZHKrQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
