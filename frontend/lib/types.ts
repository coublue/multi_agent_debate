export type ISODateTimeString = string;

export type DebateStatus = "pending" | "running" | "completed" | "failed";

export type DebateStage =
  | "moderator_opening"
  | "pro_opening"
  | "con_opening"
  | "pro_rebuttal"
  | "con_rebuttal"
  | "moderator_midpoint"
  | "pro_closing"
  | "con_closing"
  | "judge_report";

export type Winner = "pro" | "con" | "mixed";

export interface ArticleCreate {
  title: string;
  source?: string | null;
  content: string;
  user_question?: string | null;
}

export interface ArticleRead {
  id: number;
  title: string;
  source: string | null;
  content: string;
  user_question: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface ArticleListItem {
  id: number;
  title: string;
  source: string | null;
  created_at: ISODateTimeString;
}

export interface DebateCreate {
  article_id: number;
}

export interface ModeratorOpening {
  main_claim: string;
  debate_topic: string;
  key_points: string[];
  controversial_points: string[];
  rules: string[];
}

export interface ModeratorMidpoint {
  pro_summary: string;
  con_summary: string;
  key_disagreements: string[];
  unresolved_questions: string[];
  focus_for_closing: string;
}

export interface JudgeReport {
  main_claim: string;
  pro_strongest_points: string[];
  con_strongest_points: string[];
  key_disagreements: string[];
  winner: Winner;
  credibility_score: number;
  credible_parts: string[];
  questionable_parts: string[];
  follow_up_questions: string[];
  final_summary: string;
}

export interface AgentMessageRead {
  id: number;
  debate_id: number;
  agent_name: string;
  agent_role: string;
  round_index: number;
  stage: DebateStage;
  message_type: string;
  content: Record<string, unknown>;
  target_agent: string | null;
  created_at: ISODateTimeString;
}

export interface DebateRead {
  id: number;
  article_id: number;
  status: DebateStatus;
  main_claim: string | null;
  debate_topic: string | null;
  final_report: JudgeReport | null;
  winner: Winner | null;
  credibility_score: number | null;
  error_message: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface DebateDetailRead extends DebateRead {
  article: ArticleRead;
  messages: AgentMessageRead[];
}

export interface DebateListItem {
  id: number;
  article_id: number;
  title: string;
  status: DebateStatus;
  winner: Winner | null;
  credibility_score: number | null;
  created_at: ISODateTimeString;
}

export interface HealthCheckRead {
  status: string;
  app: string;
  version: string;
}
