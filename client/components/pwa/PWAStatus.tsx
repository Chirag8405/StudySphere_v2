import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Download } from "lucide-react";
import { toast } from "sonner";

export const PWAStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if app is installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isInWebAppMode = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppMode);

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back Online", {
        description: "Your internet connection has been restored",
        icon: <Wifi className="h-4 w-4" />,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're Offline", {
        description: "Some features may be limited without internet connection",
        icon: <WifiOff className="h-4 w-4" />,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check for service worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setUpdateAvailable(true);
      });

      // Listen for service worker updates
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    setUpdateAvailable(true);
                    toast.info("Update Available", {
                      description:
                        "A new version of StudySphere is ready to install",
                      icon: <Download className="h-4 w-4" />,
                      action: {
                        label: "Update Now",
                        onClick: handleUpdate,
                      },
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          toast.success("Updating App", {
            description: "Installing the latest version...",
            icon: <Download className="h-4 w-4" />,
          });
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        }
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="text-xs flex items-center gap-1"
      >
        {isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {isOnline ? "Online" : "Offline"}
      </Badge>

      {/* Installed Status */}
      {isInstalled && (
        <Badge variant="secondary" className="text-xs flex items-center gap-1">
          <Download className="h-3 w-3" />
          App
        </Badge>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <Badge
          variant="outline"
          className="text-xs flex items-center gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={handleUpdate}
        >
          <Download className="h-3 w-3" />
          Update
        </Badge>
      )}
    </div>
  );
};
