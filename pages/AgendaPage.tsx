import React, { useState } from 'react';
import { Case, CaseType } from '../types';

interface AgendaPageProps {
  cases: Case[];
}

const caseTypeColors: { [key in CaseType | 'default']: string } = {
  'نفقة': 'bg-green-500',
  'جنحي': 'bg-blue-500',
  'مدني': 'bg-purple-500',
  'تجاري': 'bg-orange-500',
  'أخرى': 'bg-gray-500',
  'default': 'bg-gray-500',
};

const AgendaPage: React.FC<AgendaPageProps> = ({ cases }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const days = Array.from({ length: startDay }, (_, i) => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1))
  );

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  
  const today = new Date();
  today.setHours(0,0,0,0);

  const selectedCases = selectedDate
    ? cases.filter(c => new Date(c.courtDate).toDateString() === selectedDate.toDateString())
    : [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">الأجندة</h1>
      
      <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => changeMonth(-1)} className="font-bold text-lg p-2">&lt;</button>
          <h2 className="font-bold text-lg">
            {currentDate.toLocaleString('ar-MA', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="font-bold text-lg p-2">&gt;</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-light-subtle dark:text-dark-subtle mb-2">
          {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => <div key={day}>{day}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`h-16 flex flex-col items-center justify-start p-1 rounded-lg cursor-pointer transition-colors ${day ? 'hover:bg-primary/10' : ''} ${selectedDate && day && selectedDate.toDateString() === day.toDateString() ? 'bg-primary/20' : ''}`}
              onClick={() => day && setSelectedDate(day)}
            >
              {day && (
                <>
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm mb-1 ${day.toDateString() === today.toDateString() ? 'bg-primary text-white' : ''}`}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-wrap justify-center gap-1">
                    {cases
                      .filter(c => new Date(c.courtDate).toDateString() === day.toDateString())
                      .slice(0, 3)
                      .map(c => <div key={c.id} className={`w-2 h-2 rounded-full ${caseTypeColors[c.caseType] || caseTypeColors.default}`}></div>)
                    }
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-bold text-lg mb-2">
            {selectedDate ? `جلسات يوم ${selectedDate.toLocaleDateString('ar-MA')}` : 'اختر يوماً لعرض الجلسات'}
        </h3>
        {selectedDate && (
          <div className="space-y-3">
            {selectedCases.length > 0 ? (
              selectedCases.map(c => (
                <div key={c.id} className="bg-light-card dark:bg-dark-card p-3 rounded-lg shadow flex items-center gap-3">
                  <div className={`w-2 h-10 rounded-full ${caseTypeColors[c.caseType] || caseTypeColors.default}`}></div>
                  <div>
                    <p className="font-semibold text-primary">{c.caseTitle}</p>
                    <p className="text-sm">{c.clientName}</p>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle">رقم الملف: {c.fileNumber}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-light-subtle dark:text-dark-subtle text-center py-4">لا توجد جلسات في هذا اليوم.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaPage;