import { Authenticated, GitHubBanner, Refine } from "@refinedev/core";
import {
  LayoutDashboard,
  Tags,
  Factory,
  Users,
  Clock,
  ShieldAlert,
  Calendar
} from "lucide-react";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import dataProvider from "@refinedev/simple-rest";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import "./App.css";
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";

import { ITCategoryList } from "./modules/it/categories/list";
import { ITCategoryCreate } from "./modules/it/categories/create";
import { ITCategoryEdit } from "./modules/it/categories/edit";
import { ITCategoryShow } from "./modules/it/categories/show";
import { ITManufacturerList } from "./modules/it/manufacturers/list";
import { Dashboard } from "./pages/dashboard";
import { Login } from "./pages/login";
import { TimeSheetPage } from "./modules/hr/timesheets/my-timesheet/page";
import { TimeSheetList } from "./modules/hr/timesheets/my-timesheet/list";
import { TimeOffPage } from "./modules/hr/time-off/page";
import { TimeOffList } from "./modules/hr/time-off/list";
import { SupervisorDashboard } from "./modules/hr/timesheets/supervisor-dashboard/page";
import { UserList } from "./modules/admin/users/list";
import { useState, useEffect } from "react";
import { authClient } from "./lib/auth";
import { combinedAuthProvider } from "./combinedAuthProvider";
import { useAuthStore } from "./stores/authStore";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/api";

const axiosInstance = axios.create();
axiosInstance.defaults.withCredentials = true;

function App() {
  // const [isSupervisor, setIsSupervisor] = useState(false); // Replaced by Zustand
  const { isSupervisor, setAuthData, clearAuthData } = useAuthStore();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      let hasReports = false;
      let reports = user.directReports;
      
      if (typeof reports === 'string') {
        try {
          reports = JSON.parse(reports);
        } catch (e) {
          reports = [];
        }
      }
      
      if (Array.isArray(reports) && reports.length > 0) {
        hasReports = true;
      }

      const isSup = !!user.isSupervisor || hasReports;
      const role = user.role || 'user';
      
      let screens: string[] = [];
      try {
          if (user.allowedScreens) {
              screens = JSON.parse(user.allowedScreens);
          }
      } catch (e) { /* ignore */ }

      // Update Store (Auto-persists)
      setAuthData({
          isSupervisor: isSup,
          directReports: reports,
          userRole: role,
          allowedScreens: screens
      });

    } else {
      clearAuthData();
    }
  }, [session, setAuthData, clearAuthData]);

  const resources = [
    {
      name: "dashboard",
      list: "/",
      meta: {
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />
      }
    },
    {
        name: "employees", // User Management
        list: "/admin/users",
        meta: {
            label: "Employees",
            icon: <Users className="h-4 w-4" />
        }
    },
    {
      name: "loans",
      list: "/loans",
      meta: {
        label: "Loans",
        icon: <Tags className="h-4 w-4" />
      },
    },
    {
      name: "HR",
      meta: {
        label: "HR",
        icon: <Users className="h-4 w-4" />
      }
    },
    {
      name: "TimeSheets",
      list: "/timesheets",
      create: "/timesheets/entry",
      meta: {
        label: "My TimeSheet",
        parent: "HR",
        icon: <Clock className="h-4 w-4" />
      },
    },
    {
      name: "TimeOff",
      list: "/hr/time-off",
      create: "/hr/time-off/new",
      meta: {
        label: "Time Off Request",
        parent: "HR",
        icon: <Calendar className="h-4 w-4" />
      },
    },
    // We can conditionally add Supervisor here OR rely on accessControl to hide it
    {
      name: "Supervisor",
      list: "/supervisor",
      meta: {
        label: "Supervisor Dashboard",
        parent: "HR",
        icon: <ShieldAlert className="h-4 w-4" />
      }
    }
  ];

  // Access Control Logic
  // Admin: Can do everything.
  // Others: Can only see "allowedScreens" OR "Supervisor" if they are one.
  const { allowedScreens, userRole } = useAuthStore();

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
            <Refine
              dataProvider={dataProvider(API_URL, axiosInstance)}
              authProvider={combinedAuthProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              resources={resources}
              accessControlProvider={{
                can: async ({ resource }) => {
                  const role = userRole || 'user';
                  
                  // Admin Rule
                  if (role === 'admin') return { can: true };

                  // Supervisor Rule
                  if (resource === "Supervisor") {
                    return { can: isSupervisor || role === 'hr' || allowedScreens.includes('Supervisor') };
                  }

                  // Default Allowed Screens
                  // Always allow 'dashboard'
                  if (resource === "dashboard") return { can: true };
                  
                  // My TimeSheet / TimeOff are basic employee features, usually allowed for all users?
                  // If we want strict "Granular Access", we might block them too, but "My TimeSheet" is essential.
                  // Let's assume standard employees get TimeSheets/TimeOff by default unless blocked?
                  // Or let's strictly follow "allowedScreens" if present?
                  // User said "also needs to select permitted screens".
                  // Let's assume:
                  // 1. Basic Modules (TimeSheets, TimeOff) -> Available to all (for now) OR check allowedScreens.
                  //    If we check allowedScreens strictly, existing users might lose access if we don't migrate specific data.
                  //    Let's check if allowedScreens is empty -> allow defaults. If populated -> enforce?
                  //    Safest: Allow basic modules + `allowedScreens`.
                  
                  // HR Menu
                  if (resource === "HR") return { can: true };

                  // TimeSheets & TimeOff - Allow freely or restrict?
                  // User "needs to select permitted screens".
                  // But we also want basics.
                  // For now, let's keep them allowed by default OR check allowedScreens.
                  if (resource === "TimeSheets" || resource === "TimeOff") return { can: true };
                  
                  // For other modules (Loans, Employees, etc):
                  if (resource && allowedScreens.includes(resource)) return { can: true };

                  return { can: false };
                }
              }}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "3yBtTB-fsFiby-E7cCKy",
              }}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated
                      key="authenticated-inner"
                      fallback={<CatchAllNavigate to="/login" />}
                    >
                      <Layout>
                        <Outlet />
                      </Layout>
                    </Authenticated>
                  }
                >
                  <Route index element={<Dashboard />} />

                  <Route path="*" element={<ErrorComponent />} />
                  <Route path="/it-category">
                    <Route index element={<ITCategoryList />} />
                    <Route path="create" element={<ITCategoryCreate />} />
                    <Route path="edit/:id" element={<ITCategoryEdit />} />
                    <Route path="show/:id" element={<ITCategoryShow />} />
                  </Route>
                  <Route path="/it-manufacturer">
                    <Route index element={<ITManufacturerList />} />
                  </Route>
                  <Route path="/timesheets" element={<TimeSheetList />} />
                  <Route path="/timesheets/entry" element={<TimeSheetPage />} />
                  <Route path="/timesheets/view/:id" element={<TimeSheetPage />} />
                  <Route path="/timesheets/review/:email" element={<TimeSheetPage />} />
                  <Route path="/hr/time-off">
                    <Route index element={<TimeOffList />} />
                    <Route path="new" element={<TimeOffPage />} />
                    <Route path="view/:id" element={<TimeOffPage />} />
                  </Route>
                  <Route path="/supervisor" element={<SupervisorDashboard />} />
                  <Route path="/admin/users" element={<UserList />} />
                </Route>
                <Route
                  element={
                    <Authenticated
                      key="authenticated-outer"
                      fallback={<Outlet />}
                    >
                      <NavigateToResource />
                    </Authenticated>
                  }
                >
                  <Route path="/login" element={<Login />} />
                </Route>
              </Routes>

              <Toaster />
              <RefineKbar />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
            <DevtoolsPanel />
          </DevtoolsProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
