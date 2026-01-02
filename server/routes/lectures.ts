import { Request, Response } from "express";
import { LectureModel, CreateLectureData } from "../models/Lecture.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export async function getLectures(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const lectures = await LectureModel.findByUserId(req.user.id);
    res.json({ lectures });
  } catch (error) {
    console.error("Get lectures error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getLecture(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const lecture = await LectureModel.findById(id, req.user.id);

    if (!lecture) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    res.json({ lecture });
  } catch (error) {
    console.error("Get lecture error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createLecture(
  req: Request<{}, {}, CreateLectureData>,
  res: Response,
) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { name, schedule_days, schedule_time } = req.body;

    // Validate input
    if (!name || !schedule_days || !schedule_time) {
      return res.status(400).json({
        error: "Name, schedule days, and schedule time are required",
      });
    }

    if (!Array.isArray(schedule_days) || schedule_days.length === 0) {
      return res
        .status(400)
        .json({ error: "Schedule days must be a non-empty array" });
    }

    const lecture = await LectureModel.create(user.id, {
      name,
      schedule_days,
      schedule_time,
    });

    res.status(201).json({ lecture });
  } catch (error) {
    console.error("Create lecture error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateLecture(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const updateData = req.body;

    const lecture = await LectureModel.update(id, req.user.id, updateData);

    if (!lecture) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    res.json({ lecture });
  } catch (error) {
    console.error("Update lecture error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteLecture(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const deleted = await LectureModel.delete(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    res.json({ message: "Lecture deleted successfully" });
  } catch (error) {
    console.error("Delete lecture error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
