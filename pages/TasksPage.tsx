import React, { useState, useMemo } from 'react';
import { Task, Case } from '../types';
import { PlusIcon, XIcon } from '../constants';

interface TasksPageProps {
  tasks: Task[];
  cases: Case[];
  onAddTask: (newTask: Omit<Task, 'id' | 'userId'>) => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

type TaskFilter = 'all' | 'overdue' | 'general';

// Wrapping TaskItem with React.memo prevents it from re-rendering when its parent
// component (TasksPage) re-renders, as long as its own props (task, caseName, etc.)
// have not changed. This improves performance, especially for long task lists.
const TaskItem: React.FC<{ 
    task: Task; 
    caseName: string | undefined;
    onToggle: (task: Task) => void;
    onDelete: (taskId: string) => void;
}> = React.memo(({ task, caseName, onToggle, onDelete }) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = !task.isDone && new Date(task.dueDate) < today;
    return (
        <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md flex items-start gap-4">
            <input 
                type="checkbox" 
                checked={task.isDone}
                onChange={() => onToggle({ ...task, isDone: !task.isDone })}
                className="mt-1 form-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary" 
            />
            <div className="flex-grow">
                <p className={`font-semibold ${task.isDone ? 'line-through text-light-subtle dark:text-dark-subtle' : ''}`}>{task.description}</p>
                {caseName && <p className="text-sm text-primary">{caseName}</p>}
                <p className={`text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-light-subtle dark:text-dark-subtle'}`}>
                    تاريخ الاستحقاق: {task.dueDate}
                </p>
            </div>
            <button onClick={() => onDelete(task.id)} className="text-red-500 hover:text-red-700">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
});
TaskItem.displayName = 'TaskItem';

const TaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Omit<Task, 'id' | 'userId'>) => void;
    cases: Case[];
}> = ({ isOpen, onClose, onSave, cases }) => {
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [caseId, setCaseId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ description, dueDate, caseId, isDone: false });
        setDescription('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setCaseId(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">إضافة مهمة جديدة</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المهمة" required className="w-full p-2 bg-light-bg dark:bg-dark-bg border rounded"/>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg border rounded"/>
                    <select value={caseId || ''} onChange={(e) => setCaseId(e.target.value || null)} className="w-full p-2 bg-light-bg dark:bg-dark-bg border rounded">
                        <option value="">مهمة عامة (بدون ملف)</option>
                        {cases.map(c => <option key={c.id} value={c.id}>{c.clientName} - {c.fileNumber}</option>)}
                    </select>
                    <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold">إضافة</button>
                </form>
            </div>
        </div>
    );
};

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                isActive
                ? 'bg-primary text-white'
                : 'bg-light-card dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    )
}

const TasksPage: React.FC<TasksPageProps> = ({ tasks, cases, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  
  const caseMap = useMemo(() => new Map(cases.map(c => [c.id, c.caseTitle])), [cases]);
  
  const pendingTasks = tasks.filter(t => !t.isDone).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const completedTasks = tasks.filter(t => t.isDone).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredPendingTasks = pendingTasks.filter(task => {
    if (activeFilter === 'overdue') {
      return new Date(task.dueDate) < today;
    }
    if (activeFilter === 'general') {
      return !task.caseId;
    }
    return true; // 'all'
  });


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">الإجراءات والمهام</h1>

      <div className="flex gap-2 mb-6">
          <FilterButton label="الكل" isActive={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          <FilterButton label="متأخرة" isActive={activeFilter === 'overdue'} onClick={() => setActiveFilter('overdue')} />
          <FilterButton label="عامة" isActive={activeFilter === 'general'} onClick={() => setActiveFilter('general')} />
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg border-b-2 border-primary pb-1">مهام قيد الإنجاز</h2>
        {filteredPendingTasks.length > 0 ? (
            filteredPendingTasks.map(task => 
                <TaskItem key={task.id} task={task} caseName={task.caseId ? caseMap.get(task.caseId) : undefined} onToggle={onUpdateTask} onDelete={onDeleteTask} />
            )
        ) : (
            <p className="text-center text-light-subtle dark:text-dark-subtle py-4">
                {activeFilter !== 'all' ? 'لا توجد مهام تطابق هذا الفلter.' : 'لا توجد مهام حالياً.'}
            </p>
        )}
      </div>

      {activeFilter === 'all' && (
        <div className="space-y-4 mt-8">
            <h2 className="font-bold text-lg border-b-2 border-gray-300 dark:border-gray-600 pb-1">مهام منجزة</h2>
            {completedTasks.length > 0 ? (
                completedTasks.map(task => 
                    <TaskItem key={task.id} task={task} caseName={task.caseId ? caseMap.get(task.caseId) : undefined} onToggle={onUpdateTask} onDelete={onDeleteTask} />
                )
            ) : (
                <p className="text-center text-light-subtle dark:text-dark-subtle py-4">لا توجد مهام منجزة.</p>
            )}
        </div>
      )}
      
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-20 right-4 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-blue-600 transition-colors z-40">
        <PlusIcon className="w-6 h-6" />
      </button>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddTask}
        cases={cases}
      />
    </div>
  );
};

export default TasksPage;