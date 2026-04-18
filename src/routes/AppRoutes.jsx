import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import SignInDemo from '../pages/auth/SignInDemo';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';

import AdminDashboard from '../pages/admin/Dashboard';
import TestManagement from '../pages/admin/TestManagement';
import LiveMonitoring from '../pages/admin/LiveMonitoring';

import StudentDashboard from '../pages/student/Dashboard';
import TakeExam from '../pages/student/TakeExam';
import FaceEnrollment from '../pages/student/FaceEnrollment';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signin-demo" element={<SignInDemo />} />
      
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="tests" element={<TestManagement />} />
          <Route path="monitoring" element={<LiveMonitoring />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="enroll-face" element={<FaceEnrollment />} />
          <Route path="exam/:testId" element={<TakeExam />} />
        </Route>
      </Route>

      <Route path="/unauthorized" element={<div className="p-10 text-center text-red-500 text-2xl font-bold">Unauthorized Access</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
