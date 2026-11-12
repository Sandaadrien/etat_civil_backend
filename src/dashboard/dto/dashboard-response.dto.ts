export interface DashboardStats {
  dossiersToday: number;
  inProgress: number;
  submittedToRegistry: number;
  pendingSync: number;
}

export interface RecentEnrolment {
  id: string;
  reference: string;
  applicant: string;
  step: string;
  status: 'En cours' | 'Validé' | 'En attente' | 'Échec';
  createdAt: Date;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentEnrolments: RecentEnrolment[];
}
