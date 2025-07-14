import { Response } from "express";
import { AttendanceModel } from "../models/Attendance.js";
import { AssignmentModel } from "../models/Assignment.js";
import { LectureModel } from "../models/Lecture.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export async function getDashboardData(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Fetch all dashboard data in parallel
    const [
      attendanceStats,
      weeklyAttendance,
      assignmentStats,
      recentAssignments,
      lectures,
    ] = await Promise.all([
      AttendanceModel.getStats(req.user.id),
      AttendanceModel.getWeeklyStats(req.user.id),
      AssignmentModel.getStats(req.user.id),
      AssignmentModel.findByUserId(req.user.id),
      LectureModel.findByUserId(req.user.id),
    ]);

    // Process attendance data for charts
    const attendanceData = [
      {
        name: "Present",
        value: attendanceStats.attended_classes,
        color: "#10b981",
      },
      {
        name: "Absent",
        value: attendanceStats.absent_classes,
        color: "#ef4444",
      },
      {
        name: "Cancelled",
        value: attendanceStats.cancelled_classes,
        color: "#6b7280",
      },
    ];

    // Calculate classes needed to reach 75% attendance
    const classesToReach75 = Math.max(
      0,
      Math.ceil(
        (75 * attendanceStats.total_classes -
          100 * attendanceStats.attended_classes) /
          25,
      ),
    );

    // Get recent assignments (last 10)
    const recentAssignmentsList = recentAssignments
      .slice(0, 10)
      .map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        due_date: assignment.due_date,
        status: assignment.status,
        priority: assignment.priority,
        days_until_due: assignment.days_until_due,
        is_overdue: assignment.is_overdue,
      }));

    res.json({
      user: req.user,
      attendanceStats: {
        ...attendanceStats,
        classes_to_75_percent: classesToReach75,
      },
      attendanceData,
      weeklyAttendance,
      assignmentStats,
      recentAssignments: recentAssignmentsList,
      totalLectures: lectures.length,
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
