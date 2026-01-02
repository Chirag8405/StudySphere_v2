import { getDatabase } from "./connection.js";
import { UserModel } from "../models/User.js";
import { LectureModel } from "../models/Lecture.js";
import { AttendanceModel } from "../models/Attendance.js";
import { AssignmentModel } from "../models/Assignment.js";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Create demo user (FOR DEVELOPMENT ONLY - Remove in production)
    // Demo credentials: demo@studysphere.com / Demo@123456
    const demoUser = await UserModel.create({
      name: "Demo User",
      email: "demo@studysphere.com",
      password: "Demo@123456", // Meets password requirements: 8+ chars, uppercase, lowercase, number, special char
    });

    console.log("Created demo user:", demoUser.email);

    // Create demo lectures
    const lectures = [
      {
        name: "Data Structures",
        schedule_days: ["Monday", "Wednesday", "Friday"],
        schedule_time: "09:00",
      },
      {
        name: "Linear Algebra",
        schedule_days: ["Tuesday", "Thursday"],
        schedule_time: "11:00",
      },
      {
        name: "Physics Lab",
        schedule_days: ["Wednesday"],
        schedule_time: "14:00",
      },
      {
        name: "English Literature",
        schedule_days: ["Monday", "Friday"],
        schedule_time: "16:00",
      },
    ];

    const createdLectures = [];
    for (const lectureData of lectures) {
      const lecture = await LectureModel.create(demoUser.id, lectureData);
      createdLectures.push(lecture);
      console.log(`Created lecture: ${lecture.name}`);
    }

    // Create demo attendance records (last 30 days)
    const attendanceData = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      // Simulate attendance for each lecture based on day
      for (const lecture of createdLectures) {
        const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        if (lecture.schedule_days.includes(dayName)) {
          // 80% chance of being present, 15% absent, 5% cancelled
          const rand = Math.random();
          let status: "present" | "absent" | "cancelled";
          if (rand < 0.8) status = "present";
          else if (rand < 0.95) status = "absent";
          else status = "cancelled";

          try {
            await AttendanceModel.create(demoUser.id, {
              lecture_id: lecture.id,
              date: dateString,
              status,
            });
            attendanceData.push({
              lecture: lecture.name,
              date: dateString,
              status,
            });
          } catch (error) {
            // Skip if attendance already exists
          }
        }
      }
    }

    console.log(`Created ${attendanceData.length} attendance records`);

    // Create demo assignments
    const assignments = [
      {
        title: "Binary Search Tree Implementation",
        subject: "Computer Science",
        description:
          "Implement a complete binary search tree with insertion, deletion, and search operations",
        due_date: "2024-01-25",
        priority: "high" as const,
        status: "pending" as const,
      },
      {
        title: "Matrix Operations Assignment",
        subject: "Mathematics",
        description:
          "Solve problems related to matrix multiplication and determinants",
        due_date: "2024-01-18",
        priority: "medium" as const,
        status: "completed" as const,
      },
      {
        title: "Lab Report - Wave Motion",
        subject: "Physics",
        description:
          "Complete analysis of wave motion experiment with graphs and conclusions",
        due_date: "2024-01-15",
        priority: "medium" as const,
        status: "missed" as const,
      },
      {
        title: "Essay on Modern Poetry",
        subject: "English",
        description:
          "Write a 2000-word essay analyzing modern poetry techniques",
        due_date: "2024-02-01",
        priority: "high" as const,
        status: "pending" as const,
      },
      {
        title: "Algorithm Analysis",
        subject: "Computer Science",
        description: "Analyze time and space complexity of sorting algorithms",
        due_date: "2024-01-30",
        priority: "medium" as const,
        status: "pending" as const,
      },
      {
        title: "Calculus Problem Set",
        subject: "Mathematics",
        description: "Complete problems 1-25 from Chapter 8",
        due_date: "2024-01-12",
        priority: "low" as const,
        status: "completed" as const,
      },
    ];

    for (const assignmentData of assignments) {
      const { status, ...createData } = assignmentData;
      const assignment = await AssignmentModel.create(demoUser.id, createData);

      // Update status if needed
      if (status !== "pending") {
        await AssignmentModel.update(assignment.id, demoUser.id, { status });
      }

      console.log(`Created assignment: ${assignment.title}`);
    }

    console.log("Database seeding completed successfully!");
    return {
      user: demoUser,
      lectures: createdLectures,
      attendanceRecords: attendanceData.length,
      assignments: assignments.length,
    };
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Check if this is the main module using import.meta.url
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedDatabase()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
