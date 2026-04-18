import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../services/firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, FileText, Activity } from 'lucide-react';

const AdminLayout = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logoutUser(currentUser?.uid);
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { name: 'Manage Tests', path: '/admin/tests', icon: <FileText className="w-5 h-5 mr-3" /> },
    { name: 'Live Monitoring', path: '/admin/monitoring', icon: <Activity className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md shadow-gray-200 relative">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">ExamGuard Pro</h1>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`flex items-center px-4 py-3 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {link.icon} {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut className="w-5 h-5 mr-3" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
