import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import StatCard from '../ui/StatCard';
import { UserGroupIcon, ClockIcon, CalendarDaysIcon, PlusIcon, MagnifyingGlassIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';
import { VisitStatus, VisitType, Patient, Visit } from '../../types';
import Modal from '../ui/Modal';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ReceptionistDashboard: React.FC = () => {
    const { patients, visits, clinics, diagnoses, addPatient, addVisit, isAddingVisit, addManualRevenue, isAdding, showNotification } = useApp();
    const [isAddPatientModalOpen, setAddPatientModalOpen] = useState(false);
    const [isAddVisitModalOpen, setAddVisitModalOpen] = useState(false);
    const [isPastDiagnosesModalOpen, setPastDiagnosesModalOpen] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [modalMode, setModalMode] = useState<'visit' | 'revenue'>('visit');
    
    // Use a ref to track the newly created visit within the modal's lifecycle without causing re-renders.
    const newlyCreatedVisitRef = useRef<Visit | null>(null);

    const [newPatient, setNewPatient] = useState<Omit<Patient, 'patient_id'>>({ name: '', dob: '', gender: 'ذكر', phone: '', address: '' });
    
    const today = getLocalYYYYMMDD(new Date());
    const initialFormState = {
        clinic_id: clinics[0]?.clinic_id || 0,
        visit_type: VisitType.FirstVisit,
        notes: '',
        base_amount: 0,
        discount: '',
        revenue_date: today,
    };
    const [visitFormData, setVisitFormData] = useState(initialFormState);
    
    // Derived values for calculation
    const visitDiscountValue = parseFloat(visitFormData.discount) || 0;
    const visitAmountAfterDiscount = Math.max(0, visitFormData.base_amount - visitDiscountValue);
    
    useEffect(() => {
        if (isAddVisitModalOpen && visitFormData.clinic_id && clinics.length > 0) {
            const selectedClinic = clinics.find(c => c.clinic_id === visitFormData.clinic_id);
            if (selectedClinic) {
                const price = visitFormData.visit_type === VisitType.FirstVisit
                    ? selectedClinic.price_first_visit
                    : selectedClinic.price_followup;
                setVisitFormData(prev => ({ ...prev, base_amount: price, discount: '' }));
            }
        }
    }, [visitFormData.clinic_id, visitFormData.visit_type, clinics, isAddVisitModalOpen]);

    const dailyVisits = visits.filter(v => v.visit_date === today).length;
    
    const waitingPatients = visits.filter(v => 
        v.visit_date === today &&
        (v.status === VisitStatus.Waiting || v.status === VisitStatus.InProgress) &&
        !diagnoses.some(d => d.visit_id === v.visit_id)
    ).length;

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm)
    );

    const pastDiagnosesForSelectedPatient = useMemo(() => {
        if (!selectedPatient) return [];

        const patientVisits = visits.filter(v => v.patient_id === selectedPatient.patient_id);
        const patientVisitIds = patientVisits.map(v => v.visit_id);

        const patientDiagnoses = diagnoses.filter(d => patientVisitIds.includes(d.visit_id));

        return patientDiagnoses.map(diag => {
            const visit = patientVisits.find(v => v.visit_id === diag.visit_id);
            return {
                ...diag,
                visit_date: visit?.visit_date || 'N/A'
            };
        }).sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    }, [selectedPatient, visits, diagnoses]);

    const handleAddPatient = (e: React.FormEvent) => {
        e.preventDefault();
        addPatient(newPatient);
        setNewPatient({ name: '', dob: '', gender: 'ذكر', phone: '', address: '' });
        setAddPatientModalOpen(false);
    };
    
    const handleCloseVisitModal = () => {
        setAddVisitModalOpen(false);
        setSelectedPatient(null);
        newlyCreatedVisitRef.current = null; // Reset the ref on close
    };

    const handleAddVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
    
        // Prevent creating a duplicate visit within the same modal session
        if (newlyCreatedVisitRef.current) {
            showNotification('تمت إضافة الزيارة بالفعل.', 'error');
            return;
        }
        
        try {
            const createdVisit = await addVisit({
                patient_id: selectedPatient.patient_id,
                clinic_id: visitFormData.clinic_id,
                visit_type: visitFormData.visit_type,
            });
    
            // This code runs only on successful visit creation
            newlyCreatedVisitRef.current = createdVisit;
            showNotification('تمت إضافة الزيارة بنجاح. الآن يمكنك تسجيل الإيراد.', 'success');
            setModalMode('revenue');
        } catch (error: any) {
            // Handle any errors thrown by addVisit
            showNotification(error.message || 'حدث خطأ غير متوقع أثناء إضافة الزيارة.', 'error');
        }
    };

    const handleAddRevenue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        
        // If a visit was just created in this modal session, link this revenue to it.
        const visitIdForRevenue = newlyCreatedVisitRef.current ? newlyCreatedVisitRef.current.visit_id : 0;

        const success = await addManualRevenue({
            visit_id: visitIdForRevenue,
            patient_id: selectedPatient.patient_id,
            patient_name: selectedPatient.name,
            clinic_id: visitFormData.clinic_id,
            amount: visitAmountAfterDiscount,
            date: visitFormData.revenue_date,
            type: visitFormData.visit_type,
            notes: visitFormData.notes || '',
        });

        if (success) {
            showNotification('تم تسجيل الإيراد بنجاح', 'success');
            handleCloseVisitModal();
        }
    };
    
    const openAddVisitModal = (patient: Patient) => {
        setSelectedPatient(patient);
        const initialClinicId = clinics[0]?.clinic_id || 0;
        const initialClinic = clinics.find(c => c.clinic_id === initialClinicId);
        const initialPrice = initialClinic ? initialClinic.price_first_visit : 0;
        
        setVisitFormData({
            ...initialFormState,
            clinic_id: initialClinicId,
            base_amount: initialPrice,
            revenue_date: today,
        });
        newlyCreatedVisitRef.current = null; // Reset ref when opening modal
        setModalMode('visit');
        setAddVisitModalOpen(true);
    };
    
    const handleVisitFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setVisitFormData(prev => ({
            ...prev,
            [name]: name === 'clinic_id' ? Number(value) : value,
        }));
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="إجمالي المرضى" value={patients.length} icon={UserGroupIcon} color="bg-blue-500" />
                <StatCard title="زيارات اليوم" value={dailyVisits} icon={CalendarDaysIcon} color="bg-green-500" />
                <StatCard title="في الانتظار" value={waitingPatients} icon={ClockIcon} color="bg-yellow-500" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-teal-800 dark:text-teal-300">بحث عن مريض / إضافة زيارة</h2>
                    <button onClick={() => setAddPatientModalOpen(true)} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                        <PlusIcon className="h-5 w-5 ml-2"/>
                        إضافة مريض جديد
                    </button>
                </div>
                <div className="relative mb-4">
                     <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الاسم</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الهاتف</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map(patient => (
                                <tr key={patient.patient_id} className="border-b dark:border-gray-700">
                                    <td className="p-3">{patient.name}</td>
                                    <td className="p-3">{patient.phone}</td>
                                    <td className="p-3 space-x-2 space-x-reverse">
                                        <button onClick={() => openAddVisitModal(patient)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">
                                            تسجيل كشف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal title="إضافة مريض جديد" isOpen={isAddPatientModalOpen} onClose={() => setAddPatientModalOpen(false)}>
                <form onSubmit={handleAddPatient} className="space-y-4">
                    <input type="text" placeholder="الاسم الكامل" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="date" placeholder="تاريخ الميلاد" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <select value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value as 'ذكر' | 'أنثى'})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                    </select>
                    <input type="tel" placeholder="رقم الهاتف" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="text" placeholder="العنوان" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">إضافة</button>
                </form>
            </Modal>
            
            <Modal title={`إجراء للمريض: ${selectedPatient?.name}`} isOpen={isAddVisitModalOpen} onClose={handleCloseVisitModal}>
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                        onClick={() => setModalMode('visit')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            modalMode === 'visit'
                                ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        تسجيل زيارة
                    </button>
                    <button
                        onClick={() => setModalMode('revenue')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            modalMode === 'revenue'
                                ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        إضافة إيراد
                    </button>
                </div>

                {modalMode === 'visit' && (
                    <form onSubmit={handleAddVisit} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض</label>
                                <div className="flex items-center gap-2">
                                    <input type="text" value={selectedPatient?.name || ''} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                                    <button
                                        type="button"
                                        onClick={() => setPastDiagnosesModalOpen(true)}
                                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                                        title="عرض التشخيصات السابقة"
                                    >
                                        <ClipboardDocumentListIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العيادة</label>
                                <select name="clinic_id" value={visitFormData.clinic_id} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required >
                                    {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الزيارة</label>
                                <select name="visit_type" value={visitFormData.visit_type} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required >
                                    <option value={VisitType.FirstVisit}>كشف جديد</option>
                                    <option value={VisitType.FollowUp}>متابعة</option>
                                </select>
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الزيارة</label>
                                <input type="text" value={today} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                            </div>
                        </div>
                        <div className="pt-4">
                            <button 
                                type="submit"
                                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors" 
                                disabled={isAddingVisit || !!newlyCreatedVisitRef.current}
                                title={newlyCreatedVisitRef.current ? "تمت إضافة الزيارة بالفعل" : ""}
                            >
                                {isAddingVisit ? 'جاري إضافة الزيارة...' : 'تأكيد الزيارة'}
                            </button>
                        </div>
                    </form>
                )}
                
                {modalMode === 'revenue' && (
                    <form onSubmit={handleAddRevenue} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض</label>
                                <div className="flex items-center gap-2">
                                    <input type="text" value={selectedPatient?.name || ''} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                                    <button
                                        type="button"
                                        onClick={() => setPastDiagnosesModalOpen(true)}
                                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                                        title="عرض التشخيصات السابقة"
                                    >
                                        <ClipboardDocumentListIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العيادة</label>
                                <select name="clinic_id" value={visitFormData.clinic_id} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required >
                                    {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الزيارة</label>
                                <select name="visit_type" value={visitFormData.visit_type} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required >
                                    <option value={VisitType.FirstVisit}>كشف جديد</option>
                                    <option value={VisitType.FollowUp}>متابعة</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قيمة الكشف</label>
                                <input type="number" value={visitFormData.base_amount} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخصم</label>
                                <input type="number" name="discount" value={visitFormData.discount} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" min="0" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ بعد الخصم</label>
                                <input type="number" value={visitAmountAfterDiscount} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 font-bold text-teal-700 dark:text-teal-400 dark:bg-gray-600 dark:border-gray-500" readOnly />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الإيراد</label>
                                <input type="date" name="revenue_date" value={visitFormData.revenue_date} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                                <textarea name="notes" value={visitFormData.notes} onChange={handleVisitFormChange} rows={2} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="أي تفاصيل إضافية..." />
                            </div>
                        </div>
                        <div className="pt-4">
                            <button 
                                type="submit"
                                className="w-full bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-400 transition-colors" 
                                disabled={isAdding}
                            >
                                {isAdding ? 'جاري الحفظ...' : 'إضافة الإيراد'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
            
            <Modal title={`التشخيصات السابقة لـ: ${selectedPatient?.name}`} isOpen={isPastDiagnosesModalOpen} onClose={() => setPastDiagnosesModalOpen(false)}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {pastDiagnosesForSelectedPatient.length > 0 ? (
                        pastDiagnosesForSelectedPatient.map(diag => (
                            <div key={diag.diagnosis_id} className="border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-md text-teal-700 dark:text-teal-400">تاريخ الزيارة: {diag.visit_date}</h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">بواسطة: {diag.doctor}</span>
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">التشخيص:</span> {diag.diagnosis}</p>
                                <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">الوصفة:</span> {diag.prescription}</p>
                                {diag.labs_needed && diag.labs_needed.length > 0 && diag.labs_needed[0] && (
                                    <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">المطلوب:</span> {diag.labs_needed.join(', ')}</p>
                                )}
                                {diag.notes && <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">ملاحظات:</span> {diag.notes}</p>}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد تشخيصات سابقة لهذا المريض.</p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ReceptionistDashboard;