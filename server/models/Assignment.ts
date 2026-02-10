import { adminDb } from "../config/firebase-admin.js";

export type AssignmentStatus = "pending" | "completed" | "missed";
export type AssignmentPriority = "low" | "medium" | "high";

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  description: string | null;
  due_date: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentData {
  title: string;
  subject: string;
  description?: string;
  due_date: string;
  priority?: AssignmentPriority;
}

export interface UpdateAssignmentData {
  title?: string;
  subject?: string;
  description?: string;
  due_date?: string;
  status?: AssignmentStatus;
  priority?: AssignmentPriority;
}

export interface AssignmentResponse {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  due_date: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  days_until_due: number;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignmentStatsResponse {
  total: number;
  completed: number;
  pending: number;
  missed: number;
  overdue: number;
}

const assignmentsCol = () => adminDb.collection("assignments");

export class AssignmentModel {
  static async create(
    userId: string,
    assignmentData: CreateAssignmentData,
  ): Promise<AssignmentResponse> {
    const docRef = assignmentsCol().doc();
    const now = new Date().toISOString();

    const assignment: Assignment = {
      id: docRef.id,
      user_id: userId,
      title: assignmentData.title,
      subject: assignmentData.subject,
      description: assignmentData.description || null,
      due_date: assignmentData.due_date,
      status: "pending",
      priority: assignmentData.priority || "medium",
      created_at: now,
      updated_at: now,
    };

    await docRef.set(assignment);
    return this.toResponse(assignment);
  }

  static async findById(
    assignmentId: string,
    userId: string,
  ): Promise<AssignmentResponse | undefined> {
    const doc = await assignmentsCol().doc(assignmentId).get();
    if (!doc.exists) return undefined;
    const a = doc.data() as Assignment;
    if (a.user_id !== userId) return undefined;
    return this.toResponse(a);
  }

  static async findByUserId(userId: string): Promise<AssignmentResponse[]> {
    const snap = await assignmentsCol()
      .where("user_id", "==", userId)
      .orderBy("due_date", "asc")
      .get();
    return snap.docs.map((d) => this.toResponse(d.data() as Assignment));
  }

  static async findByStatus(
    userId: string,
    status: AssignmentStatus,
  ): Promise<AssignmentResponse[]> {
    const snap = await assignmentsCol()
      .where("user_id", "==", userId)
      .where("status", "==", status)
      .orderBy("due_date", "asc")
      .get();
    return snap.docs.map((d) => this.toResponse(d.data() as Assignment));
  }

  static async update(
    assignmentId: string,
    userId: string,
    updateData: UpdateAssignmentData,
  ): Promise<AssignmentResponse | undefined> {
    const doc = await assignmentsCol().doc(assignmentId).get();
    if (!doc.exists) return undefined;
    const a = doc.data() as Assignment;
    if (a.user_id !== userId) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updateData.title) updates.title = updateData.title;
    if (updateData.subject) updates.subject = updateData.subject;
    if (updateData.description !== undefined) updates.description = updateData.description || null;
    if (updateData.due_date) updates.due_date = updateData.due_date;
    if (updateData.status) updates.status = updateData.status;
    if (updateData.priority) updates.priority = updateData.priority;

    await assignmentsCol().doc(assignmentId).update(updates);
    return this.findById(assignmentId, userId);
  }

  static async delete(assignmentId: string, userId: string): Promise<boolean> {
    const doc = await assignmentsCol().doc(assignmentId).get();
    if (!doc.exists) return false;
    const a = doc.data() as Assignment;
    if (a.user_id !== userId) return false;
    await assignmentsCol().doc(assignmentId).delete();
    return true;
  }

  static async getStats(userId: string): Promise<AssignmentStatsResponse> {
    const snap = await assignmentsCol()
      .where("user_id", "==", userId)
      .get();

    const today = new Date().toISOString().slice(0, 10);
    let total = 0, completed = 0, pending = 0, missed = 0, overdue = 0;

    snap.docs.forEach((d) => {
      const a = d.data() as Assignment;
      total++;
      if (a.status === "completed") completed++;
      else if (a.status === "pending") {
        pending++;
        if (a.due_date < today) overdue++;
      } else if (a.status === "missed") missed++;
    });

    return { total, completed, pending, missed, overdue };
  }

  static async markOverdueAsMissed(userId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const snap = await assignmentsCol()
      .where("user_id", "==", userId)
      .where("status", "==", "pending")
      .get();

    const batch = adminDb.batch();
    let count = 0;
    snap.docs.forEach((d) => {
      const a = d.data() as Assignment;
      if (a.due_date < today) {
        batch.update(d.ref, { status: "missed", updated_at: new Date().toISOString() });
        count++;
      }
    });

    if (count > 0) await batch.commit();
    return count;
  }

  static toResponse(assignment: Assignment): AssignmentResponse {
    const today = new Date();
    const dueDate = new Date(assignment.due_date);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      description: assignment.description,
      due_date: assignment.due_date,
      status: assignment.status,
      priority: assignment.priority,
      days_until_due: daysDiff,
      is_overdue: daysDiff < 0 && assignment.status === "pending",
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
    };
  }
}
