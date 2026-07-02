import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications";
import { useRealtimeNotifications } from "../services/realtime";
import type { Notification } from "../types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeNotifications(() => {
    load();
  });

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Notifications
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 12,
                background: "#e94560",
                color: "#fff",
                borderRadius: 12,
                padding: "2px 10px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            opacity: 0.5,
          }}
        >
          No notifications yet
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              style={{
                background: n.is_read ? "#fff" : "#f0f0ff",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 8,
                cursor: n.is_read ? "default" : "pointer",
                border: n.is_read ? "1px solid #eee" : "1px solid #d0d0ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 14, opacity: 0.7 }}>{n.message}</div>
                <div style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.is_read && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#e94560",
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
