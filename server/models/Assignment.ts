import { getDatabase } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";

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

export class AssignmentModel {
  static async create(
    userId: string,
    assignmentData: CreateAssignmentData,
  ): Promise<AssignmentResponse> {
    const db = await getDatabase();
    const id = uuidv4();

    await db.run(
      `INSERT INTO assignments (id, user_id, title, subject, description, due_date, priority) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        assignmentData.title,
        assignmentData.subject,
        assignmentData.description || null,
        assignmentData.due_date,
        assignmentData.priority || "medium",
      ],
    );

    const assignment = await this.findById(id, userId);
    if (!assignment) {
      throw new Error("Failed to create assignment");
    }

    return assignment;
  }

  static async findById(
    assignmentId: string,
    userId: string,
  ): Promise<AssignmentResponse | undefined> {
    const db = await getDatabase();
    const assignment = await db.get<Assignment>(
      `SELECT * FROM assignments WHERE id = ? AND user_id = ?`,
      [assignmentId, userId],
    );

    return assignment ? this.toResponse(assignment) : undefined;
  }

  static async findByUserId(userId: string): Promise<AssignmentResponse[]> {
    const db = await getDatabase();
    const assignments = await db.all<Assignment[]>(
      `SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC`,
      [userId],
    );

    return assignments.map((assignment) => this.toResponse(assignment));
  }

  static async findByStatus(
    userId: string,
    status: AssignmentStatus,
  ): Promise<AssignmentResponse[]> {
    const db = await getDatabase();
    const assignments = await db.all<Assignment[]>(
      `SELECT * FROM assignments WHERE user_id = ? AND status = ? ORDER BY due_date ASC`,
      [userId, status],
    );

    return assignments.map((assignment) => this.toResponse(assignment));
  }

  static async update(
    assignmentId: string,
    userId: string,
    updateData: UpdateAssignmentData,
  ): Promise<AssignmentResponse | undefined> {
    const db = await getDatabase();

    const setClause = [];
    const values = [];

    if (updateData.title) {
      setClause.push("title = ?");
      values.push(updateData.title);
    }
    if (updateData.subject) {
      setClause.push("subject = ?");
      values.push(updateData.subject);
    }
    if (updateData.description !== undefined) {
      setClause.push("description = ?");
      values.push(updateData.description || null);
    }
    if (updateData.due_date) {
      setClause.push("due_date = ?");
      values.push(updateData.due_date);
    }
    if (updateData.status) {
      setClause.push("status = ?");
      values.push(updateData.status);
    }
    if (updateData.priority) {
      setClause.push("priority = ?");
      values.push(updateData.priority);
    }

    if (setClause.length === 0) {
      throw new Error("No fields to update");
    }

    setClause.push("updated_at = CURRENT_TIMESTAMP");
    values.push(assignmentId, userId);

    await db.run(
      `UPDATE assignments SET ${setClause.join(", ")} WHERE id = ? AND user_id = ?`,
      values,
    );

    return await this.findById(assignmentId, userId);
  }

  static async delete(assignmentId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run(
      `DELETE FROM assignments WHERE id = ? AND user_id = ?`,
      [assignmentId, userId],
    );

    return (result.changes ?? 0) > 0;
  }

  static async getStats(userId: string): Promise<AssignmentStatsResponse> {
    const db = await getDatabase();
    const stats = await db.get<{
      total: number;
      completed: number;
      pending: number;
      missed: number;
    }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
       FROM assignments 
       WHERE user_id = ?`,
      [userId],
    );

    // Count overdue assignments
    const overdue = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM assignments 
       WHERE user_id = ? AND status = 'pending' AND due_date < date('now')`,
      [userId],
    );

    return {
      total: stats?.total || 0,
      completed: stats?.completed || 0,
      pending: stats?.pending || 0,
      missed: stats?.missed || 0,
      overdue: overdue?.count || 0,
    };
  }

  static async markOverdueAsMissed(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      `UPDATE assignments 
       SET status = 'missed', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'pending' AND due_date < date('now')`,
      [userId],
    );

    return result.changes || 0;
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
