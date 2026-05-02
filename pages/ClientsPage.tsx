
import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { PlusIcon, XIcon, SearchIcon, UserIcon, TrashIcon } from '../constants';

interface ClientsPageProps {
  clients: Client[];
  onAddClient: (newClient: Omit<Client, 'id' | 'userId'>) => void;
  onUpdateClient: (updatedClient: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

const ClientModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (clientData: Omit<Client, 'id' | 'userId'> | Client) => void;
    clientToEdit?: Client | null;
}> = ({ isOpen, onClose, onSave, clientToEdit }) => {
    const getInitialData = () => ({
      name: '',
      phone: '',
    });

    const [formData, setFormData] = useState(getInitialData());

    React.useEffect(() => {
        if (isOpen) {
            setFormData(clientToEdit ? { name: clientToEdit.name, phone: clientToEdit.phone } : getInitialData());
        }
    }, [clientToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(clientToEdit ? { ...clientToEdit, ...formData } : formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" dir="ltr">
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-6" dir="rtl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{clientToEdit ? 'تعديل الموكل' : 'إضافة موكل جديد'}</h2>
                    <button onClick={onClose} className="text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text"><XIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="الاسم الكامل" required className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded"/>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="رقم الهاتف" required className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded"/>
                    <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">حفظ</button>
                </form>
            </div>
        </div>
    );
};

const DeleteClientConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    clientName: string;
}> = ({ isOpen, onClose, onConfirm, clientName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4" dir="ltr">
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-sm p-6 text-center space-y-4" dir="rtl">
                <h3 className="text-xl font-bold text-red-500">تأكيد الحذف</h3>
                <p className="text-light-text dark:text-dark-text">
                    هل أنت متأكد من رغبتك في حذف الموكل <strong className="font-bold">"{clientName}"</strong>؟
                </p>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    لا يمكن التراجع عن هذا الإجراء.
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


const ClientsPage: React.FC<ClientsPageProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSave = (clientData: Omit<Client, 'id' | 'userId'> | Client) => {
    if ('id' in clientData) {
        onUpdateClient(clientData);
    } else {
        onAddClient(clientData);
    }
  };

  const openAddModal = () => {
    setClientToEdit(null);
    setIsModalOpen(true);
  }

  const openEditModal = (client: Client) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  }

  const handleDeleteClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setClientToDelete(client);
  };

  const handleConfirmDelete = () => {
    if (clientToDelete) {
        onDeleteClient(clientToDelete.id);
        setClientToDelete(null);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const lowerSearchQuery = searchQuery.toLowerCase();
      return c.name?.toLowerCase().includes(lowerSearchQuery) ||
             c.phone?.includes(searchQuery);
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [clients, searchQuery]);

  return (
    <div className="p-4 md:p-6">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">الموكلون</h1>
        <div className="relative w-full md:w-auto">
            <input 
              type="text"
              placeholder="بحث بالاسم, أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 p-2 pr-8 bg-light-card dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md focus:ring-2 focus:ring-primary outline-none"
            />
            <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-light-subtle dark:text-dark-subtle"/>
          </div>
      </header>

      <main className="space-y-3">
        {filteredClients.map(client => (
          <div key={client.id} onClick={() => openEditModal(client)} className="bg-light-card dark:bg-dark-card rounded-lg shadow p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full">
                  <UserIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-grow">
                  <h3 className="font-bold">{client.name}</h3>
                  <p className="text-sm text-light-subtle dark:text-dark-subtle">{client.phone}</p>
              </div>
              <button onClick={(e) => handleDeleteClick(e, client)} className="text-red-500 hover:text-red-700 p-2">
                  <TrashIcon className="w-5 h-5" />
              </button>
          </div>
        ))}
        {filteredClients.length === 0 && (
            <div className="text-center py-12 text-light-subtle dark:text-dark-subtle">
                <p>لا يوجد موكلون يطابقون بحثك.</p>
            </div>
        )}
      </main>

      <button onClick={openAddModal} className="fixed bottom-20 right-4 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-blue-600 transition-colors z-40">
        <PlusIcon className="w-6 h-6" />
      </button>

      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        clientToEdit={clientToEdit}
      />

      <DeleteClientConfirmationModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleConfirmDelete}
        clientName={clientToDelete?.name || ''}
      />
    </div>
  );
};

export default ClientsPage;
