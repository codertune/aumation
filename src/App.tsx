import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ServicePage from './pages/ServicePage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAdminOnly?: boolean;
}

function ProtectedRoute({ children, isAdminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  console.log('ProtectedRoute: user =', user);
  console.log('ProtectedRoute: isLoading =', isLoading);
  console.log('ProtectedRoute: isAdminOnly =', isAdminOnly);

  if (isLoading) {
    console.log('ProtectedRoute: Still loading, showing spinner');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to home. User state:', user);
    return <Navigate to="/" replace />;
  }

  if (isAdminOnly && !user.isAdmin) {
    console.log('ProtectedRoute: User is not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering children. User:', user);
  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute isAdminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppContent />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
