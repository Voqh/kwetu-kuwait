-- Limits anonymous reports to one accepted report per listing per UTC day.
-- Supabase RPCs do not receive a trustworthy client IP, and storing IP data
-- would add the audit logging this project intentionally does not use.
create or replace function report_listing(p_listing_id uuid, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  report_threshold constant integer := 3;
  new_count integer;
begin
  perform 1 from listings where id = p_listing_id for update;
  if not found then
    raise exception 'Listing not found';
  end if;
  if char_length(coalesce(p_reason, '')) > 300 then
    raise exception 'Reason is too long';
  end if;
  if exists (
    select 1 from listing_reports
    where listing_id = p_listing_id
      and created_at >= date_trunc('day', now())
  ) then
    raise exception 'This listing has already received a report today';
  end if;

  insert into listing_reports (listing_id, reason)
  values (p_listing_id, nullif(btrim(coalesce(p_reason, '')), ''));

  update listings
  set report_count = report_count + 1
  where id = p_listing_id
  returning report_count into new_count;

  if new_count >= report_threshold then
    update listings set status = 'reported' where id = p_listing_id and status = 'active';
  end if;

  return new_count;
end;
$$;