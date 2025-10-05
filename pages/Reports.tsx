import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/solid';

const Reports: React.FC = () => {
    const { revenues, clinics } = useApp();
    
    // State for filters
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    const filteredRevenues = useMemo(() => {
        let tempRevenues = [...revenues];

        // 1. Clinic filter
        if (clinicFilter !== 'all') {
            tempRevenues = tempRevenues.filter(r => r.clinic_id === parseInt(clinicFilter));
        }

        // 2. Date range filter
        if (startDate) {
            tempRevenues = tempRevenues.filter(r => r.date >= startDate);
        }
        if (endDate) {
            tempRevenues = tempRevenues.filter(r => r.date <= endDate);
        }
        
        // Sort by most recent date
        return tempRevenues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [revenues, clinicFilter, startDate, endDate]);

    const totalFilteredAmount = useMemo(() => {
        return filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
    }, [filteredRevenues]);

    const resetFilters = () => {
        setClinicFilter('all');
        setStartDate('');
        setEndDate('');
    };
    
    const handlePrint = () => {
        window.print();
    };

    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md printable-area">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">تقارير الإيرادات</h1>
                <button 
                    onClick={handlePrint} 
                    className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                    <PrinterIcon className="h-5 w-5 ml-2" />
                    طباعة
                </button>
            </div>
             <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6 hidden print:block text-center">تقرير الإيرادات</h1>
            
            {/* Filters Section */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4 no-print">
                <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400 dark:text-gray-500" />
                    <span>تصفية حسب:</span>
                </div>
                 <div>
                    <label htmlFor="clinic-filter" className="sr-only">العيادة</label>
                    <select
                        id="clinic-filter"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={clinicFilter}
                        onChange={e => setClinicFilter(e.target.value)}
                    >
                        <option value="all">كل العيادات</option>
                        {clinics.map(clinic => (
                            <option key={clinic.clinic_id} value={clinic.clinic_id}>{clinic.clinic_name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="start-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">من:</label>
                    <input 
                        type="date" 
                        id="start-date"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="end-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">إلى:</label>
                    <input 
                        type="date" 
                        id="end-date"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
                <button 
                    onClick={resetFilters} 
                    className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>


            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">نوع الزيارة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredRevenues.map(revenue => (
                            <tr key={revenue.revenue_id}>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.revenue_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.patient_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getClinicName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{revenue.amount} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.type}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <td colSpan={3} className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200 text-left">الإجمالي</td>
                            <td colSpan={3} className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400 text-right">{totalFilteredAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default Reports;