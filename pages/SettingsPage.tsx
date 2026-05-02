
import React, { useContext, useState, useEffect } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { SunIcon, MoonIcon, BellIcon } from '../constants';
import { User } from '../types';

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
  onUpdateProfile: (data: { name: string; phone: string }) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout, onUpdateProfile }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { 
    requestPermission, 
    permissionStatus, 
    notificationsEnabled, 
    setNotificationsEnabled, 
    notificationInterval, 
    setNotificationInterval 
  } = useNotification();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || '');
  }, [user]);
  
  useEffect(() => {
    if(user.name !== name || user.phone !== phone) {
        setIsDirty(true);
    } else {
        setIsDirty(false);
    }
  }, [name, phone, user]);

  const handleSave = () => {
    if (isDirty) {
        onUpdateProfile({ name, phone });
        setIsDirty(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">الإعدادات</h1>
      
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-md space-y-6">
        
        <div className="space-y-4">
            <h2 className="font-bold text-lg border-b dark:border-dark-border pb-2">الملف الشخصي</h2>
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">الاسم الكامل</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">رقم الهاتف</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="أدخل رقم الهاتف" className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">البريد الإلكتروني</label>
                    <p className="w-full p-2 text-light-subtle dark:text-dark-subtle">{user.email}</p>
                 </div>
                 <button onClick={handleSave} disabled={!isDirty} className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed">
                    حفظ التغييرات
                </button>
            </div>
        </div>
        
        <div className="space-y-4">
            <h2 className="font-bold text-lg border-b dark:border-dark-border pb-2">التطبيق</h2>
             <div className="flex justify-between items-center">
              <span className="font-semibold">الوضع الداكن</span>
              <button
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={toggleTheme}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-dark-card ${theme === 'dark' ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <span className="sr-only">Switch to {theme === 'light' ? 'dark' : 'light'} mode</span>
                <span
                  aria-hidden="true"
                  className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                >
                  {theme === 'dark' ? <MoonIcon className="w-full h-full p-0.5 text-dark-bg" /> : <SunIcon className="w-full h-full p-0.5 text-gray-500" />}
                </span>
              </button>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold block">إذن التنبيهات</span>
                  <span className="text-xs text-light-subtle dark:text-dark-subtle">
                    {permissionStatus === 'granted' ? 'مفعل في المتصفح' : permissionStatus === 'denied' ? 'مرفوض' : 'يرجى التفعيل'}
                  </span>
                </div>
                {permissionStatus !== 'granted' && (
                  <button
                    onClick={requestPermission}
                    className="flex items-center gap-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-bg/80 transition-colors"
                  >
                    تفعيل التنبيهات
                    <BellIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold block">تنبيهات المهام</span>
                  <span className="text-xs text-light-subtle dark:text-dark-subtle">تلقي إشعارات عند تأخر المهام</span>
                </div>
                <button
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-dark-card ${notificationsEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {notificationsEnabled && (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold block">تكرار فحص المهام</span>
                    <span className="text-xs text-light-subtle dark:text-dark-subtle">كل كم دقيقة يتم فحص المهام المتأخرة</span>
                  </div>
                  <select 
                    value={notificationInterval} 
                    onChange={(e) => setNotificationInterval(Number(e.target.value))}
                    className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border px-2 py-1 rounded-lg text-sm"
                  >
                    <option value={1}>1 دقيقة</option>
                    <option value={5}>5 دقائق</option>
                    <option value={15}>15 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={60}>1 ساعة</option>
                    <option value={360}>6 ساعات</option>
                    <option value={720}>12 ساعة</option>
                    <option value={1440}>يوم كامل</option>
                  </select>
                </div>
              )}
            </div>
        </div>

        <div>
            <button onClick={onLogout} className="w-full text-center text-red-500 font-semibold p-3 rounded-lg hover:bg-red-500/10 transition-colors">
                تسجيل الخروج
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
