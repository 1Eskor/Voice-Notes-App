'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'tag';
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    display_picture: string | null;
  };
  note?: {
    title: string;
  } | null;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial notifications and setup real-time listener
  useEffect(() => {
    const supabase = createClient();

    const initNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        // Fetch last 10 notifications
        const { data, error } = await supabase
          .from('notifications')
          .select('*, actor:actor_id(username, display_picture), note:note_id(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setNotifications((data || []) as NotificationItem[]);

        // Fetch unread count
        const { count, error: countError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (countError) throw countError;
        setUnreadCount(count || 0);

        // Subscribe to real-time notifications
        const channel = supabase
          .channel(`user-notifications-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            async (payload: any) => {
              // Fetch full actor details for the new notification
              const { data: newNotif, error: fetchError } = await supabase
                .from('notifications')
                .select('*, actor:actor_id(username, display_picture), note:note_id(title)')
                .eq('id', payload.new.id)
                .single();

              if (!fetchError && newNotif) {
                setNotifications((prev) => [newNotif as NotificationItem, ...prev.slice(0, 9)]);
                setUnreadCount((prev) => prev + 1);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload: any) => {
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        console.error('Failed to initialize notifications:', err);
      }
    };

    initNotifications();
  }, []);

  // Close dropdown on clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleDropdown = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && unreadCount > 0 && currentUserId) {
      try {
        const supabase = createClient();
        // Optimistically clear visual badge count
        setUnreadCount(0);

        // Mark all as read in Supabase
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', currentUserId)
          .eq('is_read', false);

        if (error) throw error;

        // Update local status of listed items
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
  };

  if (!currentUserId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggleDropdown}
        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 relative cursor-pointer ${
          isOpen
            ? 'bg-neutral-800 border-white/20 text-white'
            : 'bg-neutral-900/40 border-white/5 text-neutral-450 hover:text-white hover:bg-neutral-900/80 hover:border-white/10'
        }`}
        title="Notifications"
      >
        <Bell size={16} />
        
        {/* Unread Indicator Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#080808] animate-pulse" />
        )}
      </button>

      {/* Notifications Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-neutral-950/95 border border-white/10 shadow-2xl backdrop-blur-xl py-2 z-50 flex flex-col max-h-[400px] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          {/* Header */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-neutral-500">
                You&apos;re all caught up! No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => {
                  const actorName = notif.actor?.username || 'Someone';
                  const displayPicture = notif.actor?.display_picture;
                  const initials = actorName.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                        !notif.is_read ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      {/* Actor Avatar */}
                      <Link
                        href={`/profile/${actorName}`}
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0"
                      >
                        {displayPicture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={displayPicture} alt={actorName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-cyan-400">{initials}</span>
                        )}
                      </Link>

                      {/* Content Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-300 leading-normal">
                          <Link
                            href={`/profile/${actorName}`}
                            onClick={() => setIsOpen(false)}
                            className="font-bold text-white hover:text-cyan-400 transition-colors"
                          >
                            @{actorName}
                          </Link>{' '}
                          {notif.type === 'like' && (
                            <>
                              liked your note{' '}
                              <span className="font-semibold text-white">
                                &quot;{notif.note?.title || 'Voice Note'}&quot;
                              </span>
                            </>
                          )}
                          {notif.type === 'comment' && (
                            <>
                              commented on your note{' '}
                              <span className="font-semibold text-white">
                                &quot;{notif.note?.title || 'Voice Note'}&quot;
                              </span>
                            </>
                          )}
                          {notif.type === 'follow' && 'started following you'}
                          {notif.type === 'tag' && (
                            <>
                              tagged you in a comment on{' '}
                              <span className="font-semibold text-white">
                                &quot;{notif.note?.title || 'Voice Note'}&quot;
                              </span>
                            </>
                          )}
                        </p>
                        <span className="text-[9px] text-neutral-500 block mt-1 font-medium">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
