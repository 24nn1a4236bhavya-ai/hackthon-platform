import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="bg-red-950/40 border border-red-800 text-red-300 p-6 rounded-xl max-w-md">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm text-red-200/80 mb-4">
            Your current role (<strong>{user.role}</strong>) does not have sufficient permissions to
            access this section.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return children;
};
