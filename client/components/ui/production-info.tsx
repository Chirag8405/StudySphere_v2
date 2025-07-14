import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, X, UserPlus } from "lucide-react";

export const ProductionInfo: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    // Show info if it's the first visit to production
    const hasSeenProductionInfo = localStorage.getItem("hasSeenProductionInfo");
    if (!hasSeenProductionInfo) {
      setShowInfo(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowInfo(false);
    localStorage.setItem("hasSeenProductionInfo", "true");
  };

  if (!showInfo) {
    return null;
  }

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md shadow-lg border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 lg:left-auto lg:right-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Production Mode Active
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Demo data has been removed. Create your account to start tracking
              your academic progress!
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleDismiss}
                className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Got it!
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
