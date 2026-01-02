import { Request, Response } from "express";
import {
  AssignmentModel,
  CreateAssignmentData,
  UpdateAssignmentData,
  AssignmentStatus,
} from "../models/Assignment.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export async function getAssignments(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { status } = req.query;

    let assignments;
    if (status && typeof status === "string") {
      assignments = await AssignmentModel.findByStatus(
        req.user.id,
        status as AssignmentStatus,
      );
    } else {
      assignments = await AssignmentModel.findByUserId(req.user.id);
    }

    res.json({ assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAssignment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const assignment = await AssignmentModel.findById(id, req.user.id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAssignmentStats(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const stats = await AssignmentModel.getStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error("Get assignment stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createAssignment(
  req: Request<{}, {}, CreateAssignmentData>,
  res: Response,
) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { title, subject, description, due_date, priority } = req.body;

    // Validate input
    if (!title || !subject || !due_date) {
      return res
        .status(400)
        .json({ error: "Title, subject, and due date are required" });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(due_date)) {
      return res
        .status(400)
        .json({ error: "Due date must be in YYYY-MM-DD format" });
    }

    // Validate priority if provided
    if (priority && !["low", "medium", "high"].includes(priority)) {
      return res
        .status(400)
        .json({ error: "Priority must be one of: low, medium, high" });
    }

    const assignment = await AssignmentModel.create(user.id, {
      title,
      subject,
      description,
      due_date,
      priority,
    });

    res.status(201).json({ assignment });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateAssignment(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const updateData: UpdateAssignmentData = req.body;

    // Validate date format if provided
    if (updateData.due_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updateData.due_date)) {
        return res
          .status(400)
          .json({ error: "Due date must be in YYYY-MM-DD format" });
      }
    }

    // Validate status if provided
    if (
      updateData.status &&
      !["pending", "completed", "missed"].includes(updateData.status)
    ) {
      return res.status(400).json({
        error: "Status must be one of: pending, completed, missed",
      });
    }

    // Validate priority if provided
    if (
      updateData.priority &&
      !["low", "medium", "high"].includes(updateData.priority)
    ) {
      return res
        .status(400)
        .json({ error: "Priority must be one of: low, medium, high" });
    }

    const assignment = await AssignmentModel.update(
      id,
      req.user.id,
      updateData,
    );

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ assignment });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteAssignment(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const deleted = await AssignmentModel.delete(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function patchAssignmentStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !["pending", "completed", "missed"].includes(status)) {
      return res.status(400).json({
        error: "Status must be one of: pending, completed, missed",
      });
    }

    const assignment = await AssignmentModel.update(id, req.user.id, { status });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ assignment });
  } catch (error) {
    console.error("Patch assignment status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function markOverdueAssignments(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const updatedCount = await AssignmentModel.markOverdueAsMissed(req.user.id);

    res.json({
      message: `${updatedCount} overdue assignments marked as missed`,
      updatedCount,
    });
  } catch (error) {
    console.error("Mark overdue assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
