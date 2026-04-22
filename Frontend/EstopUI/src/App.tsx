import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AppThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PageLoader from './components/common/PageLoader';

// Lazy-loaded pages for code-splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const StationsPage = lazy(() => import('./pages/stations/StationsPage'));
const StationDetailPage = lazy(() => import('./pages/stations/StationDetailPage'));
const EventsPage = lazy(() => import('./pages/events/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/events/EventDetailPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const AuditPage = lazy(() => import('./pages/audit/AuditPage'));
const DatasetsPage = lazy(() => import('./pages/datasets/DatasetsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <AppThemeProvider>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/stations" element={<StationsPage />} />
                <Route path="/stations/:id" element={<StationDetailPage />} />
                <Route
                  path="/events"
                  element={
                    <ProtectedRoute roles={['OPERATOR', 'SUPERVISOR']}>
                      <EventsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events/:id"
                  element={
                    <ProtectedRoute roles={['OPERATOR', 'SUPERVISOR']}>
                      <EventDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute roles={['SUPERVISOR', 'AUDITOR']}>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute roles={['AUDITOR']}>
                      <AuditPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/datasets"
                  element={
                    <ProtectedRoute roles={['SUPERVISOR']}>
                      <DatasetsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* 404 */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </AppThemeProvider>
  );
}
