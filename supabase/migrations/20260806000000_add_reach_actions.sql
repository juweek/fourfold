alter table settings
  add column if not exists outreach_sender_email text not null default 'onboarding@resend.dev';

alter table contacts
  add column if not exists email text;

alter table tasks
  add column if not exists action_type text;

alter table tasks
  drop constraint if exists tasks_action_type_check;

alter table tasks
  add constraint tasks_action_type_check
  check (action_type is null or action_type in ('reach'));

create table if not exists task_action_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  action_type text not null check (action_type in ('reach')),
  status text not null check (status in ('sent')),
  provider_id text,
  recipient_email text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique(task_id, action_type)
);

create index if not exists task_action_events_task_idx
  on task_action_events(task_id, created_at desc);

create unique index if not exists task_action_events_once_idx
  on task_action_events(task_id, action_type);

update tasks
set action_type = 'reach'
where lower(trim(title)) = 'reach out to potential clients'
  and action_type is null;
