
import React from 'react';
import { useApp } from '../contexts/AppContext';

const Clinics: React.FC = () => {
    const { clinics } = useApp();

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة العيادات</h1>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الطبيب المسؤول</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">سعر الكشف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">سعر المتابعة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {clinics.map(clinic => (
                            <tr key={clinic.clinic_id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-700">{clinic.clinic_id}</td>
                                <td className="p-3 text-sm text-gray-700">{clinic.clinic_name}</td>
                                <td className="p-3 text-sm text-gray-700">{clinic.doctor_assigned}</td>
                                <td className="p-3 text-sm text-gray-700">{clinic.price_first_visit} ريال</td>
                                <td className="p-3 text-sm text-gray-700">{clinic.price_followup} ريال</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Clinics;
