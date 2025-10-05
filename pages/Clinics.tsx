import React from 'react';
import { useApp } from '../contexts/AppContext';

const Clinics: React.FC = () => {
    const { clinics } = useApp();

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">إدارة العيادات</h1>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الدوام</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">سعر الكشف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">سعر المتابعة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {clinics.map(clinic => (
                            <tr key={clinic.clinic_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.clinic_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.clinic_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.doctor_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.shift}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.price_first_visit} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.price_followup} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Clinics;