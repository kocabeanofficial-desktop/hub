-- Add soft-delete/archive fields for enquiries.
-- Existing active enquiry views filter intake_submissions where deleted_at is null.

alter table public.intake_submissions
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

create index if not exists idx_intake_submissions_active_enquiries
  on public.intake_submissions (created_at desc)
  where deleted_at is null;

comment on column public.intake_submissions.deleted_at is
  'Soft-delete/archive timestamp for hiding enquiries from active admin lists.';

comment on column public.intake_submissions.deleted_by is
  'Admin user id that archived the enquiry, when available.';
