import React from 'react';
import { NavigationTab } from '../types';
import { BriefcaseIcon, CalendarIcon, CheckSquareIcon, SettingsIcon, UsersIcon, HomeIcon } from '../constants';

interface BottomNavProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
}

const NavItem: React.FC<{
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => {
    // Premium UI: Smooth transitions, subtle scale, and comfortable tap targets
    const activeClass = 'text-primary';
    const inactiveClass = 'text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text';

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ease-in-out ${isActive ? activeClass : inactiveClass} focus:outline-none select-none`}
            style={{ minHeight: '56px', WebkitTapHighlightColor: 'transparent' }}
        >
            <div className={`relative flex items-center justify-center p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10 dark:bg-primary/20 scale-110' : 'bg-transparent scale-100'}`}>
                <Icon className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-medium mt-1 transition-all duration-300 ${isActive ? 'opacity-100 transform translate-y-0' : 'opacity-70 transform translate-y-0.5'}`}>{label}</span>
        </button>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-light-card/95 dark:bg-dark-card/95 backdrop-blur-md border-t border-gray-200/50 dark:border-dark-border/50 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.4)] z-50 transition-colors duration-300">
      {/* Apply safe-area inset directly as padding to a wrapper, keeping the background color extended */}
      <div className="w-full" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div className="flex justify-around items-center max-w-lg mx-auto w-full px-1">
          <NavItem 
            icon={HomeIcon} 
            label="الرئيسية" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={BriefcaseIcon} 
            label="القضايا" 
            isActive={activeTab === 'cases'} 
            onClick={() => setActiveTab('cases')} 
          />
          <NavItem 
            icon={CalendarIcon} 
            label="الأجندة" 
            isActive={activeTab === 'agenda'} 
            onClick={() => setActiveTab('agenda')} 
          />
          <NavItem 
            icon={UsersIcon} 
            label="الموكلون" 
            isActive={activeTab === 'clients'} 
            onClick={() => setActiveTab('clients')} 
          />
          <NavItem 
            icon={CheckSquareIcon} 
            label="المهام" 
            isActive={activeTab === 'tasks'} 
            onClick={() => setActiveTab('tasks')} 
          />
          <NavItem 
            icon={SettingsIcon} 
            label="الإعدادات" 
            isActive={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>
      </div>
    </footer>
  );
};

export default BottomNav;