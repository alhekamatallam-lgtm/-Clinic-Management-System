

import React from 'react';
import { useApp } from '../contexts/AppContext';

const Patients: React.FC = () => {
    const { patients } = useApp();

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">قائمة المرضى</h1>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الرقم التعريفي</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الاسم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">تاريخ الميلاد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الجنس</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الهاتف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العنوان</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {patients.map(patient => (
                            <tr key={patient.patient_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.patient_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{patient.name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.dob}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.gender}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.phone}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.address}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Patients;