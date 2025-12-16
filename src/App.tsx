import { Authenticated, GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "refine-pocketbase";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import "./App.css";
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";

import { ITCategoryList } from "./pages/it-category/list";
import { ITCategoryCreate } from "./pages/it-category/create";
import { ITCategoryEdit } from "./pages/it-category/edit";
import { ITCategoryShow } from "./pages/it-category/show";
import { ITManufacturerList } from "./pages/it-manufacturer/list";
import { Dashboard } from "./pages/dashboard";
import { Login } from "./pages/login";
import { TimeSheetPage } from "./pages/timesheets";
import { TimeSheetList } from "./pages/timesheets/list";
import { SupervisorDashboard } from "./components/timesheets/SupervisorDashboard";
import { useState, useEffect } from "react";
import pb from "./pocketbase";
import { combinedAuthProvider } from "./combinedAuthProvider";

function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [isSupervisor, setIsSupervisor] = useState(!!(pb.authStore.record as any)?.is_supervisor);

  useEffect(() => {
    return pb.authStore.onChange((token, model) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setIsSupervisor(!!(model as any)?.is_supervisor);
    });
  }, []);

  const resources = [
    {
       name: "dashboard",
       list: "/",
       meta: {
           label: "Dashboard",
       }
    },
    {
      name: "IT_Category",
      list: "/it-category",
      create: "/it-category/create",
      edit: "/it-category/edit/:id",
      show: "/it-category/show/:id",
      meta: {
        label: "Categories",
      },
    },
    {
      name: "IT_Manufacturer",
      list: "/it-manufacturer",
      create: "/it-manufacturer/create",
      edit: "/it-manufacturer/edit/:id",
      show: "/it-manufacturer/show/:id",
      meta: {
        label: "Manufacturers",
      },
    },
    {
        name: "HR",
        meta: {
            label: "HR"
        }
    },
    {
      name: "TimeSheets",
      list: "/timesheets",
      create: "/timesheets/entry",
      meta: {
        label: "My TimeSheet",
        parent: "HR"
      },
    },
    ...(isSupervisor ? [{
      name: "Supervisor",
      list: "/supervisor",
      meta: {
          label: "Supervisor Dashboard",
          parent: "HR"
      }
    }] : [])
  ];

  return (
    <BrowserRouter> 
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
            <Refine
              dataProvider={dataProvider(pb)}
              liveProvider={liveProvider(pb)}
              authProvider={combinedAuthProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              resources={resources}
              accessControlProvider={{
                can: async ({ resource }) => {
                   // Fallback security, though resource won't exist in menu if hidden
                  if (resource === "Supervisor") {
                    const user = pb.authStore.record;
                    const isSup = (user as any)?.is_supervisor || false;
                    return { can: isSup };
                  }
                  return { can: true };
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
                  <Route path="/supervisor" element={<SupervisorDashboard />} />
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
