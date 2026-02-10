import { adminDb } from "../config/firebase-admin.js";

export interface Lecture {
  id: string;
  user_id: string;
  name: string;
  schedule_days: string[];
  schedule_time: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLectureData {
  name: string;
  schedule_days: string[];
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

const lecturesCol = () => adminDb.collection("lectures");
const attendanceCol = () => adminDb.collection("attendance");

export class LectureModel {
  static async create(
    userId: string,
    lectureData: CreateLectureData,
  ): Promise<LectureResponse> {
    const docRef = lecturesCol().doc(); // auto-generated ID
    const now = new Date().toISOString();

    const lecture: Lecture = {
      id: docRef.id,
      user_id: userId,
      name: lectureData.name,
      schedule_days: lectureData.schedule_days,
      schedule_time: lectureData.schedule_time,
      created_at: now,
      updated_at: now,
    };

    await docRef.set(lecture);
    return await this.toResponse(lecture);
  }

  static async findByUserId(userId: string): Promise<LectureResponse[]> {
    const snap = await lecturesCol()
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    const lectures = snap.docs.map((d) => d.data() as Lecture);
    return Promise.all(lectures.map((l) => this.toResponse(l)));
  }

  static async findById(
    lectureId: string,
    userId: string,
  ): Promise<LectureResponse | undefined> {
    const doc = await lecturesCol().doc(lectureId).get();
    if (!doc.exists) return undefined;
    const lecture = doc.data() as Lecture;
    if (lecture.user_id !== userId) return undefined;
    return this.toResponse(lecture);
  }

  static async update(
    lectureId: string,
    userId: string,
    updateData: Partial<CreateLectureData>,
  ): Promise<LectureResponse | undefined> {
    const doc = await lecturesCol().doc(lectureId).get();
    if (!doc.exists) return undefined;
    const lecture = doc.data() as Lecture;
    if (lecture.user_id !== userId) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updateData.name) updates.name = updateData.name;
    if (updateData.schedule_days) updates.schedule_days = updateData.schedule_days;
    if (updateData.schedule_time) updates.schedule_time = updateData.schedule_time;

    await lecturesCol().doc(lectureId).update(updates);
    return this.findById(lectureId, userId);
  }

  static async delete(lectureId: string, userId: string): Promise<boolean> {
    const doc = await lecturesCol().doc(lectureId).get();
    if (!doc.exists) return false;
    const lecture = doc.data() as Lecture;
    if (lecture.user_id !== userId) return false;

    // Delete related attendance records
    const attSnap = await attendanceCol()
      .where("lecture_id", "==", lectureId)
      .get();
    const batch = adminDb.batch();
    attSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(lecturesCol().doc(lectureId));
    await batch.commit();
    return true;
  }

  static async toResponse(lecture: Lecture): Promise<LectureResponse> {
    // Get attendance stats for this lecture
    const attSnap = await attendanceCol()
      .where("lecture_id", "==", lecture.id)
      .get();

    let total = 0;
    let present = 0;
    attSnap.docs.forEach((d) => {
      total++;
      if ((d.data() as any).status === "present") present++;
    });

    const attendancePercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    const classesTo75Percent = Math.max(
      0,
      Math.ceil((75 * total - 100 * present) / 25),
    );

    return {
      id: lecture.id,
      name: lecture.name,
      schedule_days: lecture.schedule_days,
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
