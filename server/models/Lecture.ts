import { getDatabase } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";

export interface Lecture {
  id: string;
  user_id: string;
  name: string;
  schedule_days: string; // JSON string
  schedule_time: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLectureData {
  name: string;
  schedule_days: string[]; // Array of days
  schedule_time: string;
}

export interface LectureResponse {
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

export class LectureModel {
  static async create(
    userId: string,
    lectureData: CreateLectureData,
  ): Promise<LectureResponse> {
    const db = await getDatabase();
    const id = uuidv4();

    await db.run(
      `INSERT INTO lectures (id, user_id, name, schedule_days, schedule_time) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        lectureData.name,
        JSON.stringify(lectureData.schedule_days),
        lectureData.schedule_time,
      ],
    );

    const lecture = await db.get<Lecture>(
      `SELECT * FROM lectures WHERE id = ?`,
      [id],
    );
    if (!lecture) {
      throw new Error("Failed to create lecture");
    }

    return await this.toResponse(lecture);
  }

  static async findByUserId(userId: string): Promise<LectureResponse[]> {
    const db = await getDatabase();
    const lectures = await db.all<Lecture[]>(
      `SELECT * FROM lectures WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
    );

    const lectureResponses = await Promise.all(
      lectures.map((lecture) => this.toResponse(lecture)),
    );

    return lectureResponses;
  }

  static async findById(
    lectureId: string,
    userId: string,
  ): Promise<LectureResponse | undefined> {
    const db = await getDatabase();
    const lecture = await db.get<Lecture>(
      `SELECT * FROM lectures WHERE id = ? AND user_id = ?`,
      [lectureId, userId],
    );

    return lecture ? await this.toResponse(lecture) : undefined;
  }

  static async update(
    lectureId: string,
    userId: string,
    updateData: Partial<CreateLectureData>,
  ): Promise<LectureResponse | undefined> {
    const db = await getDatabase();

    const setClause = [];
    const values = [];

    if (updateData.name) {
      setClause.push("name = ?");
      values.push(updateData.name);
    }
    if (updateData.schedule_days) {
      setClause.push("schedule_days = ?");
      values.push(JSON.stringify(updateData.schedule_days));
    }
    if (updateData.schedule_time) {
      setClause.push("schedule_time = ?");
      values.push(updateData.schedule_time);
    }

    if (setClause.length === 0) {
      throw new Error("No fields to update");
    }

    setClause.push("updated_at = CURRENT_TIMESTAMP");
    values.push(lectureId, userId);

    await db.run(
      `UPDATE lectures SET ${setClause.join(", ")} WHERE id = ? AND user_id = ?`,
      values,
    );

    return await this.findById(lectureId, userId);
  }

  static async delete(lectureId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run(
      `DELETE FROM lectures WHERE id = ? AND user_id = ?`,
      [lectureId, userId],
    );

    return (result.changes ?? 0) > 0;
  }

  static async toResponse(lecture: Lecture): Promise<LectureResponse> {
    const db = await getDatabase();

    // Get attendance stats
    const attendanceStats = await db.get<{
      total: number;
      present: number;
    }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
       FROM attendance 
       WHERE lecture_id = ?`,
      [lecture.id],
    );

    const total = attendanceStats?.total || 0;
    const present = attendanceStats?.present || 0;
    const attendancePercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    // Calculate classes needed to reach 75%
    const classesTo75Percent = Math.max(
      0,
      Math.ceil((75 * total - 100 * present) / 25),
    );

    return {
      id: lecture.id,
      name: lecture.name,
      schedule_days: JSON.parse(lecture.schedule_days),
      schedule_time: lecture.schedule_time,
      attendance_percentage: attendancePercentage,
      total_classes: total,
      attended_classes: present,
      classes_to_75_percent: classesTo75Percent,
      created_at: lecture.created_at,
      updated_at: lecture.updated_at,
    };
  }
}
