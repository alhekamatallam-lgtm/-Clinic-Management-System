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
        <div className="bg-white p-6 rounded-xl shadow-md printable-area">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-gray-800">تقارير الإيرادات</h1>
                <button 
                    onClick={handlePrint} 
                    className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                    <PrinterIcon className="h-5 w-5 ml-2" />
                    طباعة
                </button>
            </div>
             <h1 className="text-2xl font-bold text-gray-800 mb-6 hidden print:block text-center">تقرير الإيرادات</h1>
            
            {/* Filters Section */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4 no-print">
                <div className="flex items-center text-gray-600 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400" />
                    <span>تصفية حسب:</span>
                </div>
                 <div>
                    <label htmlFor="clinic-filter" className="sr-only">العيادة</label>
                    <select
                        id="clinic-filter"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white"
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
                    <label htmlFor="start-date" className="text-sm font-medium text-gray-700 ml-2">من:</label>
                    <input 
                        type="date" 
                        id="start-date"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="end-date" className="text-sm font-medium text-gray-700 ml-2">إلى:</label>
                    <input 
                        type="date" 
                        id="end-date"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
                <button 
                    onClick={resetFilters} 
                    className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>


            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">نوع الزيارة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRevenues.map(revenue => (
                            <tr key={revenue.revenue_id}>
                                <td className="p-3 text-sm text-gray-700">{revenue.revenue_id}</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.patient_name}</td>
                                <td className="p-3 text-sm text-gray-700">{getClinicName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 font-bold">{revenue.amount} ريال</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.date}</td>
                                <td className="p-3 text-sm text-gray-700">{revenue.type}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                        <tr>
                            <td colSpan={3} className="p-3 text-sm font-bold text-gray-800 text-left">الإجمالي</td>
                            <td colSpan={3} className="p-3 text-sm font-bold text-teal-700 text-right">{totalFilteredAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default Reports;