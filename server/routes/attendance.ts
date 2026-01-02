import { Request, Response } from "express";
import {
  AttendanceModel,
  CreateAttendanceData,
  AttendanceStatus,
} from "../models/Attendance.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export async function getAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { lecture_id } = req.query;

    let attendance;
    if (lecture_id) {
      attendance = await AttendanceModel.findByLectureId(
        lecture_id as string,
        req.user.id,
      );
    } else {
      attendance = await AttendanceModel.findByUserId(req.user.id);
    }

    res.json({ attendance });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAttendanceStats(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const stats = await AttendanceModel.getStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error("Get attendance stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getWeeklyAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const weeklyStats = await AttendanceModel.getWeeklyStats(req.user.id);
    res.json({ weeklyStats });
  } catch (error) {
    console.error("Get weekly attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createAttendance(
  req: Request<{}, {}, CreateAttendanceData>,
  res: Response,
) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { lecture_id, date, status } = req.body;

    // Validate input
    if (!lecture_id || !date || !status) {
      return res
        .status(400)
        .json({ error: "Lecture ID, date, and status are required" });
    }

    if (!["present", "absent", "cancelled"].includes(status)) {
      return res.status(400).json({
        error: "Status must be one of: present, absent, cancelled",
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res
        .status(400)
        .json({ error: "Date must be in YYYY-MM-DD format" });
    }

    const attendance = await AttendanceModel.create(user.id, {
      lecture_id,
      date,
      status,
    });

    res.status(201).json({ attendance });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already marked")) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes("not found") || error.message.includes("access denied")) {
        return res.status(404).json({ error: error.message });
      }
    }
    console.error("Create attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["present", "absent", "cancelled"].includes(status)) {
      return res.status(400).json({
        error: "Status must be one of: present, absent, cancelled",
      });
    }

    const attendance = await AttendanceModel.update(
      id,
      req.user.id,
      status as AttendanceStatus,
    );

    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json({ attendance });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const deleted = await AttendanceModel.delete(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
