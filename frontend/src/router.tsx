import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RoleProvider } from "@/lib/role-context";
import DashboardRoute from "@/routes/Dashboard";
import ReturnsRoute from "@/routes/Returns";
import ReturnWorkspaceRoute from "@/routes/ReturnWorkspace";
import FieldDetailRoute from "@/routes/FieldDetail";
import DocumentsRoute from "@/routes/Documents";
import DocumentDetailRoute from "@/routes/DocumentDetail";
import ClientPortalRoute from "@/routes/ClientPortal";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RoleProvider>
        <AppShell />
      </RoleProvider>
    ),
    children: [
      { index: true, element: <DashboardRoute /> },
      { path: "returns", element: <ReturnsRoute /> },
      { path: "returns/:returnId", element: <ReturnWorkspaceRoute /> },
      { path: "returns/:returnId/fields/:fieldId", element: <FieldDetailRoute /> },
      { path: "documents", element: <DocumentsRoute /> },
      { path: "documents/:documentId", element: <DocumentDetailRoute /> },
      { path: "portal/:clientId", element: <ClientPortalRoute /> },
    ],
  },
]);
