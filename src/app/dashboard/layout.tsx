"use client";

import { useEffect, useState } from "react";
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
    title: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    role: "admin",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    role: "admin",
  },
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

  // Use useEffect to set user data from cookies
  useEffect(() => {
    const user = Cookies.get("user");
    setUserData(user ? JSON.parse(user) : null);
    if (user) {
      setUserLoggedIn(true);
      refetch();
    }
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    // Clear user data and token
    Cookies.remove("user");
    Cookies.remove("token");
    setUserData(null);
    setUserLoggedIn(false);
    refetch();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });

    router.push("/auth/login");
  };

  const generate_share_org = (e: React.FormEvent) => {
    e.preventDefault()
    const url = `${window.location.origin}/${userData?.organizationInfo?.name}/apply-jobs`;
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
          title: "Success",
          description: err.message || "Failed to get the org url.",
          variant: "destructive",
        });
      });
  };

  const shouldShowPortalData = Boolean(
    portalConfigData && userData && portalConfigData.portalName
  );
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center transition-all duration-200 border-b",
          isCollapsed ? "h-16 justify-center px-2" : "h-16 justify-between px-4"
        )}
      >
        {shouldShowPortalData && portalConfigData ? (
          <div className={`flex items-center overflow-hidden `}>
            {portalConfigData.portalLogo?.url && (
              <div
                className={cn(
                  "flex-shrink-0",
                  isCollapsed ? "mx-auto w-0" : "mr-3"
                )}
              >
                <img
                  src={portalConfigData.portalLogo.url}
                  alt={portalConfigData.portalName || "Portal Logo"}
                  className="h-8 w-auto object-contain rounded"
                />
              </div>
            )}
            {!isCollapsed && (
              <h2 className="text-lg font-semibold truncate max-w-[200px]">
                {portalConfigData.portalName}
              </h2>
            )}
          </div>
        ) : !isLoading ? (
          <div
            className={cn(
              "flex items-center",
              isCollapsed && "hidden w-full justify-center"
            )}
          >
            <h2
              className={cn("text-lg font-semibold", isCollapsed && "hidden")}
            >
              Dashboard
            </h2>
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center gap-2",
              isCollapsed && "justify-center w-full"
            )}
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <h2
              className={cn("text-lg font-semibold", isCollapsed && "hidden")}
            >
              Loading
            </h2>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "h-8 w-8 rounded-full flex-shrink-0",
            isCollapsed && "mt-1mb-2"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-1000 ease-in-out",
              isCollapsed ? "rotate-0" : "rotate-180"
            )}
          />
        </Button>
      </div>
      <Separator />
      <div className="flex-1 px-3 mt-2">
        <div className="space-y-2">
          {sidebarItems.map((item) => {
            if (
              (item.role === "admin" && userData?.role !== "admin") ||
              (userData?.role === "interviewer" && item.title === "Jobs") ||
              (userData?.role === "interviewer" && item.title === "Search")
            ) {
              return null;
            }
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                    pathname === item.href && "bg-accent",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                >
                  {item.icon}
                  <span className={cn("", isCollapsed && "hidden")}>
                    {item.title}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Settings and Logout Buttons */}
      <div className="px-3 pb-4 mt-auto space-y-2">

        <div className=" mt-auto space-y-2">
          <div
            className={cn(
              "flex items-center gap-3 border border-gray-200 rounded-xl bg-gray-50 p-2 transition-all",
              isCollapsed ? "justify-center" : "justify-start",
            )}
          >
            {shouldShowPortalData && portalConfigData?.portalLogo?.url && (
              <div className="flex-shrink-0">
                <img
                  src={portalConfigData.portalLogo.url || "/placeholder.svg"}
                  alt={portalConfigData.portalName || "Portal Logo"}
                  className="h-8 w-8 object-cover rounded-full ring-2 ring-gray-200"
                />
              </div>
            )}

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-gray-900">{userData?.name}</p>
                <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto flex-shrink-0 h-8 w-8 rounded-full"
              onClick={generate_share_org}
              title="Copy Portal URL"
            >
              <Link2Icon className="h-4 w-4" />
              <span className="sr-only">Copy Portal URL</span>
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-red-500 bg-red-100 hover:bg-red-200 text-red-600",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className={cn("", isCollapsed && "hidden")}>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full flex" style={{ overflowX: "hidden" }}>
      {/* Sidebar for desktop */}
      <aside
        className={cn(
          "hidden h-screen border-r bg-background md:block transition-all duration-300",
          isCollapsed ? "w-[70px]" : "w-[240px]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar for mobile */}
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
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="w-full overflow-x-hidden overflow-y-scroll h-[100vh]">
        <div className="p-8 pt-4 max-w-[100%] mx-auto overflow-x-hidden overflow-y-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
