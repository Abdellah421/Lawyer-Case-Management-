import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Case, CaseStatus, CaseType, User, Client, CaseFile, CaseHistoryEvent, InvolvedParty, CaseNote } from '../types';
import { XIcon, SearchIcon, PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, ClockIcon, FileTextIcon, BriefcaseIcon, UsersIcon } from '../constants';
import { toast } from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';

interface CasesPageProps {
  user: User;
  cases: Case[];
  clients: Client[];
  onAddCase: (newCase: Omit<Case, 'id' | 'userId'>) => Promise<Case | undefined>;
  onUpdateCase: (updatedCase: Case) => void;
  onDeleteCase: (caseId: string) => void;
}

const caseTypes: CaseType[] = ['نفقة', 'طلاق', 'خلع', 'حضانة', 'إرث', 'مدني', 'تجاري', 'عقاري', 'جنحي', 'جنائي', 'إداري', 'أخرى'];

const statusTextMap: { [key in CaseStatus]: string } = {
    [CaseStatus.OPEN]: 'مفتوحة',
    [CaseStatus.IN_PROGRESS]: 'في طور المعالجة',
    [CaseStatus.CLOSED]: 'مغلقة',
};

const caseTypeColors: Record<string, string> = {
  'نفقة': 'bg-green-500',
  'جنحي': 'bg-blue-500',
  'مدني': 'bg-purple-500',
  'تجاري': 'bg-orange-500',
  'طلاق': 'bg-red-500',
  'خلع': 'bg-pink-500',
  'حضانة': 'bg-indigo-500',
  'إرث': 'bg-yellow-500',
  'عقاري': 'bg-teal-500',
  'جنائي': 'bg-gray-800',
  'إداري': 'bg-cyan-500',
  'أخرى': 'bg-gray-500',
  'default': 'bg-gray-500',
};

const DeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    caseTitle: string;
}> = ({ isOpen, onClose, onConfirm, caseTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4" dir="ltr">
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-sm p-6 text-center space-y-4" dir="rtl">
                <h3 className="text-xl font-bold text-red-500">تأكيد الحذف</h3>
                <p className="text-light-text dark:text-dark-text">
                    هل أنت متأكد من رغبتك في حذف القضية <strong className="font-bold">"{caseTitle}"</strong>؟
                </p>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    سيتم حذف جميع البيانات والملفات المرتبطة بها بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                    <button onClick={onClose} className="flex-1 bg-gray-500 text-white p-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors">
                        إلغاء
                    </button>
                    <button onClick={onConfirm} className="flex-1 bg-red-600 text-white p-2 rounded-lg font-semibold hover:bg-red-700 transition-colors">
                        نعم, حذف
                    </button>
                </div>
            </div>
        </div>
    );
};


// By wrapping the CaseStatusBadge in React.memo, we prevent it from re-rendering
// if its props (the status) haven't changed. This is an optimization, especially
// useful in long lists of cases, as it reduces unnecessary render cycles.
const CaseStatusBadge: React.FC<{ status: CaseStatus }> = React.memo(({ status }) => {
    const statusStyles: { [key in CaseStatus]: string } = {
        [CaseStatus.OPEN]: 'bg-status-open text-white',
        [CaseStatus.IN_PROGRESS]: 'bg-status-in_progress text-white',
        [CaseStatus.CLOSED]: 'bg-status-closed text-white',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusStyles[status]}`}>{statusTextMap[status]}</span>
});
CaseStatusBadge.displayName = 'CaseStatusBadge';

type CaseDetailTab = 'overview' | 'history' | 'parties' | 'notes';

const TabButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon: React.ElementType;
}> = ({ label, isActive, onClick, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 text-xs font-semibold border-b-2 transition-colors ${
            isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-primary'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);


const CaseManagementModal: React.FC<{
    initialCase: Case | null;
    onClose: () => void;
    onSave: (caseData: Omit<Case, 'id' | 'userId'> | Case) => Promise<Case | undefined>;
    onDelete: (caseId: string) => void;
    clients: Client[];
    user: User;
}> = ({ initialCase, onClose, onSave, onDelete, clients, user }) => {
    
    const getInitialData = useCallback((): Omit<Case, 'id' | 'userId'> => ({
      fileNumber: '',
      caseTitle: '',
      clientName: clients.length > 0 ? clients[0].name : '',
      clientId: clients.length > 0 ? clients[0].id : '',
      caseType: 'نفقة',
      status: CaseStatus.OPEN,
      caseDate: new Date().toISOString().split('T')[0],
      courtDate: new Date().toISOString().split('T')[0],
      description: '',
      files: [],
      history: [],
      parties: [],
      notes: [],
    }), [clients]);

    const [localCaseData, setLocalCaseData] = useState<Case | Omit<Case, 'id' | 'userId'>>(() => initialCase || getInitialData());
    const [isEditing, setIsEditing] = useState(!initialCase);
    const [activeTab, setActiveTab] = useState<CaseDetailTab>('overview');
    const [selectedDropdownType, setSelectedDropdownType] = useState<CaseType>('نفقة');

    // Form states for new sections
    const [newEvent, setNewEvent] = useState({ event: '', description: '' });
    const [newParty, setNewParty] = useState({ name: '', role: '' });
    const [newNote, setNewNote] = useState('');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    useEffect(() => {
        const caseToSet = initialCase || getInitialData();
        setLocalCaseData(caseToSet);
        const caseType = caseToSet.caseType;

        if (caseType) {
            if (!caseTypes.includes(caseType)) {
                setSelectedDropdownType('أخرى');
            } else {
                setSelectedDropdownType(caseType);
            }
        } else {
            setSelectedDropdownType('نفقة');
        }

        setIsEditing(!initialCase);
        setActiveTab('overview');
    }, [initialCase, getInitialData]);

    const handleUpdate = (updatedData: Partial<Case>) => {
        setLocalCaseData(prev => ({ ...prev, ...updatedData }));
    };

    const handleAddHistory = () => {
        if (!newEvent.event.trim()) return;
        const event: CaseHistoryEvent = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            event: newEvent.event.trim(),
            description: newEvent.description.trim() || undefined,
        };
        handleUpdate({ history: [...(localCaseData.history || []), event] });
        setNewEvent({ event: '', description: '' });
    };
    
    const handleDeleteHistory = (id: string) => {
        handleUpdate({ history: (localCaseData.history || []).filter(h => h.id !== id) });
    };

    const handleAddParty = () => {
        if (!newParty.name.trim() || !newParty.role.trim()) return;
        const party: InvolvedParty = { id: Date.now().toString(), ...newParty };
        handleUpdate({ parties: [...(localCaseData.parties || []), party] });
        setNewParty({ name: '', role: '' });
    };

    const handleDeleteParty = (id: string) => {
        handleUpdate({ parties: (localCaseData.parties || []).filter(p => p.id !== id) });
    };

    const handleAddNote = () => {
        const finalNote = newNote.trim();
        if (!finalNote) return;
        const note: CaseNote = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], content: finalNote };
        handleUpdate({ notes: [...(localCaseData.notes || []), note] });
        setNewNote('');
    };

    const handleDeleteNote = (id: string) => {
        handleUpdate({ notes: (localCaseData.notes || []).filter(n => n.id !== id) });
    };
    
    const handleInternalSave = async () => {
        if (!localCaseData.clientId) return toast.error("يرجى اختيار موكل.");
        if (selectedDropdownType === 'أخرى' && !localCaseData.caseType.trim()) return toast.error("يرجى إدخال نوع القضية المخصص.");
        
        const isExistingCase = 'id' in localCaseData;
        const dataToSave = isExistingCase ? localCaseData : { ...localCaseData, userId: user.id };
        await onSave(dataToSave);

        if (isExistingCase) {
            // Update: just exit editing mode
            setIsEditing(false);
        } else {
            // New case: close the modal. The onSnapshot listener in App.tsx
            // will automatically add the new case to the list.
            onClose();
        }
    };

    const handleCancel = () => {
        if (initialCase) {
            setLocalCaseData(initialCase); // Revert changes
            setIsEditing(false);
        } else {
            onClose(); // Just close if it was a new case
        }
    };
    
    const handleDelete = () => {
        if ('id' in localCaseData) {
            setShowDeleteConfirm(true);
        }
    }

    const handleConfirmDelete = () => {
        if ('id' in localCaseData) {
            onDelete(localCaseData.id);
            onClose(); // Closes main modal, which unmounts this component and the confirmation modal
        }
    }


     const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedDropdownType(value);
        handleUpdate({ caseType: value === 'أخرى' ? '' : value });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'clientId') {
            const selectedClient = clients.find(c => c.id === value);
            handleUpdate({ clientId: value, clientName: selectedClient?.name || '' });
        } else {
            handleUpdate({ [name]: value });
        }
    };


    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" dir="ltr">
                <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg p-0 max-h-[90vh] flex flex-col" dir="rtl">
                    <div className="p-4 border-b dark:border-dark-border">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-primary">{isEditing && !initialCase ? 'إضافة قضية جديدة' : localCaseData.caseTitle}</h2>
                                <p className="text-sm text-light-subtle dark:text-dark-subtle">{localCaseData.clientName}</p>
                            </div>
                            <button onClick={onClose} className="text-light-subtle dark:text-dark-subtle"><XIcon className="w-6 h-6" /></button>
                        </div>
                    </div>
                    
                    <div className="flex justify-around border-b dark:border-dark-border">
                        <TabButton label="ملخص" icon={BriefcaseIcon} isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                        <TabButton label="السجل" icon={ClockIcon} isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                        <TabButton label="الأطراف" icon={UsersIcon} isActive={activeTab === 'parties'} onClick={() => setActiveTab('parties')} />
                        <TabButton label="ملاحظات" icon={FileTextIcon} isActive={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                    </div>

                    <div className="overflow-y-auto p-4 flex-grow">
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                { isEditing ? (
                                    <div className="space-y-3">
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">عنوان القضية</label><input type="text" name="caseTitle" value={localCaseData.caseTitle} onChange={handleChange} required className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded"/></div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">الموكل</label><select name="clientId" value={localCaseData.clientId} onChange={handleChange} required className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded"><option value="">-- اختر الموكل --</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">رقم الملف</label><input type="text" name="fileNumber" value={localCaseData.fileNumber} onChange={handleChange} required className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded"/></div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">نوع القضية</label><select value={selectedDropdownType} onChange={handleDropdownChange} className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded">{caseTypes.map(s=><option key={s} value={s}>{s}</option>)}</select>{selectedDropdownType==='أخرى'&&<input type="text" name="caseType" value={localCaseData.caseType} onChange={handleChange} placeholder="أدخل نوع القضية" required className="w-full p-2 mt-2 bg-light-bg dark:bg-dark-bg border rounded"/>}</div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">الحالة</label><select name="status" value={localCaseData.status} onChange={handleChange} className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded">{Object.values(CaseStatus).map(s=><option key={s} value={s}>{statusTextMap[s]}</option>)}</select></div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">تاريخ التسجيل</label><input type="date" name="caseDate" value={localCaseData.caseDate} onChange={handleChange} required className="w-full p-2 bg-light-bg dark:bg-dark-bg border rounded"/></div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">تاريخ الجلسة</label><input type="date" name="courtDate" value={localCaseData.courtDate} onChange={handleChange} required className="w-full p-2 bg-light-bg dark:bg-dark-bg border rounded"/></div>
                                        <div><label className="text-sm font-medium text-light-subtle dark:text-dark-subtle mb-1">الوصف</label><textarea name="description" value={localCaseData.description} onChange={handleChange} rows={3} className="w-full p-2 bg-light-bg dark:bg-dark-bg border rounded"/></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2 text-sm border-b dark:border-dark-border pb-3">
                                            <p><strong>رقم الملف:</strong> {localCaseData.fileNumber}</p>
                                            <p><strong>نوع القضية:</strong> {localCaseData.caseType}</p>
                                            <p><strong>تاريخ التسجيل:</strong> {localCaseData.caseDate}</p>
                                            <p><strong>تاريخ الجلسة المقبلة:</strong> {localCaseData.courtDate}</p>
                                            <p className="flex items-center gap-2"><strong>الحالة:</strong> <CaseStatusBadge status={localCaseData.status} /></p>
                                            <p className="whitespace-pre-wrap"><strong>الوصف:</strong> {localCaseData.description || 'لا يوجد وصف.'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                {isEditing && (
                                    <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg flex flex-col sm:flex-row items-center gap-2 shadow-inner">
                                        <input type="text" placeholder="عنوان الحدث" value={newEvent.event} onChange={e => setNewEvent({...newEvent, event: e.target.value})} className="w-full sm:w-auto flex-1 p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md"/>
                                        <input type="text" placeholder="وصف (اختياري)" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full sm:w-auto flex-1 p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md"/>
                                        <button onClick={handleAddHistory} className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm">إضافة</button>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {(localCaseData.history || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(h => (
                                        <div key={h.id} className="p-2 border-b dark:border-dark-border flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{h.event} - <span className="font-normal text-xs text-light-subtle dark:text-dark-subtle">{h.date}</span></p>
                                                <p className="text-sm text-light-subtle dark:text-dark-subtle">{h.description}</p>
                                            </div>
                                            {isEditing && <button onClick={() => handleDeleteHistory(h.id)} className="text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                    {(localCaseData.history || []).length === 0 && <p className="text-center text-sm text-light-subtle dark:text-dark-subtle py-4">لا يوجد سجل لهذه القضية.</p>}
                                </div>
                            </div>
                        )}
                        {activeTab === 'parties' && (
                            <div className="space-y-4">
                                {isEditing && (
                                    <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg flex flex-col sm:flex-row items-center gap-2 shadow-inner">
                                        <input type="text" placeholder="اسم الطرف" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} className="w-full sm:w-auto flex-1 p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md"/>
                                        <input type="text" placeholder="الدور (مثلا: مدعى عليه)" value={newParty.role} onChange={e => setNewParty({...newParty, role: e.target.value})} className="w-full sm:w-auto flex-1 p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md"/>
                                        <button onClick={handleAddParty} className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm">إضافة</button>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {(localCaseData.parties || []).map(p => (
                                        <div key={p.id} className="p-2 bg-light-bg dark:bg-dark-bg rounded-md flex justify-between items-center">
                                            <div><p className="font-semibold">{p.name}</p><p className="text-xs text-light-subtle dark:text-dark-subtle">{p.role}</p></div>
                                            {isEditing && <button onClick={() => handleDeleteParty(p.id)} className="text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                    {(localCaseData.parties || []).length === 0 && <p className="text-center text-sm text-light-subtle dark:text-dark-subtle py-4">لا توجد أطراف مضافة.</p>}
                                </div>
                            </div>
                        )}
                        {activeTab === 'notes' && (
                            <div className="space-y-4">
                                {isEditing && (
                                    <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg space-y-2 shadow-inner">
                                        <textarea placeholder="اكتب ملاحظة جديدة..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} className="w-full p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md"/>
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleAddNote} className="flex-grow bg-primary text-white p-2 rounded-lg font-semibold text-sm">إضافة ملاحظة</button>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {(localCaseData.notes || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(n => (
                                        <div key={n.id} className="p-2 border-b dark:border-dark-border flex justify-between items-start">
                                            <div><p className="text-xs text-light-subtle dark:text-dark-subtle">{n.date}</p><p className="text-sm whitespace-pre-wrap">{n.content}</p></div>
                                            {isEditing && <button onClick={() => handleDeleteNote(n.id)} className="text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                    {(localCaseData.notes || []).length === 0 && <p className="text-center text-sm text-light-subtle dark:text-dark-subtle py-4">لا توجد ملاحظات.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 flex gap-2 border-t dark:border-dark-border">
                        { isEditing ? (
                            <>
                                <button onClick={handleInternalSave} className="flex-1 bg-primary text-white p-2 rounded-lg font-semibold">حفظ</button>
                                <button onClick={handleCancel} className="flex-1 bg-gray-500 text-white p-2 rounded-lg font-semibold">إلغاء</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsEditing(true)} className="flex-1 bg-blue-500 text-white p-2 rounded-lg font-semibold">تعديل</button>
                                <button onClick={handleDelete} className="flex-1 bg-red-500 text-white p-2 rounded-lg font-semibold">حذف</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <DeleteConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                caseTitle={localCaseData.caseTitle}
            />
        </>
    )
}

const CasesPage: React.FC<CasesPageProps> = ({ user, cases, clients, onAddCase, onUpdateCase, onDeleteCase }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCase, setActiveCase] = useState<Case | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  // Create a debounced version of the search query. The filtering logic will only
  // use this value, which updates 300ms after the user stops typing.
  // This prevents the UI from lagging while searching in a large list of cases.
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [typeFilter, setTypeFilter] = useState('كل الأنواع');
  const [clientFilter, setClientFilter] = useState('كل الموكلين');
  const [sortField, setSortField] = useState<'courtDate' | 'caseDate'>('courtDate');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const handleSave = async (caseData: Omit<Case, 'id'> | Case): Promise<Case | undefined> => {
    if ('id' in caseData) {
        onUpdateCase(caseData as Case);
        return undefined;
    } else {
        return await onAddCase(caseData as Omit<Case, 'id' | 'userId'>);
    }
  };
  
  const openAddModal = () => {
    if (clients.length === 0) {
      toast.error('يرجى إضافة موكل أولاً قبل إضافة قضية.');
      return;
    }
    setActiveCase(null);
    setIsModalOpen(true);
  }

  const openViewModal = (caseData: Case) => {
    setActiveCase(caseData);
    setIsModalOpen(true);
  }

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesType = typeFilter === 'كل الأنواع' || c.caseType === typeFilter;
      const matchesClient = clientFilter === 'كل الموكلين' || c.clientId === clientFilter;
      const lowerSearchQuery = debouncedSearchQuery.toLowerCase();
      const matchesSearch = debouncedSearchQuery === '' || 
        c.caseTitle?.toLowerCase().includes(lowerSearchQuery) ||
        c.clientName?.toLowerCase().includes(lowerSearchQuery) ||
        c.fileNumber?.toLowerCase().includes(lowerSearchQuery);
      return matchesType && matchesClient && matchesSearch;
    }).sort((a,b) => {
        const valA = a[sortField] ? new Date(a[sortField]).getTime() : 0;
        const valB = b[sortField] ? new Date(b[sortField]).getTime() : 0;
        if (sortOrder === 'asc') {
            return valA - valB;
        } else {
            return valB - valA;
        }
    });
  }, [cases, debouncedSearchQuery, typeFilter, clientFilter, sortField, sortOrder]);

  return (
    <div className="p-4 md:p-6">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">القضايا</h1>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <input 
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pr-8 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md focus:ring-2 focus:ring-primary outline-none"
            />
            <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-light-subtle dark:text-dark-subtle"/>
          </div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md focus:ring-2 focus:ring-primary outline-none"
          >
            <option>كل الأنواع</option>
            {caseTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full p-2 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md focus:ring-2 focus:ring-primary outline-none"
          >
            <option>كل الموكلين</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md">
            <select 
              value={sortField}
              onChange={(e) => setSortField(e.target.value as 'courtDate' | 'caseDate')}
              aria-label="Sort by field"
              className="w-full p-2 bg-transparent border-0 rounded-md focus:ring-0 outline-none"
            >
              <option value="courtDate">تاريخ الجلسة</option>
              <option value="caseDate">تاريخ التسجيل</option>
            </select>
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary transition-colors"
            >
              {sortOrder === 'asc' ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
            </button>
          </div>
      </div>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map(c => (
             <div key={c.id} onClick={() => openViewModal(c)} className="bg-light-card dark:bg-dark-card rounded-lg shadow p-4 space-y-2 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-md text-light-text dark:text-dark-text">{c.caseTitle}</h3>
                    <CaseStatusBadge status={c.status}/>
                </div>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">{c.clientName}</p>
                <div className="flex justify-between items-center text-xs pt-2 border-t dark:border-dark-border">
                    <span className={`px-2 py-1 rounded text-white ${caseTypeColors[c.caseType] || caseTypeColors.default}`}>{c.caseType}</span>
                    <span className="font-mono">{c.courtDate}</span>
                </div>
             </div>
          ))}
          {filteredCases.length === 0 && (
            <div className="col-span-full text-center py-12 text-light-subtle dark:text-dark-subtle">
                <p>لا توجد قضايا تطابق بحثك.</p>
            </div>
          )}
      </main>
      
       <button onClick={openAddModal} className="fab bg-primary text-white rounded-full p-4 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/30" aria-label="إضافة قضية">
        <PlusIcon className="w-6 h-6" />
      </button>

      {isModalOpen && <CaseManagementModal
        key={activeCase?.id || 'new-case'}
        initialCase={activeCase}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={onDeleteCase}
        clients={clients}
        user={user}
      />}
    </div>
  );
};

export default CasesPage;
