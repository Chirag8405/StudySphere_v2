import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationService } from "@/lib/notifications";

export default function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!formData.name || !formData.email || !formData.password) {
      const errorMsg = "Please fill in all fields";
      setError(errorMsg);
      toast.error("Validation Error", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    // Name validation
    if (formData.name.trim().length < 2) {
      const errorMsg = "Name must be at least 2 characters long";
      setError(errorMsg);
      toast.error("Invalid Name", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      const errorMsg = "Please enter a valid email address";
      setError(errorMsg);
      toast.error("Invalid Email", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    // Password validation - must match server requirements
    if (formData.password.length < 8) {
      const errorMsg = "Password must be at least 8 characters long";
      setError(errorMsg);
      toast.error("Weak Password", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    // Check password complexity
    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasLowercase = /[a-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    const hasSpecial = /[@$!%*?&]/.test(formData.password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      const missing = [];
      if (!hasUppercase) missing.push("uppercase letter");
      if (!hasLowercase) missing.push("lowercase letter");
      if (!hasNumber) missing.push("number");
      if (!hasSpecial) missing.push("special character (@$!%*?&)");
      
      const errorMsg = `Password must contain: ${missing.join(", ")}`;
      setError(errorMsg);
      toast.error("Password Requirements", {
        description: errorMsg,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    try {
      await signup(
        formData.name.trim(),
        formData.email.toLowerCase().trim(),
        formData.password,
      );
      // If we reach here, signup was successful
      toast.success("Account Created Successfully!", {
        description: "Welcome to StudySphere! You're now logged in.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      setError(errorMsg);

      // Network or server error
      if (
        errorMsg.includes("fetch") ||
        errorMsg.includes("network") ||
        errorMsg.includes("Failed to")
      ) {
        toast.error("Connection Error", {
          description:
            "Unable to connect to server. Please check your internet connection.",
          icon: <AlertCircle className="h-4 w-4" />,
        });
      } else {
        toast.error("Registration Error", {
          description: errorMsg,
          icon: <AlertCircle className="h-4 w-4" />,
        });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Join StudySphere</CardTitle>
          <p className="text-muted-foreground">
            Create your account to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
