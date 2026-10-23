import { Toaster } from "sonner";

import { getAdminConfig } from "../config";

export function AdminToaster() {
  return (
    <Toaster
      theme={getAdminConfig().theme}
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "admin-toast",
          error: "admin-toast-error",
          actionButton: "admin-toast-action",
        },
      }}
    />
  );
}
