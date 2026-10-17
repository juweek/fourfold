import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function setupDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    console.log("🔧 Setting up Fourfold database schema...");

    await pool.query(`
      create extension if not exists pgcrypto;

      create table if not exists settings (
        id int primary key default 1 check (id = 1),
        recipient_email text not null default 'hello@juweek.studio',
        outreach_sender_email text not null default 'hello@juweek.studio',
        send_time time not null default '07:00',
        timezone text not null default 'America/New_York',
        auto_send boolean not null default true,
        last_send_status text,
        last_sent_at timestamptz,
        last_sent_date date
      );

      insert into settings (id) values (1) on conflict (id) do nothing;

      create table if not exists templates (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        domain text not null check (domain in ('work','gourmet','body','finance','life')),
        difficulty text not null check (difficulty in ('easy','medium','hard')),
        importance text not null check (importance in ('low','medium','high')),
        recurrence text not null default 'none',
        created_at timestamptz not null default now()
      );

      create table if not exists contacts (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        email text,
        note text,
        domain text not null default 'work' check (domain in ('work','gourmet','body','finance','life')),
        created_at timestamptz not null default now()
      );

      create table if not exists tasks (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        domain text not null check (domain in ('work','gourmet','body','finance','life')),
        difficulty text not null check (difficulty in ('easy','medium','hard')),
        importance text not null check (importance in ('low','medium','high')),
        points int not null,
        task_date date not null,
        original_task_date date not null,
        rollover_count int not null default 0,
        is_bonus boolean not null default false,
        completed_at timestamptz,
        archived_at timestamptz,
        template_id uuid references templates(id) on delete set null,
        contact_id uuid references contacts(id) on delete set null,
        action_type text check (action_type is null or action_type in ('reach')),
        created_at timestamptz not null default now()
      );

      create index if not exists tasks_date_idx on tasks(task_date);
      create index if not exists tasks_open_rollover_idx on tasks(task_date) where completed_at is null;
      create index if not exists tasks_archive_idx on tasks(completed_at) where completed_at is not null and archived_at is null;

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

      create index if not exists task_action_events_task_idx on task_action_events(task_id, created_at desc);
    `);

    console.log("✅ Database schema setup complete!");
    console.log("✅ All tables and indexes created (or already existed)");
    
    await pool.end();
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
