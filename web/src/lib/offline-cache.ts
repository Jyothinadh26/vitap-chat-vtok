// Offline resilience cache for VIT-AP VTOP Assistant

const SESSION_CACHE_KEY = "vtop_offline_session_snapshot";
const EXAM_PASS_CACHE_KEY = "vtop_cached_exam_passes";

export interface CachedExamPass {
  course_code: string;
  course_title: string;
  exam_type: string;
  date: string;
  session: string;
  reporting_time: string;
  exam_time: string;
  academic_block: string;
  room_no: string;
  seat_no: string;
  seat_row: number;
  seat_col: number;
  total_rows: number;
  total_cols: number;
}

export function saveOfflineSession(sessionData: any): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        data: sessionData,
        cached_at: new Date().toISOString()
      }));
    }
  } catch (e) {
    console.warn("Failed to save offline session to localStorage", e);
  }
}

export function getOfflineSession(): any | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(SESSION_CACHE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn("Failed to read offline session from localStorage", e);
  }
  return null;
}

export function saveExamPassOffline(exams: CachedExamPass[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(EXAM_PASS_CACHE_KEY, JSON.stringify(exams));
    }
  } catch (e) {
    console.warn("Failed to cache exam pass", e);
  }
}

export function getOfflineExamPasses(): CachedExamPass[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(EXAM_PASS_CACHE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn("Failed to read cached exam passes", e);
  }
  return [];
}

// User Profile Saved Credentials Cache
const CREDENTIALS_CACHE_KEY = "vtop_userprofile_credentials";

export interface UserProfileCredentials {
  username: string;
  password?: string;
  saved_at: string;
  student_name?: string;
}

export function saveUserProfileCredentials(credentials: UserProfileCredentials): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(CREDENTIALS_CACHE_KEY, JSON.stringify(credentials));
    }
  } catch (e) {
    console.warn("Failed to save credentials in userprofile", e);
  }
}

export function getUserProfileCredentials(): UserProfileCredentials | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(CREDENTIALS_CACHE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn("Failed to get credentials from userprofile", e);
  }
  return null;
}

export function clearUserProfileCredentials(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(CREDENTIALS_CACHE_KEY);
    }
  } catch (e) {
    console.warn("Failed to clear credentials from userprofile", e);
  }
}
