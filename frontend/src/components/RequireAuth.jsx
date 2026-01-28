import { useAuth } from '@/lib/AuthContext';
import { LoginDialog } from "@/components/LoginDialog";
import { useState, useEffect } from "react";

export function RequireAuth({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      setLoginOpen(true);
    }
  }, [isLoadingAuth, user]);

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Sign in required</h2>
          <p className="text-slate-600">Please sign in to access this page.</p>
          <LoginDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                // Prevent closing if auth is required? 
                // Or let them close and see the "Sign in required" screen.
                setLoginOpen(false);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return children;
}