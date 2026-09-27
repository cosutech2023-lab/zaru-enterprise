import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import { User } from './types';
import { getStoreUsers, updateStoreUser } from './store';

type ViewState = 'landing' | 'user' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalConfig, setAuthModalConfig] = useState<{ isOpen: boolean, mode: 'login' | 'register' | 'admin' }>({ isOpen: false, mode: 'login' });

  // Check if session exists (simplified auth via localStorage)
  useEffect(() => {
    const sessionUserId = localStorage.getItem('saposa_session');
    if (sessionUserId === 'admin') {
      setView('admin');
    } else if (sessionUserId) {
      const users = getStoreUsers();
      const user = users.find(u => u.id === sessionUserId);
      if (user) {
        setCurrentUser(user);
        setView('user');
      }
    }
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' | 'admin') => {
    setAuthModalConfig({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModalConfig({ ...authModalConfig, isOpen: false });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('saposa_session', user.id);
    setView('user');
    handleCloseAuth();
  };

  const handleAdminLogin = () => {
    localStorage.setItem('saposa_session', 'admin');
    setView('admin');
    handleCloseAuth();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('saposa_session');
    setView('landing');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    updateStoreUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-black font-sans">
      {view === 'landing' && (
        <Landing onOpenAuth={handleOpenAuth} />
      )}

      {view === 'user' && currentUser && (
        <UserDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          onUpdateUser={handleUpdateUser}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard onLogout={handleLogout} />
      )}

      {authModalConfig.isOpen && (
        <AuthModal 
          initialMode={authModalConfig.mode}
          onLogin={handleLogin}
          onAdminLogin={handleAdminLogin}
          onClose={handleCloseAuth}
        />
      )}
    </div>
  );
}
