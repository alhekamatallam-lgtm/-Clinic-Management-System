
import React from 'react';
import { useApp } from '../contexts/AppContext';

const Patients: React.FC = () => {
    const { patients } = useApp();

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">قائمة المرضى</h1>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">الرقم التعريفي</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الاسم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">تاريخ الميلاد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الجنس</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الهاتف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العنوان</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {patients.map(patient => (
                            <tr key={patient.patient_id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-700">{patient.patient_id}</td>
                                <td className="p-3 text-sm text-gray-700 font-medium">{patient.name}</td>
                                <td className="p-3 text-sm text-gray-700">{patient.dob}</td>
                                <td className="p-3 text-sm text-gray-700">{patient.gender}</td>
                                <td className="p-3 text-sm text-gray-700">{patient.phone}</td>
                                <td className="p-3 text-sm text-gray-700">{patient.address}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Patients;
