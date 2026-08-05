export type Domain = "work" | "gourmet" | "body" | "finance";
export type Difficulty = "easy" | "medium" | "hard";
export type Importance = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  domain: Domain;
  difficulty: Difficulty;
  importance: Importance;
  points: number;
  task_date: string;
  is_bonus: boolean;
  completed_at: string | null;
  template_id?: string | null;
  contact_id?: string | null;
  created_at: string;
};

export type Settings = {
  id: number;
  recipient_email: string;
  send_time: string;
  timezone: string;
  auto_send: boolean;
  last_send_status: string | null;
  last_sent_at: string | null;
  last_sent_date: string | null;
};

export type Template = {
  id: string;
  title: string;
  domain: Domain;
  difficulty: Difficulty;
  importance: Importance;
  recurrence: string;
  created_at: string;
};

export type Contact = {
  id: string;
  name: string;
  note: string | null;
  domain: Domain;
  created_at: string;
  last_reached?: string | null;
};

export type Score = {
  plannedPoints: number;
  earnedPlannedPoints: number;
  earnedBonusPoints: number;
  base: number;
  bonus: number;
  total: number | null;
};

export type DomainProgress = {
  domain: Domain;
  xp: number;
  level: number;
  tier: 1 | 2 | 3;
  levelStartXp: number;
  nextLevelXp: number;
  todayXp: number;
  weekXp: number;
  paceXp: number;
};
