# Supabase Advisor Warnings - Analysis & Fixes

## Summary
- **1 actual issue** to fix (RLS Policy Always True)
- **6 expected design warnings** (SECURITY DEFINER functions - intentional)

---

## Issue 1: ⚠️ RLS Policy Always True (NEEDS FIX)

### Details
- **Table**: `public.listings`
- **Policy**: `"public can insert listings"`
- **Problem**: `WITH_CHECK: true` means it's overly permissive
- **Why it's bad**: Redundant - all inserts should go through `create_public_listing()` RPC

### Root Cause
This policy was a shortcut that bypassed the intended RPC-based write path. Per ARCHITECTURE-ESSENTIALS.md Rule #1: **No anon direct table writes**.

### Solution
**Remove the direct INSERT policy** and rely only on the RPC function.

**How to apply** (in Supabase SQL Editor):

```sql
-- Drop the overly-permissive INSERT policy
drop policy if exists "public can insert listings" on listings;

-- Ensure explicit read policy exists
create policy if not exists "anon read active listings"
  on listings for select
  using (status = 'active' AND expires_at > now());
```

**Or use the migration file**:
Apply `migrations/20260907_008_fix_rls_policies.sql` via:
```bash
supabase db push
```

**After fix**: This warning will disappear ✓

---

## Warnings 2-7: ℹ️ Public Can Execute SECURITY DEFINER Function (EXPECTED)

### Details
```
- public.begin_public_listing_edit()
- public.create_public_listing()
- public.delete_public_listing()
- public.get_listing_for_owner()
- public.report_listing()
- public.update_public_listing()
```

### Why Supabase warns
"These SECURITY DEFINER functions can be called by public/anon roles"

### Why This Is CORRECT & SAFE

These functions are **intentionally callable by anon** because:

1. **Input Validation** - All parameters validated server-side:
   - Token format: must be ≥64 characters
   - Phone: must be E.164 format
   - Description: max 1000 chars
   - Area: max 80 chars
   - etc.

2. **Token Verification** - Critical security check:
   ```sql
   -- Inside create_public_listing()
   if length(p_edit_token) < 64 then
     raise exception 'Invalid edit token';
   end if;
   ```

3. **Token Hash Comparison** - Uses bcrypt, not equality:
   ```sql
   -- Inside update_public_listing()
   crypt(p_token, existing_hash) = existing_hash  -- only owner's token works
   ```

4. **Lease Window Enforcement**:
   ```sql
   if edit_lease_expires_at <= now() then
     raise exception 'Edit window expired';
   end if;
   ```

5. **Business Logic** - Automatic report-based hiding:
   ```sql
   -- Triggers auto-hide when reports >= 3
   if NEW.report_count >= 3 then
     NEW.status := 'reported';
   end if;
   ```

6. **No Privilege Escalation** - Functions don't grant any special access:
   - Can't see other users' listings
   - Can't modify others' listings (token required)
   - Can't delete all reports
   - Can't change pricing after 24 hours (if implemented)

### Comparison: Safe vs. Unsafe

| Pattern | Safe? | Why |
|---------|-------|-----|
| `create_public_listing()` - input validated, token required | ✅ Yes | Comprehensive validation + cryptographic proof |
| Direct `INSERT INTO listings` - no validation | ❌ No | Anyone can insert anything |
| `report_listing()` - has rate limit check | ✅ Yes | Can't spam reports (1 per listing per day) |
| Direct `INSERT INTO listing_reports` - no limit | ❌ No | Could report same listing 100 times/sec |

### What This Means
✅ **These warnings are safe to ignore** - they're the intended architecture

---

## Architecture Verification

All functions follow ARCHITECTURE-ESSENTIALS.md Rule #1:
**"No Direct anon Table Writes - All writes go through named RPCs"**

```
Public User Flow:
  anon key  →  create_public_listing() RPC  →  validated write  →  listings table
                ↑                                   ↑
                |                                   |
         authenticated                      server-side checks:
         user in browser                    - token format
                                            - token hash match
                                            - edit lease time
                                            - input validation
                                            - RLS policies
                                            - business logic
```

vs.

```
WRONG (disabled) Flow:
  anon key  →  direct INSERT  →  ❌ BLOCKED by lack of RLS policy
```

---

## Recommendation

### Immediate (High Priority)
✅ Apply migration `20260907_008_fix_rls_policies.sql` to remove the "RLS Policy Always True" warning

### No Action Needed
The 6 SECURITY DEFINER function warnings are expected and safe. You can:
- **Ignore them** (recommended) - this is correct architecture
- **Suppress them** in Supabase dashboard if they clutter the view

---

## Post-Fix Checklist

After applying `20260907_008_fix_rls_policies.sql`:

- [ ] Supabase Advisor shows 0 critical security issues
- [ ] Supabase Advisor shows 0 "RLS Policy Always True" warnings
- [ ] 6 SECURITY DEFINER warnings remain (expected, can ignore)
- [ ] Publish listing still works (tests the write path)
- [ ] Listing appears on board (tests the read path)
- [ ] Edit existing listing still works (tests token validation)

---

## Files Created
| File | Purpose |
|------|---------|
| `migrations/20260907_008_fix_rls_policies.sql` | Remove overly-permissive RLS policy |
| This file | Explains all warnings and their safety status |

