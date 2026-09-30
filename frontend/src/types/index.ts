export type UserRole = 'PARTICIPANT' | 'JUDGE' | 'ORGANIZER' | 'ADMIN';

export type HackathonStatus =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'SUBMISSION_OPEN'
  | 'JUDGING'
  | 'VOTING'
  | 'COMPLETED';

export type RegistrationStatus = 'REGISTERED' | 'CHECKED_IN' | 'WITHDRAWN';
export type TeamRole = 'LEADER' | 'MEMBER';
export type ProjectStatus = 'DRAFT' | 'SUBMITTED';
export type AssignmentStatus = 'PENDING' | 'COMPLETED';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  bio?: string;
  avatar_url?: string;
  institution?: string;
  organization?: string;
  skills?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  institution?: string;
  organization?: string;
  skills?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}

export interface HackathonTrack {
  id: number;
  hackathon_id: number;
  name: string;
  description: string;
  is_active?: boolean;
}

export interface HackathonPrize {
  id: number;
  hackathon_id: number;
  title: string;
  amount?: string;
  reward_amount?: string;
  description?: string;
  place?: number;
  track_id?: number | null;
}

export interface JudgeDetail extends UserPublic {
  assigned_count?: number;
}

export interface Hackathon {
  id: number;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  banner_url?: string;
  rules?: string;
  contact_email?: string;
  website_url?: string;
  status: HackathonStatus;
  event_start?: string;
  event_end?: string;
  registration_start: string;
  registration_deadline: string;
  submission_deadline: string;
  judging_deadline: string;
  result_publication_date?: string;
  required_fields?: string;
  created_by_id: number;
  is_community_voting_enabled: boolean;
  min_team_size: number;
  max_team_size: number;
  created_at: string;
  updated_at: string;
}

export interface HackathonDetail extends Hackathon {
  creator: UserPublic;
  tracks: HackathonTrack[];
  prizes: HackathonPrize[];
  registrations_count: number;
  teams_count: number;
  projects_count: number;
  is_user_registered: boolean;
  user_team_id?: number | null;
}

export interface HackathonStats {
  hackathon_id: number;
  total_participants: number;
  total_registrations?: number;
  total_teams: number;
  total_projects: number;
  submitted_projects: number;
  draft_projects: number;
  total_judges: number;
  total_assignments: number;
  completed_assignments: number;
  completed_evaluations?: number;
  pending_assignments: number;
  total_votes: number;
  evaluation_completion_rate?: number;
}

export interface TeamMember {
  id: number;
  user_id: number;
  role: TeamRole;
  joined_at: string;
  user: UserPublic;
}

export interface Team {
  id: number;
  hackathon_id: number;
  name: string;
  description?: string;
  invite_code: string;
  leader_id: number;
  created_at: string;
  leader: UserPublic;
  members: TeamMember[];
  has_project: boolean;
  project_id?: number | null;
}

export interface Project {
  id: number;
  hackathon_id: number;
  team_id: number;
  track_id?: number | null;
  title: string;
  tagline: string;
  description: string;
  demo_url?: string;
  repo_url?: string;
  video_url?: string;
  presentation_url?: string;
  tech_stack?: string;
  cover_image_url?: string;
  additional_info?: string;
  status: ProjectStatus;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  track?: HackathonTrack | null;
  team?: {
    id: number;
    name: string;
    leader: UserPublic;
    members_count: number;
  } | null;
  vote_count: number;
  has_user_voted: boolean;
  average_score?: number | null;
}

export interface RubricCriterion {
  id: number;
  rubric_id: number;
  title: string;
  description: string;
  max_points: number;
  weight: number;
}

export interface Rubric {
  id: number;
  hackathon_id: number;
  name: string;
  description?: string;
  criteria: RubricCriterion[];
}

export interface CriterionScore {
  id: number;
  criterion_id: number;
  score: number;
  criterion?: RubricCriterion;
}

export interface JudgeAssignment {
  id: number;
  hackathon_id: number;
  judge_id: number;
  project_id: number;
  status: AssignmentStatus;
  assigned_at: string;
  project?: Project;
  judge?: UserPublic;
}

export interface Evaluation {
  id: number;
  hackathon_id: number;
  project_id: number;
  judge_id: number;
  private_notes?: string;
  public_feedback?: string;
  total_raw_score: number;
  submitted_at: string;
  updated_at: string;
  judge?: UserPublic;
  criterion_scores: CriterionScore[];
}

export interface ProjectLeaderboardItem {
  rank: number;
  project_id: number;
  project_title: string;
  team_name: string;
  track_name?: string | null;
  evaluations_count: number;
  raw_average_score: number;
  normalized_score: number;
  trimmed_score: number;
  community_votes: number;
}

export interface LeaderboardResponse {
  hackathon_id: number;
  hackathon_title: string;
  status: string;
  is_published: boolean;
  total_projects: number;
  total_evaluations: number;
  rankings: ProjectLeaderboardItem[];
}
