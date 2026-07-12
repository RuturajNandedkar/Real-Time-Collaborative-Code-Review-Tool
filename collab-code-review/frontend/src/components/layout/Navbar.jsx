import { Link, useNavigate } from 'react-router-dom';
import { Code2, LogOut, User, PlusCircle, Bell } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-brand-500/30 group-hover:shadow-md transition-all">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gradient">CollabCode</span>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center gap-2">
            <Link to="/rooms/new" className="btn-primary text-xs px-3 py-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              New Room
            </Link>

            {/* User Avatar */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors">
                <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
                  {user?.username}
                </span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="btn-ghost p-2 rounded-lg text-slate-500 hover:text-red-500"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
