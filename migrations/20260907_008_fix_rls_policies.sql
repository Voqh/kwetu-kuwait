-- Migration: 20260907_008_fix_rls_policies.sql
-- Fixes Supabase Advisor warning: removes overly-permissive RLS policy
-- Issue: "public can insert listings" policy with WITH_CHECK: true is redundant
-- Solution: Remove direct INSERT policy; enforce RPC-only writes via create_public_listing()

-- Drop the overly-permissive INSERT policy
-- The CREATE_PUBLIC_LISTING RPC is the intended write path for all listings
drop policy if exists "public can insert listings" on listings;

-- Explicit read policy: anon can only see active, non-expired listings
-- (this was already in place but making it explicit)
-- Note: CREATE POLICY does not support IF NOT EXISTS, so we drop first if needed
create policy "anon read active listings"
  on listings
  for select
  using (status = 'active' AND expires_at > now());

-- Note: All writes (INSERT/UPDATE/DELETE) go through SECURITY DEFINER functions:
-- - create_public_listing() - only way to insert
-- - update_public_listing() - only way to update own listing
-- - delete_public_listing() - only way to delete own listing
-- 
-- This ensures:
-- 1. Token validation (poster proof of ownership)
-- 2. Lease window checks (edit window not expired)
-- 3. Input validation (format, length, content)
-- 4. Business logic (auto-hide on 3 reports, etc.)
-- 5. Audit trail (all writes logged and traceable)
