import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { currentUser, role, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    // If role is strictly missing or invalid, show a safe intercept rather than blind redirect.
    return (
      <div className="p-10 text-center text-red-500">
         <h1 className="text-2xl font-bold">Unauthorized Access</h1>
         <p>Your current role ({role || 'none'}) does not permit viewing this page.</p>
         <button onClick={() => window.location.href = '/login'} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Return to Login</button>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
