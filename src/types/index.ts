export interface User {
  id: string;
  email: string;
  driver_name: string;
  team_name?: string;
  created_at: string;
}

export interface Car {
  id: string;
  name: string;
  class: string;
  slug: string;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  length_km: number;
  slug: string;
}

export interface LapTime {
  id: string;
  driver_id: string;
  car_id: string;
  track_id: string;
  lap_time_ms: number;
  lap_time_formatted: string;
  notes?: string;
  submitted_at: string;
  driver?: User;
  car?: Car;
  track?: Track;
}

export interface LeaderboardEntry {
  rank: number;
  driver_id: string;
  driver_name: string;
  team_name?: string;
  car_id: string;
  car_name: string;
  track_id: string;
  track_name: string;
  lap_time_ms: number;
  lap_time_formatted: string;
  gap_to_p1_ms: number;
  gap_to_p1_formatted: string;
  submitted_at: string;
  is_fastest: boolean;
}

export interface DashboardStats {
  total_drivers: number;
  total_laps: number;
  total_tracks: number;
  latest_submissions: LapTime[];
  top_drivers: { driver_name: string; team_name?: string; lap_count: number }[];
}
