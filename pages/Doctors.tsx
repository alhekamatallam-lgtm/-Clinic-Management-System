import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Doctor } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon } from '@heroicons/react/24/solid';

const Doctors: React.FC = () => {
    const { doctors, clinics, addDoctor, isAdding } = useApp();
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const initialFormState: Omit<Doctor, 'doctor_id'> = {
        doctor_name: '',
        specialty: '',
        clinic_id: clinics[0]?.clinic_id || 0,
        phone: '',
        email: '',
        shift: 'صباحي',
        status: 'نشط',
    };
    const [formData, setFormData] = useState(initialFormState);

    const handleOpenModal = () => {
        setFormData({ ...initialFormState, clinic_id: clinics[0]?.clinic_id || 0});
        setAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setAddModalOpen(false);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'clinic_id' ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDoctor(formData);
        handleCloseModal();
    };

    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';
    
    const getStatusChip = (status: 'نشط' | 'غير نشط') => {
        const color = status === 'نشط' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{status}</span>;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة الأطباء</h1>
                <button 
                    onClick={handleOpenModal}
                    className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    إضافة طبيب جديد
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التخصص</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الهاتف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">البريد الإلكتروني</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الدوام</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {doctors.map(doctor => (
                            <tr key={doctor.doctor_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{doctor.doctor_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{doctor.doctor_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{doctor.specialty}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getClinicName(doctor.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{doctor.phone}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{doctor.email}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{doctor.shift}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getStatusChip(doctor.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title="إضافة طبيب جديد" isOpen={isAddModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الطبيب</label>
                            <input type="text" name="doctor_name" value={formData.doctor_name} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التخصص</label>
                            <input type="text" name="specialty" value={formData.specialty} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العيادة</label>
                            <select name="clinic_id" value={formData.clinic_id} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدوام</label>
                            <select name="shift" value={formData.shift} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                <option value="صباحي">صباحي</option>
                                <option value="مسائي">مسائي</option>
                            </select>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                <option value="نشط">نشط</option>
                                <option value="غير نشط">غير نشط</option>
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-gray-400"
                        disabled={isAdding}
                    >
                        {isAdding ? 'جاري الإضافة...' : 'إضافة الطبيب'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Doctors;