import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  Wifi,
  WifiOff,
  Download,
  Plus,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import React from "react";

export class NotificationService {
  // Success notifications
  static success(
    title: string,
    description: string,
    icon?: React.ReactElement,
  ) {
    toast.success(title, {
      description,
      icon: icon || React.createElement(CheckCircle, { className: "h-4 w-4" }),
    });
  }

  // Error notifications
  static error(
    title: string,
    description: string,
    action?: { label: string; onClick: () => void },
  ) {
    toast.error(title, {
      description,
      icon: React.createElement(AlertCircle, { className: "h-4 w-4" }),
      action,
    });
  }

  // Warning notifications
  static warning(title: string, description: string) {
    toast.warning(title, {
      description,
      icon: React.createElement(AlertTriangle, { className: "h-4 w-4" }),
    });
  }

  // Info notifications
  static info(
    title: string,
    description: string,
    action?: { label: string; onClick: () => void },
  ) {
    toast.info(title, {
      description,
      icon: React.createElement(Info, { className: "h-4 w-4" }),
      action,
    });
  }

  // Loading notifications
  static loading(title: string, description: string) {
    return toast.loading(title, {
      description,
      icon: React.createElement(Loader2, { className: "h-4 w-4 animate-spin" }),
    });
  }

  // Specific operation notifications
  static created(itemType: string, itemName: string) {
    const icons = {
      lecture: Plus,
      assignment: BookOpen,
      attendance: CheckCircle,
    };

    const IconComponent = icons[itemType as keyof typeof icons] || Plus;

    this.success(
      `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Created`,
      `${itemName} has been added successfully`,
      React.createElement(IconComponent, { className: "h-4 w-4" }),
    );
  }

  static updated(itemType: string, itemName: string) {
    this.success(
      `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Updated`,
      `${itemName} has been updated successfully`,
      React.createElement(Edit, { className: "h-4 w-4" }),
    );
  }

  static deleted(itemType: string, itemName: string) {
    this.success(
      `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Deleted`,
      `${itemName} has been removed`,
      React.createElement(Trash2, { className: "h-4 w-4" }),
    );
  }

  static attendanceMarked(
    status: "present" | "absent" | "cancelled",
    lectureName: string,
  ) {
    const icons = {
      present: CheckCircle,
      absent: XCircle,
      cancelled: Clock,
    };

    const IconComponent = icons[status];

    this.success(
      "Attendance Marked",
      `Marked ${status} for ${lectureName}`,
      React.createElement(IconComponent, { className: "h-4 w-4" }),
    );
  }

  static statusChanged(itemType: string, itemName: string, newStatus: string) {
    const statusIcons = {
      completed: CheckCircle,
      pending: Clock,
      missed: AlertTriangle,
      present: CheckCircle,
      absent: XCircle,
      cancelled: Clock,
    };

    const IconComponent =
      statusIcons[newStatus as keyof typeof statusIcons] || CheckCircle;

    this.success(
      "Status Updated",
      `${itemName} marked as ${newStatus}`,
      React.createElement(IconComponent, { className: "h-4 w-4" }),
    );
  }

  // Connection status notifications
  static connectionRestored() {
    this.success(
      "Back Online",
      "Your internet connection has been restored",
      React.createElement(Wifi, { className: "h-4 w-4" }),
    );
  }

  static connectionLost() {
    this.warning(
      "You're Offline",
      "Some features may be limited without internet connection",
    );
  }

  // App update notifications
  static updateAvailable(onUpdate: () => void) {
    this.info(
      "Update Available",
      "A new version of StudySphere is ready to install",
      {
        label: "Update Now",
        onClick: onUpdate,
      },
    );
  }

  static updateInstalling() {
    this.success(
      "Updating App",
      "Installing the latest version...",
      React.createElement(Download, { className: "h-4 w-4" }),
    );
  }

  // Authentication notifications
  static loginSuccess() {
    this.success(
      "Login Successful",
      "Welcome back to StudySphere!",
      React.createElement(GraduationCap, { className: "h-4 w-4" }),
    );
  }

  static signupSuccess() {
    this.success(
      "Account Created Successfully!",
      "Welcome to StudySphere! You're now logged in.",
      React.createElement(GraduationCap, { className: "h-4 w-4" }),
    );
  }

  static loggedOut() {
    this.info("Logged Out", "You have been successfully logged out");
  }

  // Data loading notifications
  static noDataFound(itemType: string, suggestion: string) {
    this.info(
      `No ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Found`,
      suggestion,
    );
  }

  static networkError(retryAction?: () => void) {
    this.error(
      "Connection Error",
      "Unable to connect to server. Please check your internet connection.",
      retryAction ? { label: "Retry", onClick: retryAction } : undefined,
    );
  }

  static validationError(message: string) {
    this.error("Validation Error", message);
  }

  // Theme change notification
  static themeChanged(newTheme: "light" | "dark") {
    this.success(
      "Theme Changed",
      `Switched to ${newTheme} mode`,
      React.createElement("div", {
        className: `h-4 w-4 rounded-full ${newTheme === "dark" ? "bg-slate-800" : "bg-yellow-400"}`,
      }),
    );
  }

  // Refresh notification
  static refreshing(itemType: string) {
    this.info(
      "Refreshing Data",
      `Loading latest ${itemType} data...`,
    );
  }

  // Dismiss a specific toast
  static dismiss(toastId: string | number) {
    toast.dismiss(toastId);
  }

  // Dismiss all toasts
  static dismissAll() {
    toast.dismiss();
  }
}

// Export individual functions for convenience
export const {
  success,
  error,
  warning,
  info,
  loading,
  created,
  updated,
  deleted,
  attendanceMarked,
  statusChanged,
  connectionRestored,
  connectionLost,
  updateAvailable,
  updateInstalling,
  loginSuccess,
  signupSuccess,
  loggedOut,
  noDataFound,
  networkError,
  validationError,
  themeChanged,
  refreshing,
  dismiss,
  dismissAll,
} = NotificationService;
