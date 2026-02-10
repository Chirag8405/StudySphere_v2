import { adminDb } from "../config/firebase-admin.js";

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

const attendanceCol = () => adminDb.collection("attendance");
const lecturesCol = () => adminDb.collection("lectures");

export class AttendanceModel {
  static async create(
    userId: string,
    attendanceData: CreateAttendanceData,
  ): Promise<AttendanceResponse> {
    // Verify lecture belongs to user
    const lectureDoc = await lecturesCol().doc(attendanceData.lecture_id).get();
    if (!lectureDoc.exists) throw new Error("Lecture not found or access denied");
    const lecture = lectureDoc.data() as any;
    if (lecture.user_id !== userId) throw new Error("Lecture not found or access denied");

    // Check duplicate
    const existing = await attendanceCol()
      .where("lecture_id", "==", attendanceData.lecture_id)
      .where("date", "==", attendanceData.date)
      .limit(1)
      .get();
    if (!existing.empty) throw new Error("Attendance already marked for this date");

    const docRef = attendanceCol().doc();
    const now = new Date().toISOString();

    const record: Attendance = {
      id: docRef.id,
      lecture_id: attendanceData.lecture_id,
      user_id: userId,
      date: attendanceData.date,
      status: attendanceData.status,
      created_at: now,
      updated_at: now,
    };

    await docRef.set(record);

    return {
      ...record,
      lecture_name: lecture.name,
    };
  }

  static async findById(
    attendanceId: string,
    userId: string,
  ): Promise<AttendanceResponse | undefined> {
    const doc = await attendanceCol().doc(attendanceId).get();
    if (!doc.exists) return undefined;
    const record = doc.data() as Attendance;
    if (record.user_id !== userId) return undefined;

    const lectureDoc = await lecturesCol().doc(record.lecture_id).get();
    const lectureName = lectureDoc.exists ? (lectureDoc.data() as any).name : "Unknown";

    return { ...record, lecture_name: lectureName };
  }

  static async findByLectureId(
    lectureId: string,
    userId: string,
  ): Promise<AttendanceResponse[]> {
    const snap = await attendanceCol()
      .where("lecture_id", "==", lectureId)
      .where("user_id", "==", userId)
      .orderBy("date", "desc")
      .get();

    const lectureDoc = await lecturesCol().doc(lectureId).get();
    const lectureName = lectureDoc.exists ? (lectureDoc.data() as any).name : "Unknown";

    return snap.docs.map((d) => {
      const data = d.data() as Attendance;
      return { ...data, lecture_name: lectureName };
    });
  }

  static async findByUserId(userId: string): Promise<AttendanceResponse[]> {
    const snap = await attendanceCol()
      .where("user_id", "==", userId)
      .orderBy("date", "desc")
      .get();

    // Batch fetch lecture names
    const records = snap.docs.map((d) => d.data() as Attendance);
    const lectureIds = [...new Set(records.map((r) => r.lecture_id))];
    const lectureMap = new Map<string, string>();
    for (const lid of lectureIds) {
      const ld = await lecturesCol().doc(lid).get();
      lectureMap.set(lid, ld.exists ? (ld.data() as any).name : "Unknown");
    }

    return records.map((r) => ({
      ...r,
      lecture_name: lectureMap.get(r.lecture_id) || "Unknown",
    }));
  }

  static async update(
    attendanceId: string,
    userId: string,
    status: AttendanceStatus,
  ): Promise<AttendanceResponse | undefined> {
    const doc = await attendanceCol().doc(attendanceId).get();
    if (!doc.exists) return undefined;
    const record = doc.data() as Attendance;
    if (record.user_id !== userId) return undefined;

    await attendanceCol().doc(attendanceId).update({
      status,
      updated_at: new Date().toISOString(),
    });

    return this.findById(attendanceId, userId);
  }

  static async delete(attendanceId: string, userId: string): Promise<boolean> {
    const doc = await attendanceCol().doc(attendanceId).get();
    if (!doc.exists) return false;
    const record = doc.data() as Attendance;
    if (record.user_id !== userId) return false;
    await attendanceCol().doc(attendanceId).delete();
    return true;
  }

  static async getStats(userId: string): Promise<AttendanceStatsResponse> {
    const snap = await attendanceCol()
      .where("user_id", "==", userId)
      .get();

    let total = 0, present = 0, absent = 0, cancelled = 0;
    snap.docs.forEach((d) => {
      const s = (d.data() as Attendance).status;
      total++;
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "cancelled") cancelled++;
    });

    return {
      total_classes: total,
      attended_classes: present,
      absent_classes: absent,
      cancelled_classes: cancelled,
      attendance_percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }

  static async getWeeklyStats(
    userId: string,
  ): Promise<Array<{ day: string; attended: number; total: number }>> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

    const snap = await attendanceCol()
      .where("user_id", "==", userId)
      .where("date", ">=", cutoff)
      .get();

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap = new Map<string, { attended: number; total: number }>();

    snap.docs.forEach((d) => {
      const data = d.data() as Attendance;
      const dayIdx = new Date(data.date).getDay();
      const dayName = dayNames[dayIdx];
      const entry = dayMap.get(dayName) || { attended: 0, total: 0 };
      entry.total++;
      if (data.status === "present") entry.attended++;
      dayMap.set(dayName, entry);
    });

    return Array.from(dayMap.entries()).map(([day, stats]) => ({
      day,
      ...stats,
    }));
  }
}
