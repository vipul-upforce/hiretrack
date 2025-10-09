"use client";

import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  KanbanSquare,
  Calendar,
  ChevronRight,
  LogOut,
  Home,
  Users,
  Settings,
  SearchCheckIcon,
  Link2Icon,
  UploadIcon,
  BarChart3Icon,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";
import { IUser } from "@/lib/models/user";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { setAllowMultipleOrgs } from "@/lib/features/org/orgSlice";
import { logout } from "@/lib/redux/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import PortalHead from "@/components/layouts/PortalHead";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { NotificationButton } from "@/components/ui/notifications";
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from "@/lib/features/notifications/notificationsApi";
import { CandidateDetailsDialog } from "./jobs/[id]/components/Dialogs/candidate-details-dialog";
import { useLazyFetchCandidateByIdQuery } from "@/lib/features/candidate/candidateApi";
import { Candidate } from "@/types/candidate";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import OnboardingSidebar from "@/components/onboarding/OnboardingSidebar";
import SidebarLogo from "@/components/layouts/SidebarLogo";
import SidebarContent from "@/components/layouts/SidebarContent";
import { useGetOrganizationAllowanceQuery } from "@/lib/features/org/orgApi";
import { useCheckOrgQuery } from "@/lib/features/org/orgApi";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  role?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-5 w-5" />,
  },
  {
    title: "Search",
    href: "/dashboard/search",
    icon: <SearchCheckIcon className="h-5 w-5" />,
    role: "interviewer",
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs-board",
    icon: <KanbanSquare className="h-5 w-5" />,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3Icon className="h-5 w-5" />,
    role: "admin", // HR and Admin users can access analytics
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    role: "admin",
  },
  {
    title: "CV Upload",
    href: "/dashboard/cv-upload",
    icon: <UploadIcon className="h-5 w-5" />,
    role: "interviewer",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    role: "admin",
  },
  // {
  //   title: "Email History",
  //   href: "/dashboard/email-history",
  //   icon: <Mail className="h-5 w-5" />,
  //   role: "admin",
  // },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userData, setUserData] = useState<IUser | null>(null);
  const {
    data: portalConfigData,
    isLoading,
    refetch,
  } = useGetPortalConfigsQuery(undefined);
  const { setUserLoggedIn } = useCustomFields();
  const {
    data: allowanceData,
    isLoading: allowanceLoading,
    error: allowanceError,
  } = useGetOrganizationAllowanceQuery();
  const [hasMultipleOrgs, seHasMultipleOrgs] = useState(false);

  // Notification hooks
  const [notificationPage, setNotificationPage] = useState(1);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] =
    useState(false);
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: fetchNotifications,
  } = useGetNotificationsQuery(
    { page: notificationPage, limit: 10 },
    { skip: !userData } // Skip query if no user data
  );
  const { data: notificationCountData } = useGetNotificationCountQuery(
    undefined,
    { skip: !userData, pollingInterval: 30000 } // Poll every 30 seconds for real-time updates
  );
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  // Notification handlers
  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // For interviewers, handle candidate-related and meeting notifications by opening dialog
    if (
      // userData?.role === "interviewer" &&
      (notification.relatedEntity === "candidate" ||
        notification.relatedEntity === "followup" ||
        notification.relatedEntity === "checklist" ||
        notification.relatedEntity === "meeting") &&
      notification.relatedId
    ) {
      try {
        const result = await fetchCandidateById(notification.relatedId);
        if (result.data) {
          setSelectedCandidate(result.data);
          setIsCandidateDialogOpen(true);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch candidate:", error);
        toast({
          title: "Error",
          description: "Failed to load candidate details",
          variant: "destructive",
        });
      }
    }
    // For admin/hr or non-candidate notifications, navigate to the page
    if (notification.actionUrl) {
      // window.location.href = notification.actionUrl;
      router.push(notification.actionUrl);
      // router.refresh();
      // window.location.reload();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };
  const { user } = useSelector((state: any) => state.auth || {});
  const {
    data: orgCheckData,
    error: orgCheckError,
    isLoading: orgCheckLoading,
  } = useCheckOrgQuery(user?.organizationId, { skip: !user });

  const dispatch = useDispatch();
  const allowMultipleOrgs = useSelector(
    (state: RootState) => state.organization.allowMultipleOrgs
  );

  useEffect(() => {
    if (allowanceData) {
      seHasMultipleOrgs(allowanceData.allow);
      dispatch(setAllowMultipleOrgs(allowanceData.allow));
    }
  }, [allowanceData, dispatch]);

  useEffect(() => {
    if (orgCheckData && !orgCheckData.exists) {
      Cookies.remove("token");
      dispatch(logout());
      fetch("/api/auth/logout");
      window.location.href = "/auth/login";
    }
  }, [orgCheckData, dispatch]);

  useEffect(() => {
    if (user) {
      setUserLoggedIn(true);
      setUserData(user);
      refetch();
    }
  }, [user]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isSmallScreen = window.innerWidth < 1200;
      const userPreference = sessionStorage.getItem("sidebar-user-preference");

      // On small screens, default to collapsed unless user has explicitly expanded
      if (isSmallScreen) {
        if (userPreference === "expanded") {
          setIsCollapsed(false);
        } else {
          setIsCollapsed(true);
        }
      } else {
        // On large screens, respect user preference or default to expanded
        if (userPreference === "collapsed") {
          setIsCollapsed(true);
        } else {
          setIsCollapsed(false);
        }
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Remove isCollapsed dependency to avoid infinite loops

  const handleLogout = async () => {
    // Cookies.remove("token");
    dispatch(logout());
    await fetch("/api/auth/logout");
    setUserData(null);
    setUserLoggedIn(false);
    refetch();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    window.location.href = "/auth/login";
  };

  const generate_share_org = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedUser = user;

    // console.log(user);
    // if (user) {
    //   const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
    //   if (decryptedResponse.success && decryptedResponse.user) {
    //     parsedUser = decryptedResponse.user;
    //   }
    // }
    if (parsedUser) {
      let url;
      if (hasMultipleOrgs) {
        url = `${window.location.origin}/apply-jobs?o=${parsedUser.organizationInfo?.name}`;
      } else {
        url = `${window.location.origin}/apply-jobs`;
      }
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({
            title: "Success",
            description: "Organization sharing URL is copied to your clipboard",
            variant: "default",
          });
        })
        .catch((err) => {
          toast({
            title: "Error",
            description: err.message || "Failed to get the org url.",
            variant: "destructive",
          });
        });
    }
  };

  const { theme } = useTheme();

  // Helper function to get user avatar
  const getUserAvatar = () => {
    // Use theme-appropriate icon
    return theme === "dark" ? "/icon_dark.png" : "/icon.png";
  };

  // Helper function to get user initials
  const getUserInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };


  // Inject portal colors as CSS custom properties
  useEffect(() => {
    // console.log("Portal config data:", portalConfigData);
    if (portalConfigData?.primaryColor && portalConfigData?.secondaryColor) {
      // console.log("Injecting portal colors:", {
      //   primary: portalConfigData.primaryColor,
      //   secondary: portalConfigData.secondaryColor,
      // });
      const root = document.documentElement;
      root.style.setProperty("--portal-primary", portalConfigData.primaryColor);
      root.style.setProperty(
        "--portal-secondary",
        portalConfigData.secondaryColor
      );

      // Create lighter and darker variants for hover states
      const primaryRgb = hexToRgb(portalConfigData.primaryColor);
      const secondaryRgb = hexToRgb(portalConfigData.secondaryColor);

      if (primaryRgb) {
        root.style.setProperty(
          "--portal-primary-rgb",
          `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`
        );
        root.style.setProperty(
          "--portal-primary-hover",
          darkenColor(portalConfigData.primaryColor, 10)
        );
        root.style.setProperty(
          "--portal-primary-light",
          lightenColor(portalConfigData.primaryColor, 10)
        );

        // Update focus ring colors to use portal primary
        root.style.setProperty(
          "--focus-ring-color",
          `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`
        );
        root.style.setProperty(
          "--input-border-focus",
          portalConfigData.primaryColor
        );
      }

      if (secondaryRgb) {
        root.style.setProperty(
          "--portal-secondary-rgb",
          `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`
        );
        root.style.setProperty(
          "--portal-secondary-hover",
          darkenColor(portalConfigData.secondaryColor, 10)
        );
        root.style.setProperty(
          "--portal-secondary-light",
          lightenColor(portalConfigData.secondaryColor, 10)
        );
      }
    }
  }, [portalConfigData]);

  // Helper functions for color manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const darkenColor = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = (100 - percent) / 100;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);

    // Ensure we always return a valid 6-digit hex
    const result = ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
    return `#${result}`;
  };

  const lightenColor = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percent / 100;
    const r = Math.round(rgb.r + (255 - rgb.r) * factor);
    const g = Math.round(rgb.g + (255 - rgb.g) * factor);
    const b = Math.round(rgb.b + (255 - rgb.b) * factor);

    // Ensure we always return a valid 6-digit hex
    const result = ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
    return `#${result}`;
  };

  // Memoized handlers to prevent re-renders
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      sessionStorage.setItem(
        "sidebar-user-preference",
        newState ? "collapsed" : "expanded"
      );
      return newState;
    });
  }, []);

  const handleMarkAsReadCallback = useCallback(
    async (id: string) => {
      try {
        await markAsRead(id).unwrap();
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [markAsRead]
  );

  const handleMarkAllAsReadCallback = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  }, [markAllAsRead, toast]);

  return (
    <OnboardingProvider>
      <div className="w-full max-w-full flex" style={{ overflowX: "hidden" }}>
        <PortalHead isLoading={true} />
        <aside
          className={cn(
            "hidden h-screen border-r bg-background md:block transition-all duration-300",
            isCollapsed ? "w-[70px]" : "w-[240px]"
          )}
        >
          <SidebarContent
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
            userData={userData}
            portalConfigData={portalConfigData}
            isLoading={isLoading}
            theme={theme}
            sidebarItems={sidebarItems}
            notificationsData={notificationsData}
            notificationCountData={notificationCountData}
            notificationsLoading={notificationsLoading}
            isNotificationDropdownOpen={isNotificationDropdownOpen}
            onNotificationDropdownChange={setIsNotificationDropdownOpen}
            onMarkAsRead={handleMarkAsReadCallback}
            fetchNotifications={fetchNotifications}
            onMarkAllAsRead={handleMarkAllAsReadCallback}
            onNotificationClick={handleNotificationClick}
            onPageChange={setNotificationPage}
            onGenerateShareOrg={generate_share_org}
            onLogout={handleLogout}
          />
        </aside>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden fixed left-4 top-4 z-40"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <SidebarContent
              isCollapsed={false}
              onToggleCollapse={handleToggleCollapse}
              userData={userData}
              portalConfigData={portalConfigData}
              isLoading={isLoading}
              theme={theme}
              sidebarItems={sidebarItems}
              notificationsData={notificationsData}
              notificationCountData={notificationCountData}
              notificationsLoading={notificationsLoading}
              isNotificationDropdownOpen={isNotificationDropdownOpen}
              onNotificationDropdownChange={setIsNotificationDropdownOpen}
              onMarkAsRead={handleMarkAsReadCallback}
              fetchNotifications={fetchNotifications}
              onMarkAllAsRead={handleMarkAllAsReadCallback}
              onNotificationClick={handleNotificationClick}
              onPageChange={setNotificationPage}
              onGenerateShareOrg={generate_share_org}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>
        <main className="w-full overflow-x-hidden overflow-y-hidden h-[100dvh]">
          <div className="max-w-[100%] mx-auto overflow-x-hidden overflow-y-hidden">
            {children}
          </div>
        </main>

        {/* Candidate Details Dialog for Interviewers */}
        <CandidateDetailsDialog
          candidate={selectedCandidate}
          isOpen={isCandidateDialogOpen}
          onOpenChange={setIsCandidateDialogOpen}
          onUpdate={() => {
            // Optionally refresh candidate data
            if (selectedCandidate) {
              fetchCandidateById(selectedCandidate._id);
            }
          }}
          hideEditButton={userData?.role === "interviewer"}
          hideCloseButtons={false}
        />

        {/* Onboarding Modal */}
        <OnboardingModal />
      </div>
    </OnboardingProvider>
  );
}
