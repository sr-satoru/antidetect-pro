// SPDX-License-Identifier: MIT OR Apache-2.0
// Serviço Global de Notificações do Star Multlogin

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'migration';
  timestamp: number;
  read: boolean;
  meta?: Record<string, any>;
}

type Listener = (notifications: NotificationItem[]) => void;

class NotificationsService {
  private notifications: NotificationItem[] = [];
  private listeners: Set<Listener> = new Set();

  private notify() {
    this.listeners.forEach((fn) => fn([...this.notifications]));
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn([...this.notifications]);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public getAll(): NotificationItem[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public add(item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: number }): NotificationItem {
    const newNotification: NotificationItem = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: item.title,
      description: item.description,
      type: item.type,
      timestamp: item.timestamp || Date.now(),
      read: false,
      meta: item.meta,
    };

    // Mantém as mais recentes no topo (máximo 50)
    this.notifications = [newNotification, ...this.notifications].slice(0, 50);
    this.notify();
    return newNotification;
  }

  public markAsRead(id: string) {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.notify();
  }

  public markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.notify();
  }

  public remove(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  public clearAll() {
    this.notifications = [];
    this.notify();
  }
}

export const serviceNotifications = new NotificationsService();
