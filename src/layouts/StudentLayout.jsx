import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../services/firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

const StudentLayout = () => {
  const { currentUser, faceEnrolled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isEnrollRoute = location.pathname.includes('/enroll-face');
  const isExamRoute = location.pathname.includes('/exam/');

  // Enforce face enrollment for all student routes except the enrollment page itself
  React.useEffect(() => {
    if (currentUser && !faceEnrolled && !isEnrollRoute) {
      navigate('/student/enroll-face', { replace: true });
    }
  }, [currentUser, faceEnrolled, isEnrollRoute, navigate]);

  const handleLogout = async () => {
    await logoutUser(currentUser?.uid);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isExamRoute && (
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-2">ExamGuard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-500">{currentUser?.email}</span>
              <button 
                onClick={handleLogout} 
                className="flex items-center text-gray-600 hover:text-red-600 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </button>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 w-full mx-auto relative z-0 flex flex-col h-full bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
