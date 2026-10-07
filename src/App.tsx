import React, { useState, useEffect, useCallback } from 'react';
import Landing from './components/Landing';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginPage from './components/AdminLoginPage';
import AuthModal from './components/AuthModal';
import { User } from './types';
import { getStoreUsers, updateStoreUser, initSupabaseSync } from './store';

const checkIsAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    pathname === '/admin' || 
    pathname === '/admin/' || 
    pathname.startsWith('/admin/') ||
    hash === '#admin' ||
    hash === '#/admin'
  );
};

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('saposa_session') === 'admin';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalConfig, setAuthModalConfig] = useState<{ isOpen: boolean, mode: 'login' | 'register' }>({ isOpen: false, mode: 'login' });

  // Sync route from URL
  const updateRouteFromUrl = useCallback(() => {
    const isNowAdmin = checkIsAdminRoute();
    setIsAdminRoute(isNowAdmin);

    const sessionUserId = localStorage.getItem('saposa_session');
    if (sessionUserId === 'admin') {
      setIsAdminAuthenticated(true);
    } else {
      setIsAdminAuthenticated(false);
      if (sessionUserId) {
        const users = getStoreUsers();
        const user = users.find(u => u.id === sessionUserId);
        if (user) {
          setCurrentUser(user);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Listen for browser back / forward navigation and hash changes
    window.addEventListener('popstate', updateRouteFromUrl);
    window.addEventListener('hashchange', updateRouteFromUrl);

    // Initial check
    updateRouteFromUrl();

    // Start Supabase hydration and real-time syncing
    const unsubscribe = initSupabaseSync();

    const handleSynced = () => {
      const currentSessionId = localStorage.getItem('saposa_session');
      if (currentSessionId && currentSessionId !== 'admin') {
        const freshUsers = getStoreUsers();
        const freshUser = freshUsers.find(u => u.id === currentSessionId);
        if (freshUser) {
          setCurrentUser(freshUser);
        }
      }
    };

    window.addEventListener('saposa_store_synced', handleSynced);

    return () => {
      window.removeEventListener('popstate', updateRouteFromUrl);
      window.removeEventListener('hashchange', updateRouteFromUrl);
      if (unsubscribe) unsubscribe();
      window.removeEventListener('saposa_store_synced', handleSynced);
    };
  }, [updateRouteFromUrl]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    updateRouteFromUrl();
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalConfig({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('saposa_session', user.id);
    handleCloseAuth();
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('saposa_session');
  };

  const handleAdminLoginSuccess = () => {
    localStorage.setItem('saposa_session', 'admin');
    setIsAdminAuthenticated(true);
    if (!checkIsAdminRoute()) {
      window.history.pushState({}, '', '/admin');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('saposa_session');
    setIsAdminAuthenticated(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    updateStoreUser(updatedUser);
  };

  // -------------------------------------------------------------
  // RENDER /admin ROUTE (Protected hidden administration)
  // -------------------------------------------------------------
  if (isAdminRoute) {
    if (isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-black font-sans">
          <AdminDashboard onLogout={handleAdminLogout} />
        </div>
      );
    }

    // Protected Admin Login Page at /admin
    return (
      <div className="min-h-screen bg-black font-sans">
        <AdminLoginPage 
          onAdminLogin={handleAdminLoginSuccess}
          onNavigateHome={() => navigateTo('/')}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PUBLIC WEBSITE (Landing Page or Investor Dashboard)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black font-sans">
      {currentUser ? (
        <UserDashboard 
          user={currentUser} 
          onLogout={handleUserLogout} 
          onUpdateUser={handleUpdateUser}
        />
      ) : (
        <Landing onOpenAuth={handleOpenAuth} />
      )}

      {authModalConfig.isOpen && (
        <AuthModal 
          initialMode={authModalConfig.mode}
          onLogin={handleUserLogin}
          onAdminLogin={handleAdminLoginSuccess}
          onClose={handleCloseAuth}
        />
      )}
    </div>
  );
}

