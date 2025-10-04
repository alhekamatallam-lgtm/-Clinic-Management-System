import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import { PlusIcon } from '@heroicons/react/24/solid';
import { VisitType, Patient } from '../types';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Revenues: React.FC = () => {
    // FIX: Destructure showNotification and consolidate useApp calls.
    const { revenues, clinics, patients, addManualRevenue, isAdding, showNotification } = useApp();
    
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const today = getLocalYYYYMMDD(new Date());

    const initialFormState = {
        patient_id: null as number | null,
        patient_name: '',
        clinic_id: clinics[0]?.clinic_id || 0,
        amount: '', // Base price from clinic
        discount: '', // User-entered discount
        date: today,
        type: VisitType.FirstVisit,
        notes: '',
    };

    const [formData, setFormData] = useState(initialFormState);
    
    // State for the searchable patient dropdown
    const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
    const patientInputRef = useRef<HTMLDivElement>(null);

    // Derived values for calculation
    const baseAmount = parseFloat(formData.amount) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const amountAfterDiscount = Math.max(0, baseAmount - discount);

    const filteredPatients = formData.patient_name
        ? patients.filter(p => p.name.toLowerCase().includes(formData.patient_name.toLowerCase()))
        : patients;

    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';

    const handleOpenModal = () => {
        // Reset form to initial state but with the first clinic pre-selected if available
        setFormData({
            ...initialFormState,
            clinic_id: clinics[0]?.clinic_id || 0,
        });
        setAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setAddModalOpen(false);
        setIsPatientDropdownOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            // Ensure clinic_id is stored as a number to fix auto-price fetching
            [name]: name === 'clinic_id' ? Number(value) : value,
        }));
    };
    
    const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, patient_name: e.target.value, patient_id: null })); // Reset patient_id on manual change
        if (!isPatientDropdownOpen) {
            setIsPatientDropdownOpen(true);
        }
    };

    const handlePatientSelect = (patient: Patient) => {
        setFormData(prev => ({ ...prev, patient_name: patient.name, patient_id: patient.patient_id }));
        setIsPatientDropdownOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.patient_id === null) {
            showNotification('يرجى اختيار مريض من القائمة لضمان اكتمال البيانات.', 'error');
            return;
        }
        
        const success = await addManualRevenue({
            visit_id: 0, // Explicitly set visit_id for unlinked revenue
            patient_id: formData.patient_id,
            patient_name: formData.patient_name,
            clinic_id: formData.clinic_id,
            amount: amountAfterDiscount, // Submit the final amount after discount
            date: formData.date,
            type: formData.type as VisitType,
            notes: formData.notes,
        });

        if (success) {
            handleCloseModal();
            showNotification('تم تسجيل الإيراد بنجاح', 'success'); // Show notification on success
        }
    };

    // Effect to auto-populate base amount and reset discount when clinic or visit type changes
    useEffect(() => {
        if (formData.clinic_id && clinics.length > 0) {
            const selectedClinic = clinics.find(c => c.clinic_id === formData.clinic_id);
            if (selectedClinic) {
                const price = formData.type === VisitType.FirstVisit
                    ? selectedClinic.price_first_visit
                    : selectedClinic.price_followup;
                setFormData(prev => ({ ...prev, amount: price.toString(), discount: '' }));
            }
        } else {
             setFormData(prev => ({ ...prev, amount: '', discount: '' }));
        }
    }, [formData.clinic_id, formData.type, clinics]);

    // Effect to close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (patientInputRef.current && !patientInputRef.current.contains(event.target as Node)) {
                setIsPatientDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">سجل الإيرادات</h1>
                <button 
                    onClick={handleOpenModal}
                    className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    إضافة إيراد جديد
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">نوع الزيارة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {revenues.map(revenue => (
                            <tr key={revenue.revenue_id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-700">{revenue.revenue_id}</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.patient_name}</td>
                                <td className="p-3 text-sm text-gray-700">{getClinicName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 font-bold">{revenue.amount} ريال</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.date}</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.type}</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title="إضافة إيراد جديد" isOpen={isAddModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Patient Name - Full Width */}
                        <div className="md:col-span-2" ref={patientInputRef}>
                            <label htmlFor="patient_name_modal" className="block text-sm font-medium text-gray-700 mb-1">اسم المريض</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="patient_name"
                                    id="patient_name_modal"
                                    value={formData.patient_name}
                                    onChange={handlePatientChange}
                                    onFocus={() => setIsPatientDropdownOpen(true)}
                                    autoComplete="off"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                                {isPatientDropdownOpen && filteredPatients.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                        {filteredPatients.map(patient => (
                                            <li
                                                key={patient.patient_id}
                                                className="px-4 py-2 hover:bg-teal-100 cursor-pointer"
                                                onClick={() => handlePatientSelect(patient)}
                                            >
                                                {patient.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Clinic & Visit Type */}
                        <div>
                            <label htmlFor="clinic_id_modal" className="block text-sm font-medium text-gray-700 mb-1">العيادة</label>
                            <select
                                name="clinic_id"
                                id="clinic_id_modal"
                                value={formData.clinic_id}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white"
                                required
                            >
                                {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="type_modal" className="block text-sm font-medium text-gray-700 mb-1">نوع الإيراد</label>
                            <select
                                name="type"
                                id="type_modal"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white"
                                required
                            >
                                <option value={VisitType.FirstVisit}>كشف جديد</option>
                                <option value={VisitType.FollowUp}>متابعة</option>
                            </select>
                        </div>

                        {/* Base Amount & Discount */}
                        <div>
                            <label htmlFor="amount_modal" className="block text-sm font-medium text-gray-700 mb-1">قيمة الكشف</label>
                            <input
                                type="number"
                                id="amount_modal"
                                value={formData.amount}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100"
                                readOnly
                            />
                        </div>
                        <div>
                            <label htmlFor="discount_modal" className="block text-sm font-medium text-gray-700 mb-1">الخصم</label>
                            <input
                                type="number"
                                name="discount"
                                id="discount_modal"
                                value={formData.discount}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                min="0"
                                placeholder="0"
                            />
                        </div>

                        {/* Amount After Discount & Date */}
                        <div>
                            <label htmlFor="amount_after_discount_modal" className="block text-sm font-medium text-gray-700 mb-1">المبلغ بعد الخصم</label>
                            <input
                                type="number"
                                id="amount_after_discount_modal"
                                value={amountAfterDiscount}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 font-bold text-teal-700"
                                readOnly
                            />
                        </div>
                        <div>
                            <label htmlFor="date_modal" className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإيراد</label>
                            <input
                                type="date"
                                name="date"
                                id="date_modal"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        {/* Notes - Full Width */}
                        <div className="md:col-span-2">
                            <label htmlFor="notes_modal" className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                            <textarea
                                name="notes"
                                id="notes_modal"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                placeholder="أي تفاصيل إضافية..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-gray-400"
                        disabled={isAdding}
                    >
                        {isAdding ? 'جاري الحفظ...' : 'حفظ الإيراد'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Revenues;