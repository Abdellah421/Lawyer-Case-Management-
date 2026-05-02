import React, { useMemo } from 'react';
import { User, Case, Task, CaseStatus } from '../types';
import { BriefcaseIcon, CalendarIcon, CheckSquareIcon } from '../constants';

interface DashboardPageProps {
  user: User;
  cases: Case[];
  tasks: Task[];
}

// Memoizing StatCard prevents it from re-rendering if its props haven't changed.
// While the dashboard has few of these, this is a good practice that contributes
// to overall application performance and responsiveness.
const StatCard: React.FC<{ icon: React.ElementType, title: string, value: number | string, color: string }> = React.memo(({ icon: Icon, title, value, color }) => (
  <div className="bg-light-card dark:bg-dark-card p-4 rounded-xl shadow flex items-center gap-4">
    <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-light-subtle dark:text-dark-subtle">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

const DashboardPage: React.FC<DashboardPageProps> = ({ user, cases, tasks }) => {
  const stats = useMemo(() => {
    const openCases = cases.filter(c => c.status !== CaseStatus.CLOSED).length;
    const pendingTasks = tasks.filter(t => !t.isDone).length;
    return {
      totalCases: cases.length,
      openCases,
      pendingTasks,
    };
  }, [cases, tasks]);

  const upcomingHearings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return cases
      .filter(c => c.status !== CaseStatus.CLOSED && new Date(c.courtDate) >= today)
      .sort((a, b) => new Date(a.courtDate).getTime() - new Date(b.courtDate).getTime())
      .slice(0, 5);
  }, [cases]);
  
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks
        .filter(t => !t.isDone && new Date(t.dueDate) < today)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks]);

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">مرحباً, {user.name.split(' ')[0]}!</h1>
        <p className="text-light-subtle dark:text-dark-subtle">هذا هو ملخص يومك.</p>
      </header>
      
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={BriefcaseIcon} title="إجمالي القضايا" value={stats.totalCases} color="bg-primary" />
        <StatCard icon={BriefcaseIcon} title="القضايا المفتوحة" value={stats.openCases} color="bg-status-in_progress" />
        <StatCard icon={CheckSquareIcon} title="المهام المعلقة" value={stats.pendingTasks} color="bg-secondary" />
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-3">الجلسات القادمة</h2>
        <div className="space-y-3">
          {upcomingHearings.length > 0 ? (
            upcomingHearings.map(c => (
              <div key={c.id} className="bg-light-card dark:bg-dark-card p-3 rounded-lg shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-primary">{c.caseTitle}</p>
                  <p className="text-sm text-light-subtle dark:text-dark-subtle">{c.clientName}</p>
                </div>
                <div className="text-left">
                    <p className="font-mono text-sm font-semibold">{c.courtDate}</p>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle">جلسة</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 bg-light-card dark:bg-dark-card rounded-lg">
                <p className="text-light-subtle dark:text-dark-subtle">لا توجد جلسات قادمة.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-red-500">مهام متأخرة</h2>
         <div className="space-y-3">
          {overdueTasks.length > 0 ? (
            overdueTasks.map(task => (
              <div key={task.id} className="bg-light-card dark:bg-dark-card p-3 rounded-lg shadow-sm border-r-4 border-red-500">
                  <p className="font-semibold">{task.description}</p>
                  <p className="text-xs text-red-500 font-mono mt-1">
                    تاريخ الاستحقاق: {task.dueDate}
                  </p>
              </div>
            ))
          ) : (
            <div className="text-center py-6 bg-light-card dark:bg-dark-card rounded-lg">
                <p className="text-light-subtle dark:text-dark-subtle">لا توجد مهام متأخرة. عمل رائع!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;