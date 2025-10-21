import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import { PlusIcon } from '@heroicons/react/24/solid';

const Optimization: React.FC = () => {
    const { user, optimizations, addOptimization, isAdding } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [suggestionText, setSuggestionText] = useState('');
    const [selectedPage, setSelectedPage] = useState('general');


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

    const handleOpenModal = () => {
        setSuggestionText('');
        setSelectedPage('general');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !suggestionText.trim()) return;

        await addOptimization({
            user: user.username,
            name: user.Name,
            page: selectedPage,
            optimize: suggestionText
        });
        
        handleCloseModal();
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">سجل التحسينات والاقتراحات</h1>
                <button
                    onClick={handleOpenModal}
                    className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    إضافة اقتراح جديد
                </button>
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

            <Modal title="إضافة اقتراح جديد" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="suggestion-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            متعلق بصفحة
                        </label>
                        <select
                            id="suggestion-page"
                            value={selectedPage}
                            onChange={(e) => setSelectedPage(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {pageOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="suggestion-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الاقتراح / المشكلة
                        </label>
                        <textarea
                            id="suggestion-text"
                            value={suggestionText}
                            onChange={(e) => setSuggestionText(e.target.value)}
                            rows={5}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="يرجى وصف الاقتراح أو المشكلة بالتفصيل..."
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400"
                        disabled={isAdding}
                    >
                        {isAdding ? 'جاري الإرسال...' : 'إرسال الاقتراح'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Optimization;