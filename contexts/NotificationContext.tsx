
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Task } from '../types';
import { toast } from 'react-hot-toast';
import useLocalStorage from '../hooks/useLocalStorage';

interface NotificationContextType {
  requestPermission: () => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  notificationInterval: number; // In minutes
  setNotificationInterval: (interval: number) => void;
  permissionStatus: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  tasks: Task[];
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, tasks }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>('notifications_enabled', true);
  const [notificationInterval, setNotificationInterval] = useLocalStorage<number>('notification_interval', 60); // Default 1 hour
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<number | null>(null);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      toast.success('تم تفعيل التنبيهات بنجاح');
    } else if (permission === 'denied') {
      toast.error('تم رفض إذن التنبيهات');
    }
  };

  const sendNotification = useCallback((title: string, body: string) => {
    if (!notificationsEnabled) return;

    // In-app alert
    toast.error(`${title}: ${body}`, {
      duration: 5000,
      icon: '⏰',
    });

    // Browser Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
      });
    }
  }, [notificationsEnabled]);

  const checkOverdueTasks = useCallback(() => {
    if (!notificationsEnabled) return;

    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(task => !task.isDone && task.dueDate < today);

    overdueTasks.forEach(task => {
      if (!notifiedTasksRef.current.has(task.id)) {
        sendNotification('مهمة متأخرة', task.description);
        notifiedTasksRef.current.add(task.id);
      }
    });
  }, [tasks, notificationsEnabled, sendNotification]);

  useEffect(() => {
    // Initial check
    checkOverdueTasks();

    // Periodic check based on interval preference (convert minutes to ms)
    const msInterval = notificationInterval * 60000;
    
    // Clear existing interval
    if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
    }
    
    checkIntervalRef.current = window.setInterval(checkOverdueTasks, msInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkOverdueTasks, notificationInterval]);

  return (
    <NotificationContext.Provider value={{ 
        requestPermission, 
        notificationsEnabled, 
        setNotificationsEnabled, 
        notificationInterval, 
        setNotificationInterval,
        permissionStatus
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
