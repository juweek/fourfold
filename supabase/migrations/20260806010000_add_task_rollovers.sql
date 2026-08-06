alter table tasks
  add column if not exists original_task_date date;

update tasks
set original_task_date = task_date
where original_task_date is null;

alter table tasks
  alter column original_task_date set not null;

alter table tasks
  add column if not exists rollover_count int not null default 0,
  add column if not exists archived_at timestamptz;

create index if not exists tasks_open_rollover_idx
  on tasks(task_date)
  where completed_at is null;

create index if not exists tasks_archive_idx
  on tasks(completed_at)
  where completed_at is not null and archived_at is null;
