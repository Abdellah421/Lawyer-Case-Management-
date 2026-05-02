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
    const activeClass = 'text-primary';
    const inactiveClass = 'text-light-subtle dark:text-dark-subtle';

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeClass : inactiveClass}`}
        >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
};


const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-light-card dark:bg-dark-card border-t border-gray-200 dark:border-dark-border shadow-lg z-50">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
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
    </footer>
  );
};

export default BottomNav;