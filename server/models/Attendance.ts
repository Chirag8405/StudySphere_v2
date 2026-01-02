import { getDatabase } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";

export type AttendanceStatus = "present" | "absent" | "cancelled";

export interface Attendance {
  id: string;
  lecture_id: string;
  user_id: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateAttendanceData {
  lecture_id: string;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceResponse {
  id: string;
  lecture_id: string;
  lecture_name: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendanceStatsResponse {
  total_classes: number;
  attended_classes: number;
  absent_classes: number;
  cancelled_classes: number;
  attendance_percentage: number;
}

export class AttendanceModel {
  static async create(
    userId: string,
    attendanceData: CreateAttendanceData,
  ): Promise<AttendanceResponse> {
    const db = await getDatabase();
    const id = uuidv4();

    // Verify that the lecture belongs to the user
    const lecture = await db.get(
      `SELECT id FROM lectures WHERE id = ? AND user_id = ?`,
      [attendanceData.lecture_id, userId],
    );

    if (!lecture) {
      throw new Error("Lecture not found or access denied");
    }

    // Check if attendance already exists for this lecture and date
    const existing = await db.get(
      `SELECT id FROM attendance WHERE lecture_id = ? AND date = ?`,
      [attendanceData.lecture_id, attendanceData.date],
    );

    if (existing) {
      throw new Error("Attendance already marked for this date");
    }

    await db.run(
      `INSERT INTO attendance (id, lecture_id, user_id, date, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        attendanceData.lecture_id,
        userId,
        attendanceData.date,
        attendanceData.status,
      ],
    );

    const attendance = await this.findById(id, userId);
    if (!attendance) {
      throw new Error("Failed to create attendance record");
    }

    return attendance;
  }

  static async findById(
    attendanceId: string,
    userId: string,
  ): Promise<AttendanceResponse | undefined> {
    const db = await getDatabase();
    const attendance = await db.get<AttendanceResponse>(
      `SELECT a.*, l.name as lecture_name
       FROM attendance a
       JOIN lectures l ON a.lecture_id = l.id
       WHERE a.id = ? AND a.user_id = ?`,
      [attendanceId, userId],
    );

    return attendance;
  }

  static async findByLectureId(
    lectureId: string,
    userId: string,
  ): Promise<AttendanceResponse[]> {
    const db = await getDatabase();
    const attendance = await db.all<AttendanceResponse[]>(
      `SELECT a.*, l.name as lecture_name
       FROM attendance a
       JOIN lectures l ON a.lecture_id = l.id
       WHERE a.lecture_id = ? AND a.user_id = ?
       ORDER BY a.date DESC`,
      [lectureId, userId],
    );

    return attendance;
  }

  static async findByUserId(userId: string): Promise<AttendanceResponse[]> {
    const db = await getDatabase();
    const attendance = await db.all<AttendanceResponse[]>(
      `SELECT a.*, l.name as lecture_name
       FROM attendance a
       JOIN lectures l ON a.lecture_id = l.id
       WHERE a.user_id = ?
       ORDER BY a.date DESC`,
      [userId],
    );

    return attendance;
  }

  static async update(
    attendanceId: string,
    userId: string,
    status: AttendanceStatus,
  ): Promise<AttendanceResponse | undefined> {
    const db = await getDatabase();

    await db.run(
      `UPDATE attendance 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [status, attendanceId, userId],
    );

    return await this.findById(attendanceId, userId);
  }

  static async delete(attendanceId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run(
      `DELETE FROM attendance WHERE id = ? AND user_id = ?`,
      [attendanceId, userId],
    );

    return (result.changes ?? 0) > 0;
  }

  static async getStats(userId: string): Promise<AttendanceStatsResponse> {
    const db = await getDatabase();
    const stats = await db.get<{
      total: number;
      present: number;
      absent: number;
      cancelled: number;
    }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM attendance a
       JOIN lectures l ON a.lecture_id = l.id
       WHERE a.user_id = ?`,
      [userId],
    );

    const total = stats?.total || 0;
    const present = stats?.present || 0;
    const absent = stats?.absent || 0;
    const cancelled = stats?.cancelled || 0;
    const attendancePercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total_classes: total,
      attended_classes: present,
      absent_classes: absent,
      cancelled_classes: cancelled,
      attendance_percentage: attendancePercentage,
    };
  }

  static async getWeeklyStats(
    userId: string,
  ): Promise<Array<{ day: string; attended: number; total: number }>> {
    const db = await getDatabase();

    // Get the last 7 days
    const weeklyStats = await db.all<
      Array<{ day: string; attended: number; total: number }>
    >(
      `SELECT 
         strftime('%w', a.date) as day_num,
         CASE strftime('%w', a.date)
           WHEN '0' THEN 'Sun'
           WHEN '1' THEN 'Mon'
           WHEN '2' THEN 'Tue'
           WHEN '3' THEN 'Wed'
           WHEN '4' THEN 'Thu'
           WHEN '5' THEN 'Fri'
           WHEN '6' THEN 'Sat'
         END as day,
         COUNT(*) as total,
         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as attended
       FROM attendance a
       JOIN lectures l ON a.lecture_id = l.id
       WHERE a.user_id = ? 
         AND a.date >= date('now', '-7 days')
       GROUP BY strftime('%w', a.date)
       ORDER BY day_num`,
      [userId],
    );

    return weeklyStats;
  }
}
