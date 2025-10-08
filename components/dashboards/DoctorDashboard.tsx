import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { VisitStatus, Diagnosis, Visit } from '../../types';
import Modal from '../ui/Modal';
import StatCard from '../ui/StatCard';
import { UserGroupIcon, CheckCircleIcon, CurrencyDollarIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DoctorDashboard: React.FC = () => {
    const { user, visits, patients, diagnoses, addDiagnosis, updateVisitStatus, revenues } = useApp();
    const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
    const [isDiagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
    const [newDiagnosis, setNewDiagnosis] = useState<Omit<Diagnosis, 'diagnosis_id'>>({
        visit_id: 0,
        doctor: user?.username || '',
        diagnosis: '',
        prescription: '',
        labs_needed: [],
        notes: ''
    });

    if (!user || user.role !== 'doctor' || !user.clinic_id) {
        return <div> وصول غير مصرح به </div>;
    }

    const today = getLocalYYYYMMDD(new Date());
    const doctorClinicId = user.clinic_id;

    const hasDiagnosis = (visitId: number) => diagnoses.some(d => d.visit_id === visitId);

    const getEffectiveStatus = (visit: Visit): VisitStatus => {
        if (hasDiagnosis(visit.visit_id) && visit.status !== VisitStatus.Canceled) {
            return VisitStatus.Completed;
        }
        return visit.status;
    };

    const myVisitsToday = visits.filter(v => v.clinic_id === doctorClinicId && v.visit_date === today)
        .sort((a,b) => a.queue_number - b.queue_number);

    // Split visits into waiting and completed lists based on the effective status
    const waitingVisits = myVisitsToday.filter(v => {
        const status = getEffectiveStatus(v);
        return status === VisitStatus.Waiting || status === VisitStatus.InProgress;
    });

    const completedVisits = myVisitsToday.filter(v => {
        const status = getEffectiveStatus(v);
        return status === VisitStatus.Completed || status === VisitStatus.Canceled;
    });
    
    const todaysRevenue = revenues
        .filter(r => r.clinic_id === doctorClinicId && r.date === today)
        .reduce((sum, r) => sum + r.amount, 0);

    const openDiagnosisModal = (visitId: number) => {
        setSelectedVisitId(visitId);
        setNewDiagnosis({
            visit_id: visitId,
            doctor: user?.username || '',
            diagnosis: '',
            prescription: '',
            labs_needed: [],
            notes: ''
        });
        updateVisitStatus(visitId, VisitStatus.InProgress);
        setDiagnosisModalOpen(true);
    };

    const handleAddDiagnosis = (e: React.FormEvent) => {
        e.preventDefault();
        addDiagnosis(newDiagnosis);
        setDiagnosisModalOpen(false);
        setSelectedVisitId(null);
    };

    const getPatientName = (patientId: number) => {
        return patients.find(p => p.patient_id === patientId)?.name || 'غير معروف';
    };
    
    const getStatusColor = (status: VisitStatus) => {
        switch (status) {
            case VisitStatus.Waiting: return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case VisitStatus.InProgress: return 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case VisitStatus.Completed: return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300';
            case VisitStatus.Canceled: return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }

    const VisitRow: React.FC<{visit: Visit, queuePosition: React.ReactNode, isWaiting: boolean}> = ({ visit, queuePosition, isWaiting }) => {
        const effectiveStatus = getEffectiveStatus(visit);
        return (
            <tr className={`border-b dark:border-gray-700 ${!isWaiting ? 'bg-gray-50 dark:bg-gray-800/60 opacity-60' : ''}`}>
                <td className="p-3 font-bold text-teal-800 dark:text-teal-300">{queuePosition}</td>
                <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{getPatientName(visit.patient_id)}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                        {effectiveStatus}
                    </span>
                </td>
                <td className="p-3">
                     <button 
                        onClick={() => openDiagnosisModal(visit.visit_id)} 
                        className="bg-teal-500 text-white px-3 py-1 rounded-md text-sm hover:bg-teal-600 disabled:bg-gray-400 flex items-center"
                        disabled={!isWaiting}
                    >
                      <PencilSquareIcon className="h-4 w-4 ml-1" />
                      {hasDiagnosis(visit.visit_id) ? 'عرض التشخيص' : 'تسجيل التشخيص'}
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="إجمالي مرضى اليوم" value={myVisitsToday.length} icon={UserGroupIcon} color="bg-blue-500" />
                <StatCard title="المرضى المتبقين" value={waitingVisits.length} icon={UserGroupIcon} color="bg-yellow-500" />
                <StatCard title="إيرادات اليوم" value={`${todaysRevenue} ريال`} icon={CurrencyDollarIcon} color="bg-indigo-500" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-teal-800 dark:text-teal-300 mb-4">قائمة مرضى اليوم</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الانتظار</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المريض</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                            </tr>
                        </thead>
                        {/* Wating List Body */}
                        {waitingVisits.length > 0 && (
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr className="bg-teal-50 dark:bg-teal-900/50">
                                    <td colSpan={4} className="p-2 text-center font-bold text-teal-800 dark:text-teal-300">قائمة الانتظار الحالية</td>
                                </tr>
                                {/* FIX: Swapped `visit` and `index` to match the correct `map` function signature. */}
                                {waitingVisits.map((visit, index) => (
                                    <VisitRow key={visit.visit_id} visit={visit} queuePosition={index + 1} isWaiting={true} />
                                ))}
                            </tbody>
                        )}
                        {/* Completed List Body */}
                        {completedVisits.length > 0 && (
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <td colSpan={4} className="p-2 text-center font-bold text-gray-600 dark:text-gray-300">الزيارات المكتملة</td>
                                </tr>
                                {completedVisits.map((visit) => (
                                    <VisitRow key={visit.visit_id} visit={visit} queuePosition={<CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />} isWaiting={false} />
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>

            <Modal title="تسجيل التشخيص" isOpen={isDiagnosisModalOpen} onClose={() => setDiagnosisModalOpen(false)}>
                 <form onSubmit={handleAddDiagnosis} className="space-y-4">
                    <textarea placeholder="التشخيص" value={newDiagnosis.diagnosis} onChange={e => setNewDiagnosis({...newDiagnosis, diagnosis: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={3} required />
                    <textarea placeholder="الوصفة الطبية" value={newDiagnosis.prescription} onChange={e => setNewDiagnosis({...newDiagnosis, prescription: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={3} required />
                    <input type="text" placeholder="التحاليل والأشعة المطلوبة (افصل بينها بفاصلة)" onChange={e => setNewDiagnosis({...newDiagnosis, labs_needed: e.target.value.split(',')})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <textarea placeholder="ملاحظات إضافية" value={newDiagnosis.notes} onChange={e => setNewDiagnosis({...newDiagnosis, notes: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2} />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">حفظ التشخيص</button>
                </form>
            </Modal>
        </div>
    );
};

export default DoctorDashboard;