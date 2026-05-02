
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { App as CapacitorApp } from '@capacitor/app';

import * as firestoreService from './services/firestoreService';
import * as authService from './services/authService';
import { FirebaseUser } from './services/authService';

import { Theme, User, Case, Task, Client, NavigationTab, CaseStatus } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { ThemeContext } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

import BottomNav from './components/BottomNav';

// Lazy load all page components. This splits the code into smaller chunks,
// so the user only downloads the code for the page they are viewing.
// This dramatically improves the initial load time of the application.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CasesPage = lazy(() => import('./pages/CasesPage'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const LoadingSpinner: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
);


const App: React.FC = () => {
    const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');
    const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useLocalStorage<NavigationTab>('activeTab', 'dashboard');

    // Data states
    const [cases, setCases] = useState<Case[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    useEffect(() => {
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, [setTheme]);

    const themeValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

    // Android physical back button handler
    const backPressedOnce = useRef(false);
    useEffect(() => {
        const handleBackButton = CapacitorApp.addListener('backButton', () => {
            if (!user) return; // On auth screen, allow default behavior (exit)

            if (activeTab !== 'dashboard') {
                // If not on the main screen, navigate back to dashboard
                setActiveTab('dashboard');
            } else {
                // If already on dashboard, confirm exit with a double-tap
                if (backPressedOnce.current) {
                    CapacitorApp.exitApp();
                } else {
                    backPressedOnce.current = true;
                    toast('اضغط مرة أخرى للخروج', { icon: '👋', duration: 2000 });
                    setTimeout(() => { backPressedOnce.current = false; }, 2000);
                }
            }
        });

        return () => {
            handleBackButton.then(listener => listener.remove());
        };
    }, [user, activeTab, setActiveTab]);

    // Auth state listener
    useEffect(() => {
        // Test Firestore connection on boot
        firestoreService.testConnection();

        const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                setAuthUser(firebaseUser);
                try {
                    const userProfile = await firestoreService.getUserProfile(firebaseUser.uid);
                    if (userProfile) {
                        setUser(userProfile);
                    } else {
                        // Profile document missing in Firestore (e.g. deleted manually).
                        // Log out to avoid an infinite loop on the login screen.
                        console.error('User profile not found in Firestore for uid:', firebaseUser.uid);
                        toast.error('لم يتم العثور على ملف المستخدم. يرجى التسجيل من جديد.');
                        await authService.logout();
                        setAuthUser(null);
                        setUser(null);
                    }
                } catch (error: any) {
                    console.error('Failed to fetch user profile:', error);
                    // Show a specific, actionable message instead of silently failing.
                    if (error?.code === 'permission-denied') {
                        toast.error('خطأ في الصلاحيات. تحقق من قواعد Firestore.');
                    } else {
                        toast.error('فشل في تحميل بيانات المستخدم. تحقق من اتصالك بالإنترنت.');
                    }
                    await authService.logout();
                    setAuthUser(null);
                    setUser(null);
                }
            } else {
                setAuthUser(null);
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Data listeners
    useEffect(() => {
        if (user?.id) {
            const unsubCases = firestoreService.getCases(user.id, setCases);
            const unsubTasks = firestoreService.getTasks(user.id, setTasks);
            const unsubClients = firestoreService.getClients(user.id, setClients);
            return () => {
                unsubCases();
                unsubTasks();
                unsubClients();
            };
        }
    }, [user?.id]);

    // Data Handlers
    const handleAddCase = async (newCase: Omit<Case, 'id' | 'userId'>): Promise<Case | undefined> => {
        if (!user) return;
        try {
            // addDoc writes to Firestore. The live onSnapshot listener will
            // automatically pick up the new document and update the cases state.
            // We do NOT manually fetch the case afterwards to avoid race conditions
            // between the getCase result and the snapshot update.
            await firestoreService.addCase({ ...newCase, userId: user.id });
            toast.success('تمت إضافة القضية بنجاح!');
            // Return undefined so the modal knows the add succeeded and can close.
            return undefined;
        } catch (error) {
            console.error(error);
            toast.error('فشل في إضافة القضية.');
        }
    };
    
    const handleUpdateCase = async (updatedCase: Case) => {
        if (!user) return;
        try {
            await firestoreService.updateCase(user.id, updatedCase.id, updatedCase);
            toast.success('تم تحديث القضية بنجاح!');
        } catch (error) {
            console.error(error);
            toast.error('فشل في تحديث القضية.');
        }
    };

    const handleDeleteCase = async (caseId: string) => {
        if (!user) return;
        // Optimistic update: remove from local state immediately so the UI
        // responds instantly without waiting for the Firestore round-trip.
        // If the delete fails, we restore the previous state.
        const previousCases = cases;
        setCases(prev => prev.filter(c => c.id !== caseId));
        try {
            await firestoreService.deleteCase(user.id, caseId);
            await firestoreService.logEvent(user.id, 'DELETE_CASE', { caseId });
            toast.success('تم حذف القضية بنجاح.');
            // onSnapshot will fire and confirm the removal — the state is already correct.
        } catch (error) {
            // Restore the previous state on failure so nothing is lost.
            setCases(previousCases);
            console.error(error);
            toast.error('فشل في حذف القضية.');
        }
    };
    
    const handleAddTask = async (newTask: Omit<Task, 'id' | 'userId'>) => {
        if (!user) return;
        try {
            await firestoreService.addTask({ ...newTask, userId: user.id });
            toast.success('تمت إضافة المهمة بنجاح!');
        } catch (error) {
            console.error(error);
            toast.error('فشل في إضافة المهمة.');
        }
    };
    
    const handleUpdateTask = async (updatedTask: Task) => {
        if (!user) return;
        try {
            await firestoreService.updateTask(user.id, updatedTask.id, updatedTask);
        } catch (error) {
            console.error(error);
            toast.error('فشل في تحديث المهمة.');
        }
    };
    
    const handleDeleteTask = async (taskId: string) => {
        if (!user) return;
        try {
            await firestoreService.deleteTask(user.id, taskId);
            await firestoreService.logEvent(user.id, 'DELETE_TASK', { taskId });
            toast.success('تم حذف المهمة.');
        } catch (error) {
            console.error(error);
            toast.error('فشل في حذف المهمة.');
        }
    };

    const handleAddClient = async (newClient: Omit<Client, 'id' | 'userId'>) => {
        if (!user) return;
        try {
            await firestoreService.addClient({ ...newClient, userId: user.id });
            toast.success('تمت إضافة الموكل بنجاح!');
        } catch (error) {
            console.error(error);
            toast.error('فشل في إضافة الموكل.');
        }
    };

    const handleUpdateClient = async (updatedClient: Client) => {
        if (!user) return;
        try {
            await firestoreService.updateClient(user.id, updatedClient.id, updatedClient);
            toast.success('تم تحديث الموكل بنجاح!');
        } catch (error) {
            console.error(error);
            toast.error('فشل في تحديث الموكل.');
        }
    };
    
    const handleDeleteClient = useCallback(async (clientId: string) => {
        if (!user) {
            return;
        }

        const isClientInUse = cases.some(c => c.clientId === clientId);

        if (isClientInUse) {
            toast.error('لا يمكن حذف الموكل لأنه مرتبط بقضية واحدة على الأقل.');
            return;
        }
        
        try {
            await firestoreService.deleteClient(user.id, clientId);
            await firestoreService.logEvent(user.id, 'DELETE_CLIENT', { clientId });
            toast.success('تم حذف الموكل بنجاح.');
        } catch (error) {
            console.error(error);
            toast.error('فشل في حذف الموكل.');
        }
    }, [user, cases]);
    
    const handleUpdateProfile = async (data: { name: string; phone: string }) => {
        if (!user) return;
        try {
            await firestoreService.updateUserProfile(user.id, data);
            setUser(prev => prev ? { ...prev, ...data } : null);
            toast.success('تم تحديث الملف الشخصي بنجاح!');
        } catch (error) {
            toast.error('فشل تحديث الملف الشخصي.');
            console.error(error);
        }
    };

    const handleLogout = async () => {
        if (user) {
            await firestoreService.logEvent(user.id, 'LOGOUT_SUCCESS');
        }
        authService.logout();
    };


    const handlePasswordReset = async (email: string) => {
        try {
            await authService.resetPassword(email);
            toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
        } catch (error) {
            toast.error('فشل في إرسال البريد الإلكتروني.');
            throw error;
        }
    };
    
    const handleRegister = async (name: string, email: string, pass: string) => {
        const userCredential = await authService.register(name, email, pass);
        if (userCredential.user) {
            await firestoreService.createUserProfile({
                id: userCredential.user.uid,
                name,
                email,
            });
        }
        return userCredential;
    };


    const handleLoginFail = (error: { code: string }, email: string) => {
        const userIdForLog = error.code === 'auth/user-not-found' ? `nonexistent-user:${email}` : email;
        firestoreService.logEvent(userIdForLog, 'LOGIN_FAIL', { error: error.code, email });
    };

    const renderContent = () => {
        if (!user) return (
            <AuthPage 
                onLogin={authService.login} 
                onRegister={handleRegister}
                onPasswordReset={handlePasswordReset}
                onLoginFail={handleLoginFail}
            />
        );
        
        switch (activeTab) {
            case 'dashboard': return <DashboardPage user={user} cases={cases} tasks={tasks} />;
            case 'cases': return <CasesPage user={user} cases={cases} clients={clients} onAddCase={handleAddCase} onUpdateCase={handleUpdateCase} onDeleteCase={handleDeleteCase} />;
            case 'agenda': return <AgendaPage cases={cases} />;
            case 'tasks': return <TasksPage tasks={tasks} cases={cases} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />;
            case 'clients': return <ClientsPage clients={clients} onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient}/>;
            case 'settings': return <SettingsPage user={user} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />;
            default: return <DashboardPage user={user} cases={cases} tasks={tasks} />;
        }
    }

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <ThemeContext.Provider value={themeValue}>
            <NotificationProvider tasks={tasks}>
                <Toaster 
                    position="bottom-center" 
                    toastOptions={{
                        className: 'dark:bg-dark-card dark:text-dark-text',
                    }}
                />
                <div className="pb-16 min-h-screen">
                    <Suspense fallback={<LoadingSpinner />}>
                        {renderContent()}
                    </Suspense>
                </div>
                {user && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
            </NotificationProvider>
        </ThemeContext.Provider>
    );
};

export default App;
