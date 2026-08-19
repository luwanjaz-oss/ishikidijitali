import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fdqnykkjcuchmwtawgwa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkcW55a2tqY3VjaG13dGF3Z3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNjE4NDQsImV4cCI6MjEwMTgzNzg0NH0.69lzaX8Nl0i4jEHA2zODEF8l5Bo-UAeWont2Wn9YUqY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);