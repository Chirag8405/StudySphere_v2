import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiService, Assignment } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  MoreVertical,
  Filter,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "subject">(
    "due_date",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Form state
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    subject: "",
    description: "",
    due_date: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    filterAndSortAssignments();
  }, [assignments, activeTab, searchTerm, sortBy, sortOrder]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      setError(null);
    const payload = await ApiService.getAssignments();

    const raw: Assignment[] = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as any).assignments)
      ? (payload as any).assignments
      : [];

  const now = new Date();
    const assignmentList = raw.map((a) => {
      const status = (a.status ?? "pending").toLowerCase() as
        | "pending"
        | "completed"
        | "missed";

      return {
        ...a,
        status,
        is_overdue: status === "pending" && new Date(a.due_date) < now,
      };
    });

      console.log("Fetching assignments...");
console.log("Fetched data:", payload);
console.log("Assignments parsed:", assignmentList);


      setAssignments(assignmentList);

      // Show info if no assignments found
      if (assignmentList.length === 0) {
        toast.info("No Assignments Found", {
          description:
            "Create your first assignment to start tracking your tasks",
          icon: <BookOpen className="h-4 w-4" />,
        });
      }
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);

      // Enhanced error notifications
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("Network error")
      ) {
        toast.error("Connection Error", {
          description:
            "Unable to connect to server. Please check your internet connection.",
          icon: <AlertTriangle className="h-4 w-4" />,
          action: {
            label: "Retry",
            onClick: () => fetchAssignments(),
          },
        });
      } else {
        toast.error("Failed to Load Assignments", {
          description: errorMessage,
          icon: <AlertTriangle className="h-4 w-4" />,
          action: {
            label: "Retry",
            onClick: () => fetchAssignments(),
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortAssignments = () => {
    let filtered = [...assignments];

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((assignment) => {
        if (activeTab === "overdue") {
          return assignment.is_overdue;
        }
return assignment.status.toLowerCase() === activeTab;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (assignment) =>
          assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.subject.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sort assignments
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "due_date":
          compareValue =
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "subject":
          compareValue = a.subject.localeCompare(b.subject);
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    setFilteredAssignments(filtered);
  };

  const handleCreateAssignment = async () => {
    setIsSubmitting(true);
    try {
      if (
        !assignmentForm.title ||
        !assignmentForm.subject ||
        !assignmentForm.due_date
      ) {
        const errorMsg = "Please fill in all required fields";
        setError(errorMsg);
        toast.error("Validation Error", {
          description: errorMsg,
          icon: <AlertTriangle className="h-4 w-4" />,
        });
        return;
      }

      await ApiService.createAssignment(assignmentForm);

      toast.success("Assignment Created", {
        description: `${assignmentForm.title} has been added to your assignments`,
        icon: <Plus className="h-4 w-4" />,
      });

      setIsCreateOpen(false);
      resetForm();
      fetchAssignments();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to create assignment";
      setError(errorMsg);
      toast.error("Failed to Create Assignment", {
        description: errorMsg,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }
    finally{
      setIsSubmitting(false);
    }
  };

  const handleEditAssignment = async () => {
    setIsSubmitting(true);
    try {
      if (!selectedAssignment) return;

      await ApiService.updateAssignment(selectedAssignment.id, assignmentForm);

      toast.success("Assignment Updated", {
        description: `${assignmentForm.title} has been updated successfully`,
        icon: <Edit className="h-4 w-4" />,
      });

      setIsEditOpen(false);
      setSelectedAssignment(null);
      resetForm();
      
      await fetchAssignments();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update assignment";
      setError(errorMsg);
      toast.error("Failed to Update Assignment", {
        description: errorMsg,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }finally{
      setIsSubmitting(false);
    }
  };


  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      const assignmentTitle = assignment?.title || "assignment";

      if (!confirm(`Are you sure you want to delete "${assignmentTitle}"?`))
        return;

      await ApiService.deleteAssignment(assignmentId);

      toast.success("Assignment Deleted", {
        description: `${assignmentTitle} has been removed`,
        icon: <Trash2 className="h-4 w-4" />,
      });

      fetchAssignments();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete assignment";
      setError(errorMsg);
      toast.error("Failed to Delete Assignment", {
        description: errorMsg,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }
  };

  const handleStatusChange = async (
    assignmentId: string,
    status: "pending" | "completed" | "missed",
  ) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      const assignmentTitle = assignment?.title || "assignment";

      await ApiService.patchAssignmentStatus(assignmentId, status);

      const statusIcon =
        status === "completed"
          ? CheckCircle
          : status === "missed"
            ? AlertTriangle
            : Clock;

      toast.success("Status Updated", {
        description: `${assignmentTitle} marked as ${status}`,
        icon: React.createElement(statusIcon, { className: "h-4 w-4" }),
      });

      fetchAssignments();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update status";
      setError(errorMsg);
      toast.error("Failed to Update Status", {
        description: errorMsg,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }
  };

  const openEditModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      subject: assignment.subject,
      description: assignment.description || "",
      due_date: assignment.due_date,
      priority: assignment.priority,
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setAssignmentForm({
      title: "",
      subject: "",
      description: "",
      due_date: "",
      priority: "medium",
    });
  };

  const getStatusBadgeVariant = (assignment: Assignment) => {
    if (assignment.is_overdue) return "destructive";
    switch (assignment.status) {
      case "completed":
        return "default";
      case "missed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusText = (assignment: Assignment) => {
    if (assignment.is_overdue && assignment.status === "pending") {
      return "overdue";
    }
    return assignment.status;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getAssignmentCounts = () => {
    return {
      all: assignments.length,
      pending: assignments.filter((a) => a.status === "pending").length,
      completed: assignments.filter((a) => a.status === "completed").length,
      missed: assignments.filter((a) => a.status === "missed").length,
      overdue: assignments.filter((a) => a.is_overdue).length,
    };
  };

  const counts = getAssignmentCounts();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 sm:h-8 bg-muted rounded w-1/3"></div>
            <div className="h-8 sm:h-10 bg-muted rounded"></div>
            <div className="space-y-3 sm:space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 sm:h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 animate-in fade-in-50 duration-500">
        {/* Sticky Glass Navbar */}
        <div
          className="sticky top-0 z-30 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-3 sm:py-4
          flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6
          border-b border-white/20 dark:border-zinc-700/20
          bg-transparent backdrop-blur-lg shadow-lg shadow-black/5 transition-all duration-300"
        >
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Assignments
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
              Manage your assignments and deadlines
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto lg:w-auto shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Add Assignment</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="mx-2 sm:mx-4 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-sm sm:max-w-md rounded-lg"
              aria-describedby="create-assignment-description"
            >
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription id="create-assignment-description">
                  Fill in the details to create a new assignment with title, subject, due date, and priority.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="create-title" className="text-sm">
                    Title *
                  </Label>
                  <Input
                    id="create-title"
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Assignment title"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-subject" className="text-sm">
                    Subject *
                  </Label>
                  <Input
                    id="create-subject"
                    value={assignmentForm.subject}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Subject or course"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-description" className="text-sm">
                    Description
                  </Label>
                  <Textarea
                    id="create-description"
                    value={assignmentForm.description}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Assignment description..."
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-due-date" className="text-sm">
                    Due Date *
                  </Label>
                  <Input
                    id="create-due-date"
                    type="date"
                    value={assignmentForm.due_date}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        due_date: e.target.value,
                      }))
                    }
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-priority" className="text-sm">
                    Priority
                  </Label>
                  <Select
                    value={assignmentForm.priority}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        priority: value,
                      }))
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateAssignment}
                  className="w-full text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Assignment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="mx-1 sm:mx-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 lg:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

          <div className="flex gap-2 sm:gap-2">
            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-24 sm:w-32 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="shrink-0"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="grid w-full grid-cols-5 min-w-[320px] sm:min-w-[500px] h-auto">
              <TabsTrigger
                value="all"
                className="text-[10px] xs:text-xs sm:text-sm py-2 px-1"
              >
                <span className="hidden xs:inline">All</span>
                <span className="xs:hidden">All</span>
                <span className="ml-1">({counts.all})</span>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="text-[10px] xs:text-xs sm:text-sm py-2 px-1"
              >
                <span className="hidden sm:inline">Pending</span>
                <span className="sm:hidden">Pend</span>
                <span className="ml-1">({counts.pending})</span>
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-[10px] xs:text-xs sm:text-sm py-2 px-1"
              >
                <span className="hidden sm:inline">Completed</span>
                <span className="sm:hidden">Done</span>
                <span className="ml-1">({counts.completed})</span>
              </TabsTrigger>
              <TabsTrigger
                value="missed"
                className="text-[10px] xs:text-xs sm:text-sm py-2 px-1"
              >
                <span className="hidden xs:inline">Missed</span>
                <span className="xs:hidden">Miss</span>
                <span className="ml-1">({counts.missed})</span>
              </TabsTrigger>
              <TabsTrigger
                value="overdue"
                className="text-[10px] xs:text-xs sm:text-sm text-red-600 py-2 px-1"
              >
                <span className="hidden sm:inline">Overdue</span>
                <span className="sm:hidden">Over</span>
                <span className="ml-1">({counts.overdue})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-3 sm:space-y-4">
            {filteredAssignments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {filteredAssignments.map((assignment) => {
                  const daysUntilDue = differenceInDays(
                    parseISO(assignment.due_date),
                    new Date(),
                  );
                  const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0;

                  return (
                    <Card
                      key={assignment.id}
                      className={cn(
                        "transition-all hover:shadow-md",
                        assignment.is_overdue && "border-red-200 bg-red-50/30",
                        isUrgent && "border-orange-200 bg-orange-50/30",
                      )}
                    >
                      <CardContent className="p-3 sm:p-4 lg:p-6">
                        <div className="flex flex-col space-y-3 sm:space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base lg:text-lg font-semibold leading-tight truncate">
                                {assignment.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {assignment.subject}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditModal(assignment)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {assignment.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        assignment.id,
                                        "completed",
                                      )
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                {assignment.status === "completed" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        assignment.id,
                                        "pending",
                                      )
                                    }
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Mark Pending
                                  </DropdownMenuItem>
                                )}
                                {assignment.status !== "missed" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusChange(
                                        assignment.id,
                                        "missed",
                                      )
                                    }
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Mark Missed
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteAssignment(assignment.id)
                                  }
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {assignment.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {assignment.description}
                            </p>
                          )}

                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                              <span className="text-xs sm:text-sm">
                                Due{" "}
                                {format(
                                  parseISO(assignment.due_date),
                                  "MMM d, yyyy",
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {assignment.is_overdue ? (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] xs:text-xs px-2 py-1"
                                >
                                  Overdue
                                </Badge>
                              ) : isUrgent ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] xs:text-xs bg-orange-100 text-orange-800 px-2 py-1"
                                >
                                  Due Soon
                                </Badge>
                              ) : daysUntilDue > 0 ? (
                                <span className="text-[10px] xs:text-xs text-muted-foreground">
                                  {daysUntilDue} days left
                                </span>
                              ) : null}

                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] xs:text-xs px-2 py-1",
                                  getPriorityColor(assignment.priority),
                                )}
                              >
                                {assignment.priority}
                              </Badge>

                              <Badge
                                variant={getStatusBadgeVariant(assignment)}
                                className="text-[10px] xs:text-xs px-2 py-1"
                              >
                                {getStatusText(assignment)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
      <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />

      {/* If truly no assignments at all, show the “create your first assignment” */}
      {counts.all === 0 ? (
        <>
          <h3 className="text-sm sm:text-base lg:text-lg font-medium mb-2">
            No assignments yet
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
            Create your first assignment to get started
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto text-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment
          </Button>
        </>
      ) : (
        // We have assignments in “All,” but none in this tab
        (() => {
          switch (activeTab) {
            case "pending":
              return (
                <>
                  <h3 className="text-sm sm:text-base lg:text-lg font-medium mb-2">
                    No pending assignments
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                    All caught up!
                  </p>
                </>
              );
            case "completed":
              return (
                <>
                  <h3 className="text-sm sm:text-base lg:text-lg font-medium mb-2">
                    No completed assignments
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                    You haven’t completed any yet.
                  </p>
                </>
              );
            case "missed":
              return (
                <>
                  <h3 className="text-sm sm:text-base lg:text-lg font-medium mb-2">
                    No missed assignments
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                    Great job staying on track!
                  </p>
                </>
              );
            case "overdue":
              return (
                <>
                  <h3 className="text-sm sm:text-base lg:text-lg font-medium mb-2 text-red-600">
                    No overdue assignments
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                    You’re all caught up.
                  </p>
                </>
              );
            default:
              return null;
          }
        })()
      )}
    </CardContent>
  </Card>
)}
          </TabsContent>
        </Tabs>

        {/* Edit Assignment Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent 
            className="mx-2 sm:mx-4 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-sm sm:max-w-md rounded-lg"
            aria-describedby="edit-assignment-description"
          >
            <DialogHeader>
              <DialogTitle>Edit Assignment</DialogTitle>
              <DialogDescription id="edit-assignment-description">
                Update the title, subject, due date, or priority of the selected assignment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm">
                  Title *
                </Label>
                <Input
                  id="edit-title"
                  value={assignmentForm.title}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Assignment title"
                  className="text-sm"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="edit-subject" className="text-sm">
                  Subject *
                </Label>
                <Input
                  id="edit-subject"
                  value={assignmentForm.subject}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="Subject or course"
                  className="text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={assignmentForm.description}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Assignment description..."
                  rows={3}
                  className="text-sm"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="edit-due-date" className="text-sm">
                  Due Date *
                </Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={assignmentForm.due_date}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                  className="text-sm"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="edit-priority" className="text-sm">
                  Priority
                </Label>
                <Select
                  value={assignmentForm.priority}
                  onValueChange={(value: "low" | "medium" | "high") =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      priority: value,
                    }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <Button onClick={handleEditAssignment} className="w-full text-sm" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update Assignment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
