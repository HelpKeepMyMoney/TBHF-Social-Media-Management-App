'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastProvider } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, networkError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-warm">
        <PageLoader />
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-warm">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-gray-800">Unable to connect</p>
          <p className="text-sm text-gray-500">Check your internet connection and refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    // useAuth handles redirect to /login
    return null;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-surface-warm">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
