import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Role, User, Clinic, Doctor } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, PencilIcon, KeyIcon } from '@heroicons/react/24/solid';

const Users: React.FC = () => {
    const { user: currentUser, users, clinics, doctors, addUser, updateUser } = useApp();
    
    // State for modals
    const [isAddEditModalOpen, setAddEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    // State for forms
    const initialFormState: Partial<User> = { name: '', role: Role.Reception, username: '', password: '', clinic_id: undefined, doctor_id: undefined, doctor_name: undefined };
    const [formData, setFormData] = useState<Partial<User>>(initialFormState);
    const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
    const [selectedDoctorForForm, setSelectedDoctorForForm] = useState<Doctor | null>(null);

    const isManager = currentUser?.role === Role.Manager;

    const handleOpenAddModal = () => {
        setSelectedUser(null);
        setFormData(initialFormState);
        setSelectedDoctorForForm(null);
        setAddEditModalOpen(true);
    };

    const handleOpenEditModal = (userToEdit: User) => {
        setSelectedUser(userToEdit);
        setFormData({ 
            name: userToEdit.name, 
            username: userToEdit.username, 
            role: userToEdit.role, 
            clinic_id: userToEdit.clinic_id,
            doctor_id: userToEdit.doctor_id,
            doctor_name: userToEdit.doctor_name
        });
        
        if (userToEdit.role === Role.Doctor && userToEdit.doctor_id) {
            const linkedDoctor = doctors.find(d => d.doctor_id === userToEdit.doctor_id);
            setSelectedDoctorForForm(linkedDoctor || null);
        } else {
            setSelectedDoctorForForm(null);
        }
        setAddEditModalOpen(true);
    };
    
    const handleOpenPasswordModal = (userToChange: User) => {
        setSelectedUser(userToChange);
        setPasswordData({ password: '', confirmPassword: '' });
        setPasswordModalOpen(true);
    };

    const handleCloseModals = () => {
        setAddEditModalOpen(false);
        setPasswordModalOpen(false);
        setSelectedUser(null);
        setFormData(initialFormState);
        setPasswordData({ password: '', confirmPassword: '' });
        setSelectedDoctorForForm(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };

        if (name === 'role') {
            setSelectedDoctorForForm(null);
            newFormData.username = '';
            newFormData.name = '';
            newFormData.clinic_id = value === Role.Doctor ? undefined : undefined;
            newFormData.doctor_id = undefined;
            newFormData.doctor_name = undefined;
        }

        setFormData(newFormData);
    };
    
    const handleDoctorSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedDoctorId = e.target.value;
        const doctor = doctors.find(d => d.doctor_id.toString() === selectedDoctorId);

        if (doctor) {
            setSelectedDoctorForForm(doctor);
            setFormData(prev => ({
                ...prev,
                name: doctor.doctor_name,
                clinic_id: doctor.clinic_id,
                doctor_id: doctor.doctor_id,
                doctor_name: doctor.doctor_name,
            }));
        } else {
            setSelectedDoctorForForm(null);
            setFormData(prev => ({
                ...prev,
                name: '',
                username: '',
                clinic_id: undefined,
                doctor_id: undefined,
                doctor_name: undefined,
            }));
        }
    };

    const handleAddEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUser) { // Editing existing user
            const { password, ...updateData } = formData; // Exclude password from edit form
            updateUser(selectedUser.user_id, updateData);
        } else { // Adding new user
            if (!formData.password) {
                alert("كلمة المرور مطلوبة للمستخدم الجديد.");
                return;
            }
             if (formData.role === Role.Doctor && !selectedDoctorForForm) {
                alert("يرجى اختيار طبيب لإنشاء حساب له.");
                return;
            }
            addUser(formData as Omit<User, 'user_id'>);
        }
        handleCloseModals();
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.password !== passwordData.confirmPassword) {
            alert("كلمتا المرور غير متطابقتين!");
            return;
        }
        if (selectedUser) {
            updateUser(selectedUser.user_id, { password: passwordData.password });
        }
        handleCloseModals();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
                {isManager && (
                    <button onClick={handleOpenAddModal} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                        <PlusIcon className="h-5 w-5 ml-2"/>
                        إضافة مستخدم جديد
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الاسم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المستخدم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الصلاحية</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">رقم الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم الطبيب</th>
                            {isManager && <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(userRow => (
                            <tr key={userRow.user_id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-700">{userRow.user_id}</td>
                                <td className="p-3 text-sm text-gray-700 font-medium">{userRow.name}</td>
                                <td className="p-3 text-sm text-gray-700">{userRow.username}</td>
                                <td className="p-3 text-sm text-gray-700">{userRow.role}</td>
                                <td className="p-3 text-sm text-gray-700">{clinics.find(c => c.clinic_id === userRow.clinic_id)?.clinic_name || 'N/A'}</td>
                                <td className="p-3 text-sm text-gray-700">{userRow.role === Role.Doctor ? userRow.doctor_id : 'N/A'}</td>
                                <td className="p-3 text-sm text-gray-700">{userRow.role === Role.Doctor ? userRow.doctor_name : 'N/A'}</td>
                                {isManager && (
                                    <td className="p-3 text-sm text-gray-700 space-x-2 space-x-reverse">
                                        <button onClick={() => handleOpenEditModal(userRow)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="تعديل">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleOpenPasswordModal(userRow)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full" title="تغيير كلمة المرور">
                                            <KeyIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title={selectedUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'} isOpen={isAddEditModalOpen} onClose={handleCloseModals}>
                <form onSubmit={handleAddEditSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">الصلاحية</label>
                        <select name="role" value={formData.role || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required>
                            <option value={Role.Reception}>موظف استقبال</option>
                            <option value={Role.Doctor}>طبيب</option>
                            <option value={Role.Manager}>مدير</option>
                        </select>
                    </div>

                    {formData.role === Role.Doctor ? (
                        <>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">اختر الطبيب</label>
                                <select 
                                    value={selectedDoctorForForm?.doctor_id || ''} 
                                    onChange={handleDoctorSelectChange} 
                                    className="w-full p-2 border rounded bg-white" 
                                    required
                                >
                                    <option value="">-- اختر طبيب --</option>
                                    {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">الاسم</label>
                                <input 
                                    type="text" 
                                    value={formData.name || ''} 
                                    className="w-full p-2 border rounded bg-gray-100" 
                                    readOnly 
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">اسم المستخدم (للدخول)</label>
                                <input type="text" name="username" value={formData.username || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">العيادة</label>
                                <input 
                                    type="text" 
                                    value={clinics.find(c => c.clinic_id === formData.clinic_id)?.clinic_name || ''} 
                                    className="w-full p-2 border rounded bg-gray-100" 
                                    readOnly 
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">الاسم</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">اسم المستخدم</label>
                                <input type="text" name="username" value={formData.username || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required />
                            </div>
                        </>
                    )}
                    
                    {!selectedUser && (
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">كلمة المرور</label>
                            <input type="password" name="password" value={formData.password || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required />
                        </div>
                    )}
                    
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">
                        {selectedUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                    </button>
                </form>
            </Modal>

            <Modal title={`تغيير كلمة مرور ${selectedUser?.username}`} isOpen={isPasswordModalOpen} onClose={handleCloseModals}>
                 <form onSubmit={handlePasswordSubmit} className="space-y-4">
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">كلمة المرور الجديدة</label>
                        <input type="password" value={passwordData.password} onChange={e => setPasswordData(p => ({...p, password: e.target.value}))} className="w-full p-2 border rounded" required />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">تأكيد كلمة المرور</label>
                        <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} className="w-full p-2 border rounded" required />
                    </div>
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">
                        تغيير كلمة المرور
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Users;