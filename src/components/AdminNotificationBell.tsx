import React, { useState, useEffect, useRef } from 'react';
import { AdminNotification } from '../types';
import { 
  getAdminNotifications, 
  markAdminNotificationAsRead, 
  markAllAdminNotificationsAsRead, 
  clearAdminNotifications 
} from '../store';
import { playPaymentNotificationChime, requestBrowserNotificationPermission } from '../utils/notificationSound';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  DollarSign, 
  ArrowDownCircle, 
  MessageSquare, 
  Users, 
  Volume2, 
  VolumeX, 
  Clock, 
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'users' | 'investments' | 'withdrawals' | 'settings' | 'messages', extraData?: any) => void;
}

export default function AdminNotificationBell({ onNavigateTab }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('zaru_admin_sound_enabled') !== 'false';
  });
  const prevCountRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const list = getAdminNotifications();
    setNotifications(list);
    return list;
  };

  useEffect(() => {
    const initialList = loadNotifications();
    prevCountRef.current = initialList.length;

    // Listen for storage / custom events
    const handleUpdate = () => {
      const updated = loadNotifications();
      // If a new notification arrived, play chime if sound enabled
      if (updated.length > prevCountRef.current) {
        const latest = updated[0];
        if (latest && latest.type === 'NEW_PAYMENT' && soundEnabled) {
          playPaymentNotificationChime();
        }
      }
      prevCountRef.current = updated.length;
    };

    window.addEventListener('saposa_admin_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('saposa_admin_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('zaru_admin_sound_enabled', String(next));
    if (next) {
      playPaymentNotificationChime();
    }
  };

  const handleNotificationClick = (item: AdminNotification) => {
    markAdminNotificationAsRead(item.id);
    loadNotifications();
    setIsOpen(false);

    if (item.linkTab) {
      onNavigateTab(item.linkTab, {
        investorName: item.investorName,
        investmentId: item.investmentId,
        userId: item.userId
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasUnreadPayment = notifications.some(n => !n.read && n.type === 'NEW_PAYMENT');

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          requestBrowserNotificationPermission();
        }}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          hasUnreadPayment
            ? 'bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500/30'
            : unreadCount > 0
            ? 'bg-red-950/60 border-red-700 text-red-400 hover:bg-red-900/60'
            : 'bg-neutral-900 border-neutral-700 text-gray-300 hover:text-white hover:border-neutral-600'
        }`}
        title="Admin Notifications Hub"
      >
        <Bell className={`w-5 h-5 ${hasUnreadPayment ? 'animate-bounce text-amber-400' : ''}`} />
        
        {unreadCount > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-lg ${
            hasUnreadPayment
              ? 'bg-amber-400 text-black animate-pulse'
              : 'bg-red-600 text-white'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-neutral-950 border border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-600/20 rounded-lg text-red-500">
                <Bell className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-white">Admin Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    markAllAdminNotificationsAsRead();
                    loadNotifications();
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all notifications?')) {
                      clearAdminNotifications();
                      loadNotifications();
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
                <p className="font-medium text-gray-400">No notifications yet</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  When new investors pay for a plan or upload receipts, real-time alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isPayment = item.type === 'NEW_PAYMENT';
                const isWithdrawal = item.type === 'NEW_WITHDRAWAL';
                const isMessage = item.type === 'NEW_MESSAGE';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-left ${
                      !item.read
                        ? isPayment
                          ? 'bg-amber-950/20 hover:bg-amber-900/30 border-l-4 border-amber-500'
                          : 'bg-neutral-900/80 hover:bg-neutral-800 border-l-4 border-red-600'
                        : 'hover:bg-neutral-900/60 opacity-80'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isPayment
                        ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                        : isWithdrawal
                        ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40'
                        : isMessage
                        ? 'bg-blue-400/20 text-blue-400 border border-blue-400/40'
                        : 'bg-neutral-800 text-gray-400 border border-neutral-700'
                    }`}>
                      {isPayment ? (
                        <DollarSign className="w-5 h-5 font-bold" />
                      ) : isWithdrawal ? (
                        <ArrowDownCircle className="w-5 h-5" />
                      ) : isMessage ? (
                        <MessageSquare className="w-5 h-5" />
                      ) : (
                        <Users className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                            isPayment
                              ? 'bg-amber-400 text-black font-extrabold'
                              : isWithdrawal
                              ? 'bg-emerald-900/80 text-emerald-400'
                              : 'bg-neutral-800 text-gray-300'
                          }`}>
                            {item.type.replace('_', ' ')}
                          </span>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      <h5 className={`text-xs font-bold leading-tight ${isPayment ? 'text-amber-300' : 'text-white'}`}>
                        {item.title}
                      </h5>

                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Action pill */}
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 truncate font-mono">
                          {item.investorName} {item.amount ? `• ₦${item.amount.toLocaleString()}` : ''}
                        </span>
                        <span className={`font-semibold flex items-center gap-0.5 ${
                          isPayment ? 'text-amber-400 hover:underline' : 'text-gray-400 hover:text-white'
                        }`}>
                          <span>{isPayment ? 'Review Proof' : 'View Details'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-neutral-900/90 border-t border-neutral-800 text-center">
            <button
              type="button"
              onClick={() => onNavigateTab('investments')}
              className="text-xs text-[#00A86B] hover:text-green-400 font-semibold inline-flex items-center gap-1"
            >
              <span>Go to Payments & Proofs Desk</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
