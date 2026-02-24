import { Authenticated, Refine } from "@refinedev/core";
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
import { Register } from "./pages/register";
import { ForgotPassword } from "./pages/forgot-password";
import { TimeSheetPage } from "./modules/hr/timesheets/my-timesheet/page";
import { TimeSheetList } from "./modules/hr/timesheets/my-timesheet/list";
import { TimeOffPage } from "./modules/hr/time-off/page";
import { TimeOffList } from "./modules/hr/time-off/list";
import { SupervisorDashboard } from "./modules/hr/timesheets/supervisor-dashboard/page";
import { UserList } from "./modules/admin/users/list";
import { HolidayList } from "./modules/hr/holidays/list";
import { RolesList } from "./modules/admin/roles/list";

import { DepartmentsList } from "./modules/admin/departments";
import { HRAuditDashboard } from "./modules/hr/audit/HRAuditDashboard";

import { useMemo } from "react";
import { combinedAuthProvider } from "./combinedAuthProvider";
import { useAuthStore } from "./stores/authStore";
import axios from "axios";
import { defineAbilityFor, subject as caslSubjectWrap, Subjects } from "./auth/ability";

import { useSessionSync } from "./hooks/useSessionSync";
import { resources } from "./config/resources";

const API_URL = import.meta.env.VITE_API_URL + "/api";

const axiosInstance = axios.create();
axiosInstance.defaults.withCredentials = true;

function App() {
  console.log("[App] Configured API_URL:", API_URL);
  console.log("[App] VITE_API_URL:", import.meta.env.VITE_API_URL);

  // Use the custom hook for session synchronization
  useSessionSync();

  const { isSupervisor, userRole, directReports, userId } = useAuthStore();

  // Memoize the ability for performance (Best Practice)
  const ability = useMemo(() => {
    return defineAbilityFor({
      id: userId || 'unknown',
      role: userRole || 'user',
      isSupervisor: isSupervisor,
      directReports: directReports
    });
  }, [userId, userRole, isSupervisor, directReports]);

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
                // ... (rest of code)
                can: async ({ resource, action, params }) => {
                  const act = action || 'list';

                  let subjectObj: any;
                  if (!params?.resource) {
                    subjectObj = resource || 'all';
                  } else {
                    // ABAC check: Wrap the data with its resource name for CASL
                    subjectObj = caslSubjectWrap(resource as Subjects, params.resource);
                  }

                  const can = ability.can(act as any, subjectObj);

                  console.log(`[ACL] Check: ${act} on ${typeof subjectObj === 'string' ? subjectObj : (resource || 'unknown')} -> Result: ${can}`);

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

                  </Route>
                  <Route path="/hr/holidays" element={<HolidayList />} />
                  <Route path="/hr/audit" element={<HRAuditDashboard />} />

                  <Route path="/supervisor" element={<SupervisorDashboard />} />
                  <Route path="/admin/users" element={<UserList />} />
                  <Route path="/admin/departments" element={<DepartmentsList />} />
                  <Route path="/admin/roles" element={<RolesList />} />
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
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
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
