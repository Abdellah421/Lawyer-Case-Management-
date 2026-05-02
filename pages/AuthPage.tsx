
import React, { useState } from 'react';
import { UserIcon, LockIcon, BriefcaseIcon, EyeIcon, EyeOffIcon } from '../constants';

interface AuthPageProps {
    onLogin: (email: string, pass: string) => Promise<any>;
    onRegister: (name: string, email: string, pass:string) => Promise<any>;
    onPasswordReset: (email: string) => Promise<void>;
    onLoginFail: (error: { code: string }, email: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onPasswordReset, onLoginFail }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [isResetView, setIsResetView] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            if (isResetView) {
                await onPasswordReset(email);
                setIsResetView(false); // Go back to login after request
            } else if (isLoginView) {
                await onLogin(email, password);
            } else {
                await onRegister(name, email, password);
            }
        } catch (err: any) {
            console.error(err);
            
            // Security Enhancement: Log failed login attempts for auditing.
            if (isLoginView) {
                onLoginFail(err, email);
            }

            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                    break;
                case 'auth/invalid-email':
                    setError('البريد الإلكتروني غير صالح.');
                    break;
                case 'auth/email-already-in-use':
                    setError('هذا البريد الإلكتروني مسجل بالفعل.');
                    break;
                case 'auth/weak-password':
                    setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
                    break;
                default:
                    setError(`حدث خطأ. الرجاء المحاولة مرة أخرى. (${err?.code || err?.message || 'Unknown'})`);
            }
        } finally {
            setIsLoading(false);
        }
    }
    
    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setIsResetView(false);
        setError(null);
    }
    
    const showResetView = () => {
        setIsResetView(true);
        setIsLoginView(false);
        setError(null);
    }

    const FormTitle = isResetView ? 'إعادة تعيين كلمة المرور' : (isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب');

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <BriefcaseIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                    <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">دفتر القضايا</h1>
                    <p className="text-light-subtle dark:text-dark-subtle">إدارة القضايا بفعالية</p>
                </div>

                <div className="bg-light-card dark:bg-dark-card p-8 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-center mb-6">{FormTitle}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLoginView && !isResetView && (
                             <div className="relative">
                                <span className="absolute inset-y-0 right-0 flex items-center pl-3">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="الاسم الكامل"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full p-3 pr-10 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-black dark:text-white"
                                />
                            </div>
                        )}
                        <div className="relative">
                             <span className="absolute inset-y-0 right-0 flex items-center pl-3">
                                <UserIcon className="h-5 w-5 text-gray-400" />
                            </span>
                            <input
                                type="email"
                                placeholder="البريد الإلكتروني"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full p-3 pr-10 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-black dark:text-white"
                            />
                        </div>
                        {!isResetView && (
                            <div className="relative">
                                <span className="absolute inset-y-0 right-0 flex items-center pl-3">
                                    <LockIcon className="h-5 w-5 text-gray-400" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="كلمة المرور"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="w-full p-3 pr-10 pl-10 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-black dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 left-0 flex items-center pr-3"
                                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="h-5 w-5 text-gray-500" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5 text-gray-500" />
                                    )}
                                </button>
                            </div>
                        )}
                        
                        {isLoginView && !isResetView && (
                             <div className="text-left">
                                <button type="button" onClick={showResetView} className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</button>
                             </div>
                        )}

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <button type="submit" disabled={isLoading} className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-blue-300">
                            {isLoading ? 'جاري...' : (isResetView ? 'إرسال' : (isLoginView ? 'دخول' : 'تسجيل'))}
                        </button>
                    </form>
                </div>
                
                <div className="text-center mt-6">
                    <button onClick={toggleView} className="text-sm text-primary hover:underline">
                        {isResetView ? 'العودة لتسجيل الدخول' : (isLoginView ? 'ليس لديك حساب؟ قم بإنشاء واحد' : 'هل لديك حساب بالفعل؟ سجل الدخول')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
