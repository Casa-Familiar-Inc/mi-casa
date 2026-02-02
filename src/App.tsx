import { Authenticated, GitHubBanner, Refine } from "@refinedev/core";
import {
  LayoutDashboard,
  Tags,
  Factory,
  Users,
  Clock,
  ShieldAlert,
  Calendar,
  Building
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
import { HolidayList } from "./modules/hr/holidays/list";
import { TimeOffApprovals } from "./modules/hr/time-off/approvals";
import { DepartmentsList } from "./modules/admin/departments";

import { useState, useEffect, useMemo } from "react";
import { authClient } from "./lib/auth";
import { combinedAuthProvider } from "./combinedAuthProvider";
import { useAuthStore } from "./stores/authStore";
import axios from "axios";
import { defineAbilityFor } from "./auth/ability";

const API_URL = import.meta.env.VITE_API_URL + "/api";

const axiosInstance = axios.create();
axiosInstance.defaults.withCredentials = true;

function App() {
  // const [isSupervisor, setIsSupervisor] = useState(false); // Replaced by Zustand
  const { isSupervisor, setAuthData, clearAuthData, allowedScreens, userRole, directReports, userId } = useAuthStore();
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

      // Robust screens extraction (handling both snake_case and camelCase)
      const rawScreens = user.allowedScreens || user.allowed_screens;
      let screens: string[] = [];

      if (rawScreens) {
        if (Array.isArray(rawScreens)) {
          screens = rawScreens;
        } else if (typeof rawScreens === 'string') {
          try {
            screens = JSON.parse(rawScreens);
          } catch (e) {
            console.error("[App] Failed to parse screens string:", e);
            screens = [];
          }
        }
      }

      // Update Store (Auto-persists)
      setAuthData({
        isSupervisor: isSup,
        directReports: reports,
        userRole: role,
        userId: user.id || null, 
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
      name: "it-category",
      list: "/it-category",
      create: "/it-category/create",
      edit: "/it-category/edit/:id",
      show: "/it-category/show/:id",
      meta: {
        label: "IT Categories",
        icon: <Tags className="h-4 w-4" />
      }
    },
    {
      name: "it-manufacturer",
      list: "/it-manufacturer",
      meta: {
        label: "IT Manufacturers",
        icon: <Factory className="h-4 w-4" />
      }
    },
    {
      name: "departments",
      list: "/admin/departments",
      meta: {
        label: "Departments",
        icon: <Building className="h-4 w-4" />
      }
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
    {
      name: "TimeOffApprovals",
      list: "/hr/time-off/approvals",
      meta: {
        label: "Time Off Approvals",
        parent: "HR",
        icon: <ShieldAlert className="h-4 w-4" />
      },
    },
    {
      name: "Supervisor",
      list: "/supervisor",
      meta: {
        label: "Supervisor Dashboard",
        parent: "HR",
        icon: <ShieldAlert className="h-4 w-4" />
      }
    },
    {
      name: "CompanyCalendar",
      list: "/hr/holidays",
      meta: {
        label: "Company Calendar",
        parent: "HR",
        icon: <Calendar className="h-4 w-4" />
      }
    }
  ];

 
  // Memoize the ability for performance (Best Practice)
  const ability = useMemo(() => {
    return defineAbilityFor({
      id: userId || 'unknown',
      role: userRole || 'user',
      isSupervisor: isSupervisor,
      allowedScreens: allowedScreens,
      directReports: directReports
    });
  }, [userId, userRole, isSupervisor, allowedScreens, directReports]);

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
                can: async ({ resource, action, params }) => {
                  const act = action || 'list';
                  
                  // For menu and basic list checks, use the resource string directly.
                  // Only use the object (params.resource) if we are doing instance-level ABAC.
                  const subject = (act === 'read' || act === 'list' || !params?.resource) 
                    ? (resource || 'all') 
                    : params.resource;

                  const can = ability.can(act, subject);
                  
                  console.log(`[ACL] Check: ${act} on ${typeof subject === 'string' ? subject : JSON.stringify(subject)} -> Result: ${can}`);

                  return { 
                    can,
                    reason: !can ? "No tienes permisos para realizar esta acción" : undefined 
                  };
                },
                options: {
                  buttons: {
                    enableAccessControl: true,
                    hideIfUnauthorized: true,
                  },
                },
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
                    <Route path="approvals" element={<TimeOffApprovals />} />
                  </Route>
                  <Route path="/hr/holidays" element={<HolidayList />} />

                  <Route path="/supervisor" element={<SupervisorDashboard />} />
                  <Route path="/admin/users" element={<UserList />} />
                  <Route path="/admin/departments" element={<DepartmentsList />} />
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
