import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    const { revenues, clinics, patients, doctors, addManualRevenue, isAdding, showNotification } = useApp();
    
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
    
    const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
    const patientInputRef = useRef<HTMLDivElement>(null);

    const baseAmount = parseFloat(formData.amount) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const amountAfterDiscount = Math.max(0, baseAmount - discount);

    const sortedRevenues = useMemo(() => [...revenues].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        // Also sort by ID for same-day entries
        return dateB - dateA || b.revenue_id - a.revenue_id;
    }), [revenues]);

    const filteredPatients = formData.patient_name
        ? patients.filter(p => p.name.toLowerCase().includes(formData.patient_name.toLowerCase()))
        : patients;

    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';
    
    const getDoctorName = (doctorId: number) => {
        return doctors.find(d => d.doctor_id === doctorId)?.doctor_name || 'N/A';
    };

    const handleOpenModal = () => {
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
            [name]: name === 'clinic_id' ? Number(value) : value,
        }));
    };
    
    const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, patient_name: e.target.value, patient_id: null }));
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

        if (formData.patient_id === null && formData.patient_name.trim() !== '') {
            const potentialMatch = patients.find(p => p.name.toLowerCase() === formData.patient_name.toLowerCase().trim());
             if(!potentialMatch) {
                showNotification('يرجى اختيار مريض من القائمة أو التأكد من تطابق الاسم.', 'error');
                return;
             }
             // If a match is found, use its ID.
             handlePatientSelect(potentialMatch);
        } else if (formData.patient_id === null) {
            showNotification('يرجى اختيار مريض من القائمة.', 'error');
            return;
        }
        
        const success = await addManualRevenue({
            visit_id: 0,
            patient_id: formData.patient_id,
            patient_name: formData.patient_name,
            clinic_id: formData.clinic_id,
            amount: amountAfterDiscount,
            date: formData.date,
            type: formData.type as VisitType,
            notes: formData.notes,
        });

        if (success) {
            handleCloseModal();
            showNotification('تم تسجيل الإيراد بنجاح', 'success');
        }
    };

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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">سجل الإيرادات</h1>
                <button 
                    onClick={handleOpenModal}
                    className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    إضافة إيراد جديد
                </button>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">نوع الزيارة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {sortedRevenues.map(revenue => (
                            <tr key={revenue.revenue_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.revenue_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.patient_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getClinicName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{revenue.amount} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.type}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
                {sortedRevenues.map(revenue => (
                    <div key={revenue.revenue_id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex-grow">
                                <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{revenue.patient_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{getClinicName(revenue.clinic_id)}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{revenue.date}</p>
                            </div>
                            <div className="text-left flex-shrink-0 pl-2">
                                <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{revenue.amount} ريال</p>
                                <p className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300 inline-block mt-1">{revenue.type}</p>
                            </div>
                        </div>
                        {revenue.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                <span className="font-semibold">ملاحظات:</span> {revenue.notes}
                            </p>
                        )}
                    </div>
                ))}
            </div>


            <Modal title="إضافة إيراد جديد" isOpen={isAddModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2" ref={patientInputRef}>
                            <label htmlFor="patient_name_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="patient_name"
                                    id="patient_name_modal"
                                    value={formData.patient_name}
                                    onChange={handlePatientChange}
                                    onFocus={() => setIsPatientDropdownOpen(true)}
                                    autoComplete="off"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    required
                                />
                                {isPatientDropdownOpen && filteredPatients.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                        {filteredPatients.map(patient => (
                                            <li
                                                key={patient.patient_id}
                                                className="px-4 py-2 hover:bg-teal-100 dark:hover:bg-teal-900 cursor-pointer"
                                                onClick={() => handlePatientSelect(patient)}
                                            >
                                                {patient.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="clinic_id_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العيادة</label>
                            <select
                                name="clinic_id"
                                id="clinic_id_modal"
                                value={formData.clinic_id}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            >
                                {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name} - {getDoctorName(c.doctor_id)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="type_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الإيراد</label>
                            <select
                                name="type"
                                id="type_modal"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            >
                                <option value={VisitType.FirstVisit}>كشف جديد</option>
                                <option value={VisitType.FollowUp}>متابعة</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="amount_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قيمة الكشف</label>
                            <input
                                type="number"
                                id="amount_modal"
                                value={formData.amount}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500"
                                readOnly
                            />
                        </div>
                        <div>
                            <label htmlFor="discount_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخصم</label>
                            <input
                                type="number"
                                name="discount"
                                id="discount_modal"
                                value={formData.discount}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="0"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label htmlFor="amount_after_discount_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ بعد الخصم</label>
                            <input
                                type="number"
                                id="amount_after_discount_modal"
                                value={amountAfterDiscount}
                                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 font-bold text-teal-700 dark:bg-gray-600 dark:border-gray-500 dark:text-teal-400"
                                readOnly
                            />
                        </div>
                        <div>
                            <label htmlFor="date_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الإيراد</label>
                            <input
                                type="date"
                                name="date"
                                id="date_modal"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="notes_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                            <textarea
                                name="notes"
                                id="notes_modal"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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