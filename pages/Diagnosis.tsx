

import React from 'react';
import { useApp } from '../contexts/AppContext';

const Diagnosis: React.FC = () => {
    const { diagnoses, visits, patients } = useApp();

    const getVisitInfo = (visitId: number) => {
        const visit = visits.find(v => v.visit_id === visitId);
        if (!visit) return { patientName: 'N/A', visitDate: 'N/A' };
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        return {
            patientName: patient?.name || 'N/A',
            visitDate: visit.visit_date
        };
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">سجل التشخيصات</h1>
            <div className="space-y-4">
                {diagnoses.map(diag => {
                    const { patientName, visitDate } = getVisitInfo(diag.visit_id);
                    return (
                        <div key={diag.diagnosis_id} className="border dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-teal-700 dark:text-teal-400">{patientName}</h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{visitDate}</span>
                            </div>
                            <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">التشخيص:</span> {diag.diagnosis}</p>
                            <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">الوصفة:</span> {diag.prescription}</p>
                            <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">المطلوب:</span> {diag.labs_needed.join(', ')}</p>
                            {diag.notes && <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">ملاحظات:</span> {diag.notes}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Diagnosis;