import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, BookOpen, Calendar, Clock, X, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function NotificationBell({ onSelectAnnouncement }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const trayRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.getUnreadNotificationCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count every 30 seconds and on initial mount
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // When tray opens, fetch full notification list
  useEffect(() => {
    if (isOpen) {
      fetchAllNotifications();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (trayRef.current && !trayRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.markNotificationRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.dismissNotification(id);
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        fetchUnreadCount();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={trayRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: isOpen ? 'var(--slate-100)' : 'transparent',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius-md)',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--slate-700)',
          transition: 'all 0.15s ease',
        }}
        title="View Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Tray */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--slate-200)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--slate-100)',
              background: 'var(--slate-50)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                <Bell size={28} color="var(--slate-300)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                  No Notifications
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  You are all caught up on campus events and announcements.
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.is_read;
                const isAcademic = n.notification_type === 'academic';

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(n.id, { stopPropagation: () => {} });
                      if (onSelectAnnouncement && n.announcement_id) {
                        onSelectAnnouncement(n.announcement_id);
                        setIsOpen(false);
                      }
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--slate-100)',
                      background: isUnread ? '#f8faff' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      transition: 'background 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        background: isAcademic ? '#fef3c7' : '#e0e7ff',
                        color: isAcademic ? '#b45309' : '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {isAcademic ? <BookOpen size={16} /> : <Calendar size={16} />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            fontWeight: isUnread ? 700 : 600,
                            fontSize: '0.85rem',
                            color: 'var(--slate-900)',
                            lineHeight: 1.3,
                          }}
                        >
                          {n.title}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: 'var(--primary-600)',
                              flexShrink: 0,
                              marginLeft: '6px',
                              marginTop: '5px',
                            }}
                          ></span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: '0.775rem',
                          color: 'var(--slate-600)',
                          marginTop: '0.2rem',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {n.message}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.4rem',
                          fontSize: '0.7rem',
                          color: 'var(--slate-400)',
                        }}
                      >
                        <span>{n.created_at || 'Just now'}</span>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-600)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDismiss(n.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--slate-400)',
                              cursor: 'pointer',
                            }}
                            title="Dismiss"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
