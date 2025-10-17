import React from 'react';
import { useApp } from '../contexts/AppContext';

const Optimization: React.FC = () => {
    const { optimizations } = useApp();

    const pageOptions = [
        { value: 'dashboard', label: 'لوحة التحكم' },
        { value: 'queue', label: 'شاشة الانتظار' },
        { value: 'patients', label: 'المرضى' },
        { value: 'visits', label: 'الزيارات' },
        { value: 'revenues', label: 'الإيرادات' },
        { value: 'diagnosis', label: 'التشخيص' },
        { value: 'reports', label: 'التقارير' },
        { value: 'users', label: 'المستخدمين' },
        { value: 'clinics', label: 'العيادات' },
        { value: 'doctors', label: 'الأطباء' },
        { value: 'settings', label: 'الإعدادات' },
        { value: 'documentation', label: 'الوثائق' },
        { value: 'general', label: 'عام / أخرى' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">سجل التحسينات والاقتراحات</h1>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المستخدم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الصفحة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الاقتراح / المشكلة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {optimizations.map(opt => (
                            <tr key={opt.optimization_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{opt.name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{pageOptions.find(p => p.value === opt.page)?.label || opt.page}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{opt.optimize}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Optimization;