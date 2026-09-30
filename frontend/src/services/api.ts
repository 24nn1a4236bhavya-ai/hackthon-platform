import axios from 'axios';
import {
  AuthResponse, User, Hackathon, HackathonDetail, HackathonTrack, HackathonPrize, HackathonStats,
  Team, Project, ProjectDetail, Rubric, JudgeAssignment,
  Evaluation, LeaderboardResponse, UserPublic
} from '../types';

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Bearer Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for 401 Unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username_or_email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { 
      username_or_email,
      email: username_or_email,
      username: username_or_email,
      password 
    });
    return res.data;
  },
  register: async (data: { email: string; username: string; password: string; full_name: string; role?: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  updateProfile: async (data: any): Promise<User> => {
    const res = await api.patch<User>('/users/me', data);
    return res.data;
  },
};

export const hackathonsApi = {
  list: async (status?: string, search?: string): Promise<Hackathon[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const res = await api.get<Hackathon[]>('/hackathons', { params });
    return res.data;
  },
  get: async (idOrSlug: string | number): Promise<HackathonDetail> => {
    const res = await api.get<HackathonDetail>(`/hackathons/${idOrSlug}`);
    return res.data;
  },
  create: async (data: any): Promise<Hackathon> => {
    const res = await api.post<Hackathon>('/hackathons', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Hackathon> => {
    const res = await api.patch<Hackathon>(`/hackathons/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/hackathons/${id}`);
  },
  getStats: async (id: number): Promise<HackathonStats> => {
    const res = await api.get<HackathonStats>(`/hackathons/${id}/stats`);
    return res.data;
  },
  register: async (id: number): Promise<any> => {
    const res = await api.post(`/hackathons/${id}/register`);
    return res.data;
  },
  unregister: async (id: number): Promise<void> => {
    await api.delete(`/hackathons/${id}/register`);
  },
  // Tracks
  listTracks: async (hackathonId: number): Promise<HackathonTrack[]> => {
    const res = await api.get<HackathonTrack[]>(`/hackathons/${hackathonId}/tracks`);
    return res.data;
  },
  addTrack: async (hackathonId: number, data: { name: string; description: string; is_active?: boolean }): Promise<HackathonTrack> => {
    const res = await api.post<HackathonTrack>(`/hackathons/${hackathonId}/tracks`, data);
    return res.data;
  },
  updateTrack: async (hackathonId: number, trackId: number, data: any): Promise<HackathonTrack> => {
    const res = await api.put<HackathonTrack>(`/hackathons/${hackathonId}/tracks/${trackId}`, data);
    return res.data;
  },
  deleteTrack: async (hackathonId: number, trackId: number): Promise<void> => {
    await api.delete(`/hackathons/${hackathonId}/tracks/${trackId}`);
  },
  // Prizes
  listPrizes: async (hackathonId: number): Promise<HackathonPrize[]> => {
    const res = await api.get<HackathonPrize[]>(`/hackathons/${hackathonId}/prizes`);
    return res.data;
  },
  addPrize: async (hackathonId: number, data: { title: string; amount?: string; description?: string }): Promise<HackathonPrize> => {
    const res = await api.post<HackathonPrize>(`/hackathons/${hackathonId}/prizes`, data);
    return res.data;
  },
  updatePrize: async (hackathonId: number, prizeId: number, data: any): Promise<HackathonPrize> => {
    const res = await api.put<HackathonPrize>(`/hackathons/${hackathonId}/prizes/${prizeId}`, data);
    return res.data;
  },
  deletePrize: async (hackathonId: number, prizeId: number): Promise<void> => {
    await api.delete(`/hackathons/${hackathonId}/prizes/${prizeId}`);
  },
  // Judges
  listJudges: async (hackathonId: number): Promise<UserPublic[]> => {
    const res = await api.get<UserPublic[]>(`/hackathons/${hackathonId}/judges`);
    return res.data;
  },
  inviteJudge: async (hackathonId: number, data: { email: string; name?: string }): Promise<UserPublic> => {
    const res = await api.post<UserPublic>(`/hackathons/${hackathonId}/judges`, data);
    return res.data;
  },
  // CSV Import
  importParticipantsCsv: async (hackathonId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/hackathons/${hackathonId}/import/participants`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const teamsApi = {
  create: async (hackathon_id: number, name: string, description?: string): Promise<Team> => {
    const res = await api.post<Team>('/teams', { hackathon_id, name, description });
    return res.data;
  },
  get: async (id: number): Promise<Team> => {
    const res = await api.get<Team>(`/teams/${id}`);
    return res.data;
  },
  join: async (invite_code: string): Promise<Team> => {
    const res = await api.post<Team>('/teams/join', { invite_code });
    return res.data;
  },
  leave: async (teamId: number): Promise<void> => {
    await api.post(`/teams/${teamId}/leave`);
  },
  removeMember: async (teamId: number, userId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },
  getMyTeam: async (hackathonId: number): Promise<Team | null> => {
    const res = await api.get<Team | null>(`/teams/my-team/${hackathonId}`);
    return res.data;
  },
};

export const projectsApi = {
  list: async (params?: { hackathon_id?: number; track_id?: number; status?: string; search?: string }): Promise<Project[]> => {
    const res = await api.get<Project[]>('/projects', { params });
    return res.data;
  },
  get: async (id: number): Promise<ProjectDetail> => {
    const res = await api.get<ProjectDetail>(`/projects/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Project> => {
    const res = await api.post<Project>('/projects', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Project> => {
    const res = await api.patch<Project>(`/projects/${id}`, data);
    return res.data;
  },
  submit: async (id: number): Promise<Project> => {
    const res = await api.post<Project>(`/projects/${id}/submit`);
    return res.data;
  },
};

export const rubricsApi = {
  list: async (hackathonId: number): Promise<Rubric[]> => {
    const res = await api.get<Rubric[]>('/rubrics', { params: { hackathon_id: hackathonId } });
    return res.data;
  },
  create: async (data: any): Promise<Rubric> => {
    const res = await api.post<Rubric>('/rubrics', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Rubric> => {
    const res = await api.put<Rubric>(`/rubrics/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/rubrics/${id}`);
  },
};

export const judgingApi = {
  getAssignments: async (hackathonId?: number): Promise<JudgeAssignment[]> => {
    const res = await api.get<JudgeAssignment[]>('/judging/assignments', {
      params: hackathonId ? { hackathon_id: hackathonId } : undefined,
    });
    return res.data;
  },
  createAssignment: async (hackathon_id: number, judge_id: number, project_id: number): Promise<JudgeAssignment> => {
    const res = await api.post<JudgeAssignment>('/judging/assignments', { hackathon_id, judge_id, project_id });
    return res.data;
  },
  autoAssign: async (hackathon_id: number, judges_per_project = 3, prevent_conflict_of_interest = true): Promise<any> => {
    const res = await api.post('/judging/auto-assign', {
      hackathon_id,
      judges_per_project,
      prevent_conflict_of_interest,
    });
    return res.data;
  },
  getEvaluations: async (hackathonId: number, projectId?: number): Promise<Evaluation[]> => {
    const res = await api.get<Evaluation[]>('/judging/evaluations', {
      params: { hackathon_id: hackathonId, project_id: projectId },
    });
    return res.data;
  },
  submitEvaluation: async (data: {
    hackathon_id: number;
    project_id: number;
    scores: { criterion_id: number; score: number }[];
    private_notes?: string;
    public_feedback?: string;
  }): Promise<Evaluation> => {
    const res = await api.post<Evaluation>('/judging/evaluations', data);
    return res.data;
  },
  updateEvaluation: async (id: number, data: any): Promise<Evaluation> => {
    const res = await api.put<Evaluation>(`/judging/evaluations/${id}`, data);
    return res.data;
  },
  getLeaderboard: async (hackathonId: number): Promise<LeaderboardResponse> => {
    const res = await api.get<LeaderboardResponse>(`/judging/leaderboard/${hackathonId}`);
    return res.data;
  },
};

export const votesApi = {
  castVote: async (hackathon_id: number, project_id: number): Promise<any> => {
    const res = await api.post('/votes', { hackathon_id, project_id });
    return res.data;
  },
  retractVote: async (project_id: number): Promise<any> => {
    const res = await api.delete(`/votes/${project_id}`);
    return res.data;
  },
  getVoteStatus: async (project_id: number): Promise<{ has_voted: boolean; total_votes: number }> => {
    const res = await api.get(`/votes/${project_id}/status`);
    return res.data;
  },
};

export const adminApi = {
  getStats: async (): Promise<any> => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/admin/users');
    return res.data;
  },
  updateRole: async (userId: number, role: string): Promise<User> => {
    const res = await api.patch<User>(`/admin/users/${userId}/role`, null, { params: { role } });
    return res.data;
  },
};

export const exportsApi = {
  getLeaderboardCsvUrl: (hackathonId: number) => `${API_BASE}/exports/${hackathonId}/leaderboard.csv`,
  getLeaderboardJsonUrl: (hackathonId: number) => `${API_BASE}/exports/${hackathonId}/leaderboard.json`,
  getProjectsCsvUrl: (hackathonId: number) => `${API_BASE}/exports/${hackathonId}/projects.csv`,
  getParticipantsCsvUrl: (hackathonId: number) => `${API_BASE}/exports/${hackathonId}/participants.csv`,
  getEvaluationsCsvUrl: (hackathonId: number) => `${API_BASE}/exports/${hackathonId}/evaluations.csv`,
};

export const prizesApi = {
  list: hackathonsApi.listPrizes,
  create: hackathonsApi.addPrize,
  update: hackathonsApi.updatePrize,
  delete: hackathonsApi.deletePrize,
};

export const judgesApi = {
  list: hackathonsApi.listJudges,
  invite: hackathonsApi.inviteJudge,
};

export const importApi = {
  importParticipants: hackathonsApi.importParticipantsCsv,
};
