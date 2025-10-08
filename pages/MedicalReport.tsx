import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { Visit, Patient, Clinic, Diagnosis } from '../types';

interface ReportData {
    visit: Visit;
    patient: Patient;
    clinic: Clinic;
    diagnosis: Diagnosis;
}

const MedicalReport: React.FC = () => {
    const { visits, patients, clinics, diagnoses } = useApp();
    
    // State for filters
    const [patientNameFilter, setPatientNameFilter] = useState<string>('');
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    // State for the report to be printed
    const [reportData, setReportData] = useState<ReportData | null>(null);

    const visitsWithDiagnosis = useMemo(() => {
        const diagnosisVisitIds = new Set(diagnoses.map(d => d.visit_id));
        return visits.filter(v => diagnosisVisitIds.has(v.visit_id));
    }, [visits, diagnoses]);
    
    const filteredVisits = useMemo(() => {
        let tempVisits = [...visitsWithDiagnosis];

        // 1. Patient Name filter
        if (patientNameFilter) {
            const patientIds = patients
                .filter(p => p.name.toLowerCase().includes(patientNameFilter.toLowerCase()))
                .map(p => p.patient_id);
            tempVisits = tempVisits.filter(v => patientIds.includes(v.patient_id));
        }

        // 2. Clinic filter
        if (clinicFilter !== 'all') {
            tempVisits = tempVisits.filter(v => v.clinic_id === parseInt(clinicFilter));
        }

        // 3. Date range filter
        if (startDate) {
            tempVisits = tempVisits.filter(v => v.visit_date >= startDate);
        }
        if (endDate) {
            tempVisits = tempVisits.filter(v => v.visit_date <= endDate);
        }
        
        return tempVisits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

    }, [visitsWithDiagnosis, patients, patientNameFilter, clinicFilter, startDate, endDate]);

    const resetFilters = () => {
        setPatientNameFilter('');
        setClinicFilter('all');
        setStartDate('');
        setEndDate('');
    };
    
    const handleGenerateReport = (visit: Visit) => {
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        const clinic = clinics.find(c => c.clinic_id === visit.clinic_id);
        const diagnosis = diagnoses.find(d => d.visit_id === visit.visit_id);

        if (patient && clinic && diagnosis) {
            setReportData({ visit, patient, clinic, diagnosis });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getPatientName = (id: number) => patients.find(p => p.patient_id === id)?.name || 'N/A';
    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';
    const getDoctorName = (visit: Visit) => diagnoses.find(d => d.visit_id === visit.visit_id)?.doctor || 'N/A';

    if (reportData) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6 no-print">
                    <button onClick={() => setReportData(null)} className="text-teal-600 dark:text-teal-400 hover:underline">
                        &larr; العودة للبحث
                    </button>
                    <button 
                        onClick={handlePrint} 
                        className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        <PrinterIcon className="h-5 w-5 ml-2" />
                        طباعة التقرير
                    </button>
                </div>

                {/* This is the printable component */}
                <div className="printable-medical-report font-serif bg-white text-black p-8 md:p-12 rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto">
                    {/* Header */}
                    <header className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">مستوصف الراجحي التكافلي</h1>
                            <p className="text-md text-gray-600">Al Rajhi Takaful Polyclinic</p>
                        </div>
                         <ChartBarIcon className="h-16 w-16 text-teal-600"/>
                    </header>

                    <h2 className="text-center text-2xl font-bold mb-8 underline">تقرير طبي - Medical Report</h2>

                    {/* Patient & Visit Info */}
                    <div className="grid grid-cols-2 gap-8 mb-8 text-lg">
                        <div className="border border-gray-300 p-4 rounded-md">
                            <h3 className="font-bold mb-2 border-b pb-1">معلومات المريض</h3>
                            <p><strong>اسم المريض:</strong> {reportData.patient.name}</p>
                            <p><strong>الرقم الطبي:</strong> {reportData.patient.patient_id}</p>
                            <p><strong>تاريخ الميلاد:</strong> {reportData.patient.dob}</p>
                        </div>
                         <div className="border border-gray-300 p-4 rounded-md">
                            <h3 className="font-bold mb-2 border-b pb-1">تفاصيل الزيارة</h3>
                            <p><strong>تاريخ الزيارة:</strong> {reportData.visit.visit_date}</p>
                            <p><strong>العيادة:</strong> {reportData.clinic.clinic_name}</p>
                            <p><strong>الطبيب المعالج:</strong> {reportData.diagnosis.doctor}</p>
                        </div>
                    </div>

                    {/* Diagnosis Section */}
                    <div className="mb-12">
                        <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-800 pb-2">التشخيص الطبي</h3>
                        <div className="bg-gray-50 p-6 rounded-md space-y-4 text-lg">
                            <div>
                                <h4 className="font-bold text-gray-700">التشخيص (Diagnosis):</h4>
                                <p className="pr-4">{reportData.diagnosis.diagnosis}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700">العلاج الموصوف (Prescription):</h4>
                                <p className="pr-4">{reportData.diagnosis.prescription}</p>
                            </div>
                            {reportData.diagnosis.labs_needed.length > 0 && reportData.diagnosis.labs_needed[0] &&
                                <div>
                                    <h4 className="font-bold text-gray-700">الفحوصات المطلوبة (Required Labs/Scans):</h4>
                                    <p className="pr-4">{reportData.diagnosis.labs_needed.join(', ')}</p>
                                </div>
                            }
                            {reportData.diagnosis.notes &&
                                <div>
                                    <h4 className="font-bold text-gray-700">ملاحظات الطبيب (Doctor's Notes):</h4>
                                    <p className="pr-4">{reportData.diagnosis.notes}</p>
                                </div>
                            }
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <footer className="pt-16 text-center">
                        <div className="flex justify-around items-center">
                             <div className="w-1/2">
                                <p className="font-bold mb-12">توقيع الطبيب المعالج</p>
                                <p>.......................................</p>
                            </div>
                            <div className="w-1/2">
                                <p className="font-bold mb-12">ختم العيادة</p>
                                <p>.......................................</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-8">هذا التقرير صادر من النظام الإلكتروني لمستوصف الراجحي التكافلي.</p>
                    </footer>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">طباعة التقارير الطبية</h1>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400 dark:text-gray-500" />
                    <span>بحث عن زيارة:</span>
                </div>
                <input
                    type="text"
                    placeholder="ابحث باسم المريض..."
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={patientNameFilter}
                    onChange={e => setPatientNameFilter(e.target.value)}
                />
                <select
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={clinicFilter}
                    onChange={e => setClinicFilter(e.target.value)}
                >
                    <option value="all">كل العيادات</option>
                    {clinics.map(clinic => (
                        <option key={clinic.clinic_id} value={clinic.clinic_id}>{clinic.clinic_name}</option>
                    ))}
                </select>
                <input 
                    type="date" 
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <input 
                    type="date" 
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
                <button 
                    onClick={resetFilters} 
                    className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">تاريخ الزيارة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredVisits.length > 0 ? filteredVisits.map(visit => (
                            <tr key={visit.visit_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3">{getPatientName(visit.patient_id)}</td>
                                <td className="p-3">{getClinicName(visit.clinic_id)}</td>
                                <td className="p-3">{getDoctorName(visit)}</td>
                                <td className="p-3">{visit.visit_date}</td>
                                <td className="p-3">
                                    <button
                                        onClick={() => handleGenerateReport(visit)}
                                        className="flex items-center bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                                    >
                                        <DocumentTextIcon className="h-4 w-4 ml-1" />
                                        إنشاء تقرير
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center p-4 text-gray-500 dark:text-gray-400">
                                    لا توجد زيارات مطابقة لمعايير البحث.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MedicalReport;