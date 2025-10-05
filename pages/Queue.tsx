import React from 'react';
import { useApp } from '../contexts/AppContext';
import { VisitStatus, Role } from '../types';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Queue: React.FC = () => {
    const { user, visits, patients, clinics } = useApp();

    const today = getLocalYYYYMMDD(new Date());

    const waitingVisits = visits
        .filter(v => {
            const isToday = v.visit_date === today;
            const isWaitingStatus = v.status === VisitStatus.Waiting || v.status === VisitStatus.InProgress;
            
            if (user?.role === Role.Doctor) {
                // FIX: Changed user.clinic to user.clinic_id to match the User type definition.
                return isToday && isWaitingStatus && v.clinic_id === user.clinic_id;
            }
            
            return isToday && isWaitingStatus;
        })
        .sort((a, b) => a.queue_number - b.queue_number);

    // Group visits by clinic
    const visitsByClinic = waitingVisits.reduce((acc, visit) => {
        const clinicName = clinics.find(c => c.clinic_id === visit.clinic_id)?.clinic_name || 'عيادة غير معروفة';
        if (!acc[clinicName]) {
            acc[clinicName] = [];
        }
        acc[clinicName].push(visit);
        return acc;
    }, {} as Record<string, typeof waitingVisits>);

    const getPatientName = (patientId: number) => {
        return patients.find(p => p.patient_id === patientId)?.name || 'غير معروف';
    };

    return (
        <div>
            <h1 className="text-4xl font-bold text-center text-teal-800 dark:text-teal-300 mb-8">شاشة الانتظار</h1>
            {Object.keys(visitsByClinic).length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 text-xl bg-white dark:bg-gray-800 p-10 rounded-lg shadow-md">
                    <p>لا يوجد مرضى في قائمة الانتظار حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.entries(visitsByClinic).map(([clinicName, clinicVisits]) => (
                        <div key={clinicName} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-bold text-teal-700 dark:text-teal-400 mb-4 border-b-2 pb-2 border-teal-200 dark:border-teal-700">{clinicName}</h2>
                            <ul className="space-y-4">
                                {clinicVisits.map((visit) => (
                                    <li key={visit.visit_id} className={`p-4 rounded-lg flex items-center justify-between ${visit.status === VisitStatus.InProgress ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 dark:border-blue-400' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                                        <div>
                                            <p className="text-2xl font-bold text-teal-800 dark:text-teal-300">{visit.queue_number}</p>
                                            <p className="text-lg text-gray-600 dark:text-gray-300">{getPatientName(visit.patient_id)}</p>
                                        </div>
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${visit.status === VisitStatus.InProgress ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                            {visit.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Queue;