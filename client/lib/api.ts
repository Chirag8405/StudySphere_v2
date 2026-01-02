const API_BASE_URL = "/api";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  due_date: string;
  status: "pending" | "completed" | "missed";
  priority: "low" | "medium" | "high";
  days_until_due: number;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  lecture_id: string;
  lecture_name: string;
  subject: string;
  date: string;
  status: "present" | "absent" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Lecture {
  id: string;
  name: string;
  schedule_days: string[];
  schedule_time: string;
  attendance_percentage: number;
  total_classes: number;
  attended_classes: number;
  classes_to_75_percent: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  user: User;
  attendanceStats: {
    total_classes: number;
    attended_classes: number;
    absent_classes: number;
    cancelled_classes: number;
    attendance_percentage: number;
    classes_to_75_percent: number;
  };
  attendanceData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  weeklyAttendance: Array<{
    day: string;
    attended: number;
    total: number;
  }>;
  assignmentStats: {
    total: number;
    completed: number;
    pending: number;
    missed: number;
    overdue: number;
  };
  recentAssignments: Assignment[];
  totalLectures: number;
}

// API Service Class
export class ApiService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("studySphere_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Unknown server error",
        }));

        // Enhanced error messages based on status codes
        let errorMessage = errorData.error || `HTTP ${response.status}`;

        switch (response.status) {
          case 400:
            errorMessage = errorData.error || "Invalid request data";
            break;
          case 401:
            errorMessage = "Invalid credentials or session expired";
            break;
          case 403:
            errorMessage = "Access denied";
            break;
          case 404:
            errorMessage = "Resource not found";
            break;
          case 409:
            errorMessage = errorData.error || "Conflict with existing data";
            break;
          case 422:
            errorMessage = errorData.error || "Validation failed";
            break;
          case 500:
            errorMessage = "Server error. Please try again later";
            break;
          case 503:
            errorMessage = "Service unavailable. Please try again later";
            break;
          default:
            errorMessage =
              errorData.error || `Server error (${response.status})`;
        }

        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Unable to connect to server. Please check your internet connection.",
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  // Auth
  static async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Store token
    localStorage.setItem("studySphere_token", response.token);
    localStorage.setItem("studySphere_user", JSON.stringify(response.user));

    return response;
  }

  static async register(
    name: string,
    email: string,
    password: string,
  ): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    // Store token
    localStorage.setItem("studySphere_token", response.token);
    localStorage.setItem("studySphere_user", JSON.stringify(response.user));

    return response;
  }

  static async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>("/auth/profile");
  }

  static logout(): void {
    localStorage.removeItem("studySphere_token");
    localStorage.removeItem("studySphere_user");
  }

  // Dashboard
  static async getDashboardData(): Promise<DashboardData> {
    return this.request<DashboardData>("/dashboard");
  }

  // Lectures
  static async getLectures(): Promise<{ lectures: Lecture[] }> {
    return this.request<{ lectures: Lecture[] }>("/lectures");
  }

  static async createLecture(data: {
    name: string;
    schedule_days: string[];
    schedule_time: string;
  }): Promise<{ lecture: Lecture }> {
    return this.request<{ lecture: Lecture }>("/lectures", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updateLecture(
    id: string,
    data: Partial<{
      name: string;
      schedule_days: string[];
      schedule_time: string;
    }>,
  ): Promise<{ lecture: Lecture }> {
    return this.request<{ lecture: Lecture }>(`/lectures/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  static async deleteLecture(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/lectures/${id}`, {
      method: "DELETE",
    });
  }

  // Attendance
  static async getAttendance(
    lectureId?: string,
  ): Promise<{ attendance: AttendanceRecord[] }> {
    const query = lectureId ? `?lecture_id=${lectureId}` : "";
    return this.request<{ attendance: AttendanceRecord[] }>(
      `/attendance${query}`,
    );
  }

  static async createAttendance(data: {
    lecture_id: string;
    date: string;
    status: "present" | "absent" | "cancelled";
  }): Promise<{ attendance: AttendanceRecord }> {
    return this.request<{ attendance: AttendanceRecord }>("/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async markAttendance(
    id: string,
    status: "present" | "absent" | "cancelled",
  ): Promise<{ attendance: AttendanceRecord }> {
    return this.request<{ attendance: AttendanceRecord }>(`/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  static async deleteAttendance(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/attendance/${id}`, {
      method: "DELETE",
    });
  }

  // Assignments
  static async getAssignments(
    status?: "pending" | "completed" | "missed",
  ): Promise<{ assignments: Assignment[] }> {
    const query = status ? `?status=${status}` : "";
    return this.request<{ assignments: Assignment[] }>(`/assignments${query}`);
  }

  static async createAssignment(data: {
    title: string;
    subject: string;
    description?: string;
    due_date: string;
    priority?: "low" | "medium" | "high";
  }): Promise<{ assignment: Assignment }> {
    return this.request<{ assignment: Assignment }>("/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updateAssignment(
    id: string,
    data: Partial<{
      title: string;
      subject: string;
      description: string;
      due_date: string;
      status: "pending" | "completed" | "missed";
      priority: "low" | "medium" | "high";
    }>,
  ): Promise<{ assignment: Assignment }> {
    return this.request<{ assignment: Assignment }>(`/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  static async deleteAssignment(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/assignments/${id}`, {
      method: "DELETE",
    });
  }
  
  static async patchAssignmentStatus(
    id: string,
    status: "pending" | "completed" | "missed"
  ): Promise<{ assignment: Assignment }> {
    return this.request<{ assignment: Assignment }>(`/assignments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }
}
