import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiService, Lecture, AttendanceRecord } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Attendance() {
  const { user, isLoading: authLoading } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateLectureOpen, setIsCreateLectureOpen] = useState(false);
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isEditLectureOpen, setIsEditLectureOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Form states
  const [lectureForm, setLectureForm] = useState({
    name: "",
    schedule_days: [] as string[],
    schedule_time: "",
  });

  const [attendanceForm, setAttendanceForm] = useState({
    lecture_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    status: "present" as "present" | "absent" | "cancelled",
  });

  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    if (user && !authLoading) {
      fetchData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      setError("Please log in to view attendance data");
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) {
      const errorMsg = "User not authenticated";
      setError(errorMsg);
      toast.error("Authentication Error", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const [lecturesData, attendanceData] = await Promise.all([
        ApiService.getLectures(),
        ApiService.getAttendance(),
      ]);
      console.log("API Response:", lecturesData, attendanceData);
      
      // Handle lectures data properly
      const lecturesArray = Array.isArray(lecturesData) 
        ? lecturesData 
        : lecturesData?.lectures || [];
      setLectures(lecturesArray);
      
      // Handle attendance data properly
      const attendanceArray = Array.isArray(attendanceData)
        ? attendanceData
        : attendanceData?.attendance || [];
      setAttendance(attendanceArray);

      if (lecturesArray.length === 0) {
        toast.info("No Lectures Found", {
          description: "Create your first lecture to start tracking attendance",
          icon: <Users className="h-4 w-4" />,
        });
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);

      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("Network error")
      ) {
        const networkErrorMsg =
          "Connection failed. Please check your internet connection and try again.";
        setError(networkErrorMsg);
        toast.error("Connection Error", {
          description: networkErrorMsg,
          icon: <AlertCircle className="h-4 w-4" />,
          action: {
            label: "Retry",
            onClick: () => fetchData(),
          },
        });
      } else {
        toast.error("Data Loading Failed", {
          description: errorMessage,
          icon: <AlertCircle className="h-4 w-4" />,
          action: {
            label: "Retry",
            onClick: () => fetchData(),
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLecture = async () => {
    try {
      if (
        !lectureForm.name ||
        !lectureForm.schedule_time ||
        lectureForm.schedule_days.length === 0
      ) {
        const errorMsg = "Please fill in all fields";
        setError(errorMsg);
        toast.error("Validation Error", {
          description: errorMsg,
          icon: <AlertCircle className="h-4 w-4" />,
        });
        return;
      }

      await ApiService.createLecture(lectureForm);

      toast.success("Lecture Created", {
        description: `${lectureForm.name} has been added to your schedule`,
        icon: <Plus className="h-4 w-4" />,
      });

      setIsCreateLectureOpen(false);
      setLectureForm({
        name: "",
        schedule_days: [],
        schedule_time: "",
      });
      fetchData();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to create lecture";
      setError(errorMsg);
      toast.error("Failed to Create Lecture", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  const handleEditLecture = async () => {
    try {
      if (!selectedLecture) return;
      await ApiService.updateLecture(selectedLecture.id, lectureForm);

      toast.success("Lecture Updated", {
        description: `${lectureForm.name} has been updated successfully`,
        icon: <Edit className="h-4 w-4" />,
      });

      setIsEditLectureOpen(false);
      setSelectedLecture(null);
      setLectureForm({
        name: "",
        schedule_days: [],
        schedule_time: "",
      });
      fetchData();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update lecture";
      setError(errorMsg);
      toast.error("Failed to Update Lecture", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    try {
      const lecture = lectures.find((l) => l.id === lectureId);
      const lectureName = lecture?.name || "lecture";
      if (
        !confirm(
          `Are you sure you want to delete "${lectureName}"? This will also delete all associated attendance records.`,
        )
      )
        return;

      await ApiService.deleteLecture(lectureId);

      toast.success("Lecture Deleted", {
        description: `${lectureName} and all its data have been removed`,
        icon: <Trash2 className="h-4 w-4" />,
      });

      fetchData();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete lecture";
      setError(errorMsg);
      toast.error("Failed to Delete Lecture", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  const handleMarkAttendance = async () => {
    try {
      if (!attendanceForm.lecture_id || !attendanceForm.date) {
        const errorMsg = "Please select lecture and date";
        setError(errorMsg);
        toast.error("Validation Error", {
          description: errorMsg,
          icon: <AlertCircle className="h-4 w-4" />,
        });
        return;
      }

      const lecture = lectures.find((l) => l.id === attendanceForm.lecture_id);
      const lectureName = lecture?.name || "lecture";

      await ApiService.createAttendance(attendanceForm);

      const statusIcon =
        attendanceForm.status === "present"
          ? CheckCircle
          : attendanceForm.status === "absent"
            ? XCircle
            : Clock;

      toast.success("Attendance Marked", {
        description: `Marked ${attendanceForm.status} for ${lectureName}`,
        icon: React.createElement(statusIcon, { className: "h-4 w-4" }),
      });

      setIsMarkAttendanceOpen(false);
      setAttendanceForm({
        lecture_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        status: "present",
      });
      fetchData();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to mark attendance";
      setError(errorMsg);
      toast.error("Failed to Mark Attendance", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  const handleUpdateAttendance = async (
    attendanceId: string,
    status: "present" | "absent" | "cancelled",
  ) => {
    try {
      await ApiService.markAttendance(attendanceId, status);

      const statusIcon =
        status === "present"
          ? CheckCircle
          : status === "absent"
            ? XCircle
            : Clock;

      toast.success("Attendance Updated", {
        description: `Status changed to ${status}`,
        icon: React.createElement(statusIcon, { className: "h-4 w-4" }),
      });

      fetchData();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update attendance";
      setError(errorMsg);
      toast.error("Failed to Update Attendance", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  const openEditLecture = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setLectureForm({
      name: lecture.name,
      schedule_days: lecture.schedule_days,
      schedule_time: lecture.schedule_time,
    });
    setIsEditLectureOpen(true);
  };

  const toggleScheduleDay = (day: string) => {
    setLectureForm((prev) => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter((d) => d !== day)
        : [...prev.schedule_days, day],
    }));
  };

  const getLectureAttendance = (lectureId: string) => {
    return attendance?.filter((a) => a.lecture_id === lectureId) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200";
      case "absent":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "absent":
        return <XCircle className="h-3 w-3 text-red-600" />;
      case "cancelled":
        return <Clock className="h-3 w-3 text-gray-600" />;
      default:
        return <Clock className="h-3 w-3 text-gray-600" />;
    }
  };

  // Loading states
  if (authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading && user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
<Layout>
      <div className="min-h-screen">
        {/* Header Section - Responsive */}
        <div
          className={cn(
            "sticky top-0 z-30 w-full px-4 py-4 sm:px-6 flex items-center justify-between transition-all duration-300 ease-in-out backdrop-blur-md",
            isScrolled
              ? "bg-white/60 dark:bg-zinc-900/60 border-b border-white/20 dark:border-zinc-700/20 shadow-md"
              : "bg-transparent border-b border-transparent",
          )}
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
              Attendance
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">
              Track and manage your class attendance
            </p>
          </div>
          {/* Responsive Actions */}
          <div className="flex gap-2">
            {/* Desktop: Full Buttons */}
            <div className="hidden sm:flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info("Refreshing Data", {
                    description:
                      "Loading latest attendance and lecture data...",
                    icon: <RefreshCw className="h-4 w-4" />,
                  });
                  fetchData();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog
                open={isMarkAttendanceOpen}
                onOpenChange={setIsMarkAttendanceOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Mark Attendance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lecture">Lecture</Label>
                    <Select
                      value={attendanceForm.lecture_id}
                      onValueChange={(value) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          lecture_id: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lecture" />
                      </SelectTrigger>
                      <SelectContent>
                        {lectures.map((lecture) => (
                          <SelectItem key={lecture.id} value={lecture.id}>
                            {lecture.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      type="date"
                      value={attendanceForm.date}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={attendanceForm.status}
                      onValueChange={(
                        value: "present" | "absent" | "cancelled",
                      ) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleMarkAttendance} className="w-full">
                    Mark Attendance
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={isCreateLectureOpen}
                onOpenChange={setIsCreateLectureOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lecture
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Create New Lecture</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Lecture Name</Label>
                    <Input
                      value={lectureForm.name}
                      onChange={(e) =>
                        setLectureForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Data Structures"
                    />
                  </div>


                  <div className="space-y-2">
                    <Label>Schedule Days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {weekDays.map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={
                            lectureForm.schedule_days.includes(day)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleScheduleDay(day)}
                          className="text-xs"
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      type="time"
                      value={lectureForm.schedule_time}
                      onChange={(e) =>
                        setLectureForm((prev) => ({
                          ...prev,
                          schedule_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <Button onClick={handleCreateLecture} className="w-full">
                    Create Lecture
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
            </div>
            {/* Mobile: Icon-Only Buttons */}
            <div className="flex gap-1 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  toast.info("Refreshing Data", {
                    description:
                      "Loading latest attendance and lecture data...",
                    icon: <RefreshCw className="h-4 w-4" />,
                  });
                  fetchData();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog
                open={isMarkAttendanceOpen}
                onOpenChange={setIsMarkAttendanceOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Mark Attendance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lecture">Lecture</Label>
                    <Select
                      value={attendanceForm.lecture_id}
                      onValueChange={(value) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          lecture_id: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lecture" />
                      </SelectTrigger>
                      <SelectContent>
                        {lectures.map((lecture) => (
                          <SelectItem key={lecture.id} value={lecture.id}>
                            {lecture.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      type="date"
                      value={attendanceForm.date}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={attendanceForm.status}
                      onValueChange={(
                        value: "present" | "absent" | "cancelled",
                      ) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleMarkAttendance} className="w-full">
                    Mark Attendance
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={isCreateLectureOpen}
                onOpenChange={setIsCreateLectureOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Create New Lecture</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Lecture Name</Label>
                    <Input
                      value={lectureForm.name}
                      onChange={(e) =>
                        setLectureForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Data Structures"
                    />
                  </div>


                  <div className="space-y-2">
                    <Label>Schedule Days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {weekDays.map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={
                            lectureForm.schedule_days.includes(day)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleScheduleDay(day)}
                          className="text-xs"
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      type="time"
                      value={lectureForm.schedule_time}
                      onChange={(e) =>
                        setLectureForm((prev) => ({
                          ...prev,
                          schedule_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <Button onClick={handleCreateLecture} className="w-full">
                    Create Lecture
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div
            className={cn(
              "space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500 transition-all",
              isScrolled && "blur-sm brightness-90 scale-[0.99]",
            )}
          >
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      fetchData();
                    }}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Lectures Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lectures.map((lecture) => {
                const lectureAttendance = getLectureAttendance(lecture.id);
                const attendancePercentage = lecture.attendance_percentage;
                const needsAttention = attendancePercentage < 75;

                return (
                  <Card
                    key={lecture.id}
                    className={cn(
                      "transition-all hover:shadow-md",
                      needsAttention && "border-orange-200",
                    )}
                  >
                    <CardHeader className="space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{lecture.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditLecture(lecture)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLecture(lecture.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          {lecture.schedule_time} •{" "}
                            {lecture.schedule_days?.join(", ") || "No days scheduled"}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Attendance</span>
                          <span
                            className={cn(
                              "font-medium",
                              needsAttention ? "text-orange-600" : "text-green-600",
                            )}
                          >
                            {attendancePercentage}%
                          </span>
                        </div>
                        <Progress value={attendancePercentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {lecture.attended_classes}/{lecture.total_classes}{" "}
                            classes
                          </span>
                          {needsAttention && (
                            <span className="text-orange-600">
                              Need {lecture.classes_to_75_percent} more
                            </span>
                          )}
                        </div>
                      </div>
                      {lectureAttendance.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">Recent Attendance</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {lectureAttendance.slice(0, 5).map((record) => (
                              <div
                                key={record.id}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(record.status)}
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(record.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs capitalize",
                                      getStatusColor(record.status),
                                    )}
                                  >
                                    {record.status}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateAttendance(
                                            record.id,
                                            "present",
                                          )
                                        }
                                        className="text-green-600"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-2" />
                                        Mark Present
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateAttendance(
                                            record.id,
                                            "absent",
                                          )
                                        }
                                        className="text-red-600"
                                      >
                                        <XCircle className="h-3 w-3 mr-2" />
                                        Mark Absent
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateAttendance(
                                            record.id,
                                            "cancelled",
                                          )
                                        }
                                        className="text-gray-600"
                                      >
                                        <Clock className="h-3 w-3 mr-2" />
                                        Mark Cancelled
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {lectures.length === 0 && !isLoading && !error && (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No lectures found</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first lecture to start tracking attendance
                    </p>
                    <Button onClick={() => setIsCreateLectureOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Lecture
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Edit Lecture Dialog */}
        <Dialog open={isEditLectureOpen} onOpenChange={setIsEditLectureOpen}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Edit Lecture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Lecture Name</Label>
                <Input
                  value={lectureForm.name}
                  onChange={(e) =>
                    setLectureForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g., Data Structures"
                />
              </div>


              <div className="space-y-2">
                <Label>Schedule Days</Label>
                <div className="grid grid-cols-2 gap-2">
                  {weekDays.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={
                        lectureForm.schedule_days.includes(day)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleScheduleDay(day)}
                      className="text-xs"
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  type="time"
                  value={lectureForm.schedule_time}
                  onChange={(e) =>
                    setLectureForm((prev) => ({
                      ...prev,
                      schedule_time: e.target.value,
                    }))
                  }
                />
              </div>

              <Button onClick={handleEditLecture} className="w-full">
                Update Lecture
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
