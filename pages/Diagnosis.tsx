
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
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">سجل التشخيصات</h1>
            <div className="space-y-4">
                {diagnoses.map(diag => {
                    const { patientName, visitDate } = getVisitInfo(diag.visit_id);
                    return (
                        <div key={diag.diagnosis_id} className="border p-4 rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg text-teal-700">{patientName}</h3>
                                <span className="text-sm text-gray-500">{visitDate}</span>
                            </div>
                            <p><span className="font-semibold">التشخيص:</span> {diag.diagnosis}</p>
                            <p><span className="font-semibold">الوصفة:</span> {diag.prescription}</p>
                            <p><span className="font-semibold">المطلوب:</span> {diag.labs_needed.join(', ')}</p>
                            {diag.notes && <p><span className="font-semibold">ملاحظات:</span> {diag.notes}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Diagnosis;
