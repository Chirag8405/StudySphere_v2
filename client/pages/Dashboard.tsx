import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiService, DashboardData, Lecture } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  MoreVertical,
  XCircle,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [dashboardData, lecturesData] = await Promise.all([
          ApiService.getDashboardData(),
          ApiService.getLectures(),
        ]);
        setData(dashboardData);
      setLectures(Array.isArray(lecturesData) ? lecturesData : lecturesData.lectures || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getLowAttendanceLectures = () => {
    return lectures.filter((lecture) => lecture.attendance_percentage < 75);
  };

 const getTodayLectures = () => {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayLectures = lectures.filter((lecture) =>
    Array.isArray(lecture.schedule_days)
      ? lecture.schedule_days.includes(today)
      : false
  );

  return todayLectures.sort((a, b) => {
    const timeA = (a.schedule_time || "00:00").split(":")?.map(Number);
    const timeB = (b.schedule_time || "00:00").split(":")?.map(Number);
    return timeA[0] - timeB[0] || timeA[1] - timeB[1];
  });
};


  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleMarkAttendance = async (
    lectureId: string,
    status: "present" | "absent" | "cancelled",
  ) => {
    try {
      const lecture = lectures.find((l) => l.id === lectureId);
      const lectureName = lecture?.name || "lecture";

      const today = format(new Date(), "yyyy-MM-dd");
      
      // Create a new attendance record (not update an existing one)
      await ApiService.createAttendance({
        lecture_id: lectureId,
        date: today,
        status,
      });

      const statusIcon =
        status === "present"
          ? CheckCircle
          : status === "absent"
            ? XCircle
            : Clock;

      toast.success("Attendance Marked", {
        description: `Marked ${status} for ${lectureName}`,
        icon: React.createElement(statusIcon, { className: "h-4 w-4" }),
      });

      // Refresh data to show updated attendance
      const [dashboardData, lecturesData] = await Promise.all([
        ApiService.getDashboardData(),
        ApiService.getLectures(),
      ]);
      setData(dashboardData);
      setLectures(lecturesData.lectures || []);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to mark attendance";
      setError(errorMsg);
      toast.error("Failed to Mark Attendance", {
        description: errorMsg,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)]?.map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(2)]?.map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load dashboard data: {error}
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No data available</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const lowAttendanceLectures = getLowAttendanceLectures();
  const todayLectures = getTodayLectures();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Hello, {user?.name}!
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {getCurrentDate()}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Attendance
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.attendanceStats.attendance_percentage}%
              </div>
              <p className="text-xs text-muted-foreground">Target: 75%</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Low Attendance Lectures
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lowAttendanceLectures.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Below 75% attendance
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Assignments
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.assignmentStats.completed}
              </div>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Assignments
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.assignmentStats.pending}
              </div>
              <p className="text-xs text-muted-foreground">Due soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Cards Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Lectures Below 75% Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowAttendanceLectures.length > 0 ? (
                <div className="space-y-3">
                  {lowAttendanceLectures?.map((lecture) => (
                    <div
                      key={lecture.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{lecture.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {(lecture.name || "")?.slice(0, 20)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">
                          {lecture.attendance_percentage}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {lecture.attended_classes}/{lecture.total_classes}{" "}
                          classes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  All lectures above 75% attendance!
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Today's Lectures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto scrollbar-hide">
                {todayLectures.length > 0 ? (
                  <div className="space-y-3">
                    {todayLectures?.map((lecture) => (
                      <div
                        key={lecture.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <h4 className="font-medium">{lecture.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {(lecture.name || "")?.slice(0, 20)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(lecture.schedule_time)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              lecture.attendance_percentage >= 75
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {lecture.attendance_percentage}%
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Mark attendance</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMarkAttendance(lecture.id, "present")
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Present
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMarkAttendance(lecture.id, "absent")
                                }
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark Absent
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMarkAttendance(lecture.id, "cancelled")
                                }
                                className="text-gray-600"
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Mark Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground h-full flex flex-col items-center justify-center">
                    <Calendar className="h-12 w-12 mx-auto mb-2" />
                    No lectures scheduled for today
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyAttendance.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.weeklyAttendance?.map((item) => ({
                      ...item,
                      attendanceRate:
                        item.total > 0
                          ? Math.round((item.attended / item.total) * 100)
                          : 0,
                      missed: item.total - item.attended,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: "#e0e0e0" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: "#e0e0e0" }}
                      domain={[0, "dataMax + 1"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                      formatter={(value, name, props) => {
                        if (name === "attended")
                          return [value, "Classes Attended"];
                        if (name === "missed") return [value, "Classes Missed"];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar
                      dataKey="attended"
                      stackId="a"
                      fill="#10b981"
                      name="attended"
                      radius={[0, 0, 4, 4]}
                    />
                    <Bar
                      dataKey="missed"
                      stackId="a"
                      fill="#ef4444"
                      name="missed"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* Weekly Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  {data.weeklyAttendance?.map((day) => {
                    const attendanceRate =
                      day.total > 0
                        ? Math.round((day.attended / day.total) * 100)
                        : 0;
                    return (
                      <div key={day.day} className="text-center space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {day.day?.slice(0, 3)}
                        </p>
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant={
                              attendanceRate >= 75
                                ? "default"
                                : attendanceRate > 0
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {attendanceRate}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {day.attended}/{day.total}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No weekly attendance data available</p>
                  <p className="text-sm">
                    Start marking attendance to see your weekly progress
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentAssignments.length > 0 ? (
              <div className="space-y-4">
                {data.recentAssignments?.slice(0, 6)?.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{assignment.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {assignment.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          assignment.status === "completed"
                            ? "default"
                            : assignment.status === "missed"
                              ? "destructive"
                              : assignment.is_overdue
                                ? "destructive"
                                : "secondary"
                        }
                      >
                        {assignment.is_overdue ? "overdue" : assignment.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No assignments found. Create your first assignment to get
                started!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
