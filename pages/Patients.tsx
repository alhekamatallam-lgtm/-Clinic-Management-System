import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const Patients: React.FC = () => {
    const { patients } = useApp();
    const [currentPage, setCurrentPage] = useState(1);
    const patientsPerPage = 10;

    const indexOfLastPatient = currentPage * patientsPerPage;
    const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
    const currentPatients = patients.slice(indexOfFirstPatient, indexOfLastPatient);

    const totalPages = Math.ceil(patients.length / patientsPerPage);

    const paginate = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };
    
    const PaginationControls = () => (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-400">
                عرض {indexOfFirstPatient + 1} إلى {Math.min(indexOfLastPatient, patients.length)} من أصل {patients.length} سجل
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">السابق</span>
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    صفحة {currentPage} من {totalPages}
                </span>
                <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                     <span className="hidden sm:inline">التالي</span>
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );


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
                        {currentPatients.map(patient => (
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
            {totalPages > 1 && <PaginationControls />}
        </div>
    );
};

export default Patients;