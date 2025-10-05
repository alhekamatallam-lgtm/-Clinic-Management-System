import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import { Patient, Visit, Diagnosis, User, Clinic, Revenue, Role, View, VisitStatus, VisitType, Doctor } from '../types';

// The API URL provided by the user.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyG35J3sYxH19yFpw0JouX6w01LGC_Q-befaIDBVo4G7tfpdizL9j7sN3rrB9Gqxqw5/exec"; 

// Backend column mapping, used to parse array responses from the API
const COLUMN_MAPPING = {
    Patients: ['patient_id','name','dob','gender','phone','address'],
    Visits: ['visit_id','patient_id','clinic_id','visit_date','queue_number','status','visit_type'],
    Diagnosis: ['diagnosis_id','visit_id','doctor','diagnosis','prescription','labs_needed','notes'],
    Revenues: ['revenue_id','visit_id','patient_id','patient_name','clinic_id','amount','date','type','notes'],
    Users: ['user_id', 'name', 'username', 'password', 'role', 'clinic_id', 'doctor_id', 'doctor_name'],
    Doctors: ['doctor_id', 'doctor_name', 'specialty', 'clinic_id', 'phone', 'email', 'shift', 'status'],
    Clinics: ['clinic_id', 'clinic_name', 'doctor_id', 'doctor_name', 'max_patients_per_day', 'price_first_visit', 'price_followup', 'shift', 'notes'],
};

// Helper function to format dates consistently to 'YYYY-MM-DD' in the local timezone.
const formatDateToLocalYYYYMMDD = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '';
    try {
        const date = new Date(dateInput);
        // Check for invalid date
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (e) {
        // Return empty string if date parsing fails
        return '';
    }
};

// Helper function to convert the array returned by the POST request into a structured object.
// This allows for immediate UI updates with server-generated data (like IDs).
const mapRowToObject = <T,>(row: any[], sheetName: keyof typeof COLUMN_MAPPING): T => {
    const keys = COLUMN_MAPPING[sheetName];
    const obj: { [key: string]: any } = {};
    keys.forEach((key, index) => {
        const value = row[index];
        // Coerce IDs and numeric fields to numbers for type consistency.
        if (key.endsWith('_id') || ['queue_number', 'amount', 'price_first_visit', 'price_followup'].includes(key)) {
            obj[key] = Number(value) || 0;
        } 
        // Convert comma-separated strings for labs_needed back into an array.
        else if (key === 'labs_needed' && typeof value === 'string') {
            obj[key] = value.split(',').filter(l => l && l.trim() !== '');
        }
        else {
            obj[key] = value;
        }
    });
    return obj as T;
};

interface AppContextType {
    user: User | null;
    login: (username: string, password?: string, rememberMe?: boolean) => boolean;
    logout: () => void;
    currentView: View;
    setView: (view: View) => void;
    patients: Patient[];
    visits: Visit[];
    diagnoses: Diagnosis[];
    users: User[];
    clinics: Clinic[];
    revenues: Revenue[];
    doctors: Doctor[];
    addPatient: (patient: Omit<Patient, 'patient_id'>) => Promise<void>;
    addVisit: (visit: Omit<Visit, 'visit_id' | 'visit_date' | 'queue_number' | 'status'>) => Promise<Visit>;
    addDiagnosis: (diagnosis: Omit<Diagnosis, 'diagnosis_id'>) => Promise<void>;
    addManualRevenue: (revenue: Omit<Revenue, 'revenue_id'>) => Promise<boolean>;
    addDoctor: (doctor: Omit<Doctor, 'doctor_id'>) => Promise<void>;
    updateVisitStatus: (visitId: number, status: VisitStatus) => void; 
    addUser: (user: Omit<User, 'user_id'>) => Promise<void>;
    updateUser: (userId: number, userData: Partial<Omit<User, 'user_id'>>) => Promise<void>;
    isAdding: boolean;
    isAddingVisit: boolean;
    loading: boolean;
    isSyncing: boolean;
    error: string | null;
    notification: { message: string; type: 'success' | 'error' } | null;
    // FIX: Expose showNotification function to the context.
    showNotification: (message: string, type?: 'success' | 'error') => void;
    hideNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize user state from localStorage to persist session
    const [user, setUser] = useState<User | null>(() => {
        try {
            const storedUser = localStorage.getItem('clinicUser');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            return null;
        }
    });

    const [currentView, setCurrentView] = useState<View>('dashboard');
    
    // Data states
    const [patients, setPatients] = useState<Patient[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [revenues, setRevenues] = useState<Revenue[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);

    // API states
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingVisit, setIsAddingVisit] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const notificationTimer = useRef<number | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        if (notificationTimer.current) {
            clearTimeout(notificationTimer.current);
        }
        setNotification({ message, type });
        notificationTimer.current = window.setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const hideNotification = () => {
        if (notificationTimer.current) {
            clearTimeout(notificationTimer.current);
        }
        setNotification(null);
    };
    
    // Centralized data fetching function, now with background refresh capability
    const fetchData = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setLoading(true);
        } else {
            setIsSyncing(true);
        }
        setError(null);
        try {
            // Fetch with no-cache option to prevent getting stale data
            const response = await fetch(SCRIPT_URL, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                const processedDiagnoses = (result.data.Diagnosis || []).map((d: any) => ({
                    ...d,
                    labs_needed: typeof d.labs_needed === 'string' ? d.labs_needed.split(',').filter(l => l && l.trim() !== '') : []
                }));
                const processedClinics = (result.data.Clinics || []).map((c: any) => ({
                    ...c,
                    price_first_visit: Number(c.price_first_visit) || 0,
                    price_followup: Number(c.price_followup) || 0,
                }));
                const processedUsers = (result.data.Users || []).map((u: User) => ({
                    ...u,
                    role: u.role ? (u.role as string).trim().toLowerCase() as Role : u.role,
                }));
                 const processedRevenues = (result.data.Revenues || []).map((r: Revenue) => ({
                    ...r,
                    date: formatDateToLocalYYYYMMDD(r.date),
                }));
                const processedVisits = (result.data.Visits || []).map((v: Visit) => ({
                    ...v,
                    visit_date: formatDateToLocalYYYYMMDD(v.visit_date),
                }));

                setPatients(result.data.Patients || []);
                setVisits(processedVisits);
                setDiagnoses(processedDiagnoses);
                setUsers(processedUsers);
                setClinics(processedClinics);
                setRevenues(processedRevenues);
                setDoctors(result.data.Doctors || []);
            } else {
                throw new Error(result.message || "Failed to fetch data.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!isBackgroundRefresh) {
                setLoading(false);
            } else {
                setIsSyncing(false);
            }
        }
    };

    // Fetch initial data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    const postData = async (sheet: string, data: object) => {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            // By removing the explicit Content-Type header, we let the browser set it automatically.
            // This is a common fix for "Failed to fetch" CORS-related issues with Google Apps Script.
            body: JSON.stringify({ sheet, ...data }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            console.error("API Error Response:", errorBody);
            throw new Error(`فشل الاتصال بالخادم (الكود: ${response.status})`);
        }

        const resultText = await response.text();
        try {
            return JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse JSON from server response:", resultText);
            throw new Error("استجابة الخادم غير صالحة.");
        }
    };


    const login = (username: string, password?: string, rememberMe: boolean = false): boolean => {
        const foundUser = users.find(u => u.username === username && u.password === password);
        if (foundUser) {
            const { password: _, ...userToStore } = foundUser; // Exclude password from stored object
            setUser(userToStore);
            localStorage.setItem('clinicUser', JSON.stringify(userToStore));
            
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }

            setView('dashboard');
            showNotification('تم تسجيل الدخول بنجاح', 'success');
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('clinicUser');
    };

    const setView = (view: View) => {
        setCurrentView(view);
        fetchData(true); // Use background refresh when changing views
    };

    const addPatient = async (patientData: Omit<Patient, 'patient_id'>) => {
        try {
            const result = await postData('Patients', patientData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة المريض بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة المريض', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة المريض', 'error');
            console.error("Failed to add patient:", e);
        }
    };

    const addManualRevenue = async (revenueData: Omit<Revenue, 'revenue_id'>): Promise<boolean> => {
        // Input Validation
        if (!revenueData.patient_name || !revenueData.patient_name.trim()) {
            showNotification('يرجى إدخال اسم المريض.', 'error');
            return false;
        }
        if (revenueData.patient_id > 0 && !patients.some(p => p.patient_id === revenueData.patient_id)) {
            showNotification('معرف المريض المحدد غير صالح.', 'error');
            return false;
        }
        if (!revenueData.clinic_id || revenueData.clinic_id <= 0) {
            showNotification('يرجى اختيار عيادة صحيحة.', 'error');
            return false;
        }
        if (!revenueData.amount && revenueData.amount !== 0) { // Allow 0 amount
            showNotification('يرجى إدخال مبلغ صحيح.', 'error');
            return false;
        }
        if (!revenueData.date) {
            showNotification('يرجى تحديد تاريخ صحيح.', 'error');
            return false;
        }
        if (!Object.values(VisitType).includes(revenueData.type)) {
            showNotification('يرجى اختيار نوع زيارة صحيح.', 'error');
            return false;
        }

        if (isAdding) return false;
        setIsAdding(true);
        let success = false;
        try {
            const dataToSend = {
                ...revenueData,
                visit_id: revenueData.visit_id ?? 0, // Use provided visit_id or default to 0
            };
            const result = await postData('Revenues', dataToSend);
            if (result.success) {
                 // Don't show notification here, let the calling function do it for context
                success = true;
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشل تسجيل الإيراد', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل تسجيل الإيراد', 'error');
            console.error("Failed to add manual revenue:", e);
        } finally {
            setIsAdding(false);
        }
        return success;
    };

    const addVisit = async (visitData: Omit<Visit, 'visit_id' | 'visit_date' | 'queue_number' | 'status'>): Promise<Visit> => {
        if (isAddingVisit) throw new Error("لا يمكن إضافة زيارة أخرى أثناء معالجة الطلب الحالي.");
        setIsAddingVisit(true);
    
        try {
            // Step 1: Fetch fresh visit data to ensure queue number is correct.
            let syncResponse = await fetch(SCRIPT_URL, { cache: 'no-cache' });
            if (!syncResponse.ok) throw new Error(`فشل مزامنة البيانات قبل الإضافة (الكود: ${syncResponse.status})`);
            
            let syncResult = await syncResponse.json();
            if (!syncResult.success) throw new Error(syncResult.message || "فشلت مزامنة البيانات.");
            
            // Process dates from server to ensure they are in local YYYY-MM-DD format for comparison
            const currentVisits: Visit[] = (syncResult.data.Visits || []).map((v: any) => ({
                ...v,
                visit_date: formatDateToLocalYYYYMMDD(v.visit_date)
            }));
            
            // Step 2: Calculate the next queue number and get the correct LOCAL date.
            const today = formatDateToLocalYYYYMMDD(new Date());

            const visitsForClinicToday = currentVisits.filter(v => 
                v.clinic_id === visitData.clinic_id && v.visit_date === today
            );
            const newQueueNumber = visitsForClinicToday.length + 1;
    
            // Step 3: Prepare and send the visit data.
            const visitToSend = {
                patient_id: visitData.patient_id,
                clinic_id: visitData.clinic_id,
                visit_date: today,
                queue_number: newQueueNumber,
                status: VisitStatus.Waiting,
                visit_type: visitData.visit_type,
            };
            const visitResult = await postData('Visits', visitToSend);
            
            if (!visitResult.success) {
                 throw new Error(visitResult.message || 'فشلت إضافة الزيارة');
            }
            
            // POST was successful. The server might not have returned the data, so we try to find the visit.
            
            // First, check if the data was returned (the ideal case).
            if (visitResult.data) {
                const newVisit = mapRowToObject<Visit>(visitResult.data, 'Visits');
                await fetchData(true); // Update global state
                return newVisit;
            }

            // If not returned, re-fetch all data and search for the visit we just created.
            // Using a small delay to handle potential server-side replication lag.
            await new Promise(resolve => setTimeout(resolve, 500));

            syncResponse = await fetch(SCRIPT_URL, { cache: 'no-cache' });
            if (!syncResponse.ok) throw new Error(`فشل استرداد الزيارة بعد إنشائها (الكود: ${syncResponse.status})`);
            
            syncResult = await syncResponse.json();
            if (!syncResult.success) throw new Error(syncResult.message || "فشل استرداد الزيارة بعد إنشائها.");
            
            const latestVisits: Visit[] = (syncResult.data.Visits || []).map((v: any) => ({
                ...v,
                visit_date: formatDateToLocalYYYYMMDD(v.visit_date),
            }));

            const createdVisit = latestVisits.find(v => 
                v.patient_id === visitToSend.patient_id &&
                v.clinic_id === visitToSend.clinic_id &&
                v.visit_date === visitToSend.visit_date &&
                v.queue_number === visitToSend.queue_number &&
                v.visit_type === visitToSend.visit_type
            );
            
            if (createdVisit) {
                await fetchData(true); // Sync global state with what we just fetched.
                return createdVisit;
            } else {
                // Final fallback. The visit was likely added but we can't confirm.
                throw new Error('تمت إضافة الزيارة، ولكن تعذر تأكيدها فوراً. يرجى التحقق من قائمة الزيارات.');
            }
        } catch (e: any) {
            console.error("Failed to add visit:", e);
            throw e; // Re-throw the caught error
        } finally {
            setIsAddingVisit(false);
        }
    };
    
    const updateVisit = async (visitId: number, visitData: Partial<Omit<Visit, 'visit_id'>>) => {
        try {
            const dataToSend = {
                action: 'update',
                visit_id: visitId,
                ...visitData
            };
            const result = await postData('Visits', dataToSend);
            if (!result.success) {
                 showNotification(result.message || 'فشل تحديث حالة الزيارة', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل تحديث حالة الزيارة', 'error');
            console.error("Failed to update visit:", e);
        }
    };

    const addDiagnosis = async (diagnosisData: Omit<Diagnosis, 'diagnosis_id'>) => {
        try {
            const dataToSend = {
                ...diagnosisData,
                labs_needed: Array.isArray(diagnosisData.labs_needed) ? diagnosisData.labs_needed.join(',') : '',
            };

            const result = await postData('Diagnosis', dataToSend);
            if (result.success) {
                // After successfully adding the diagnosis, update the visit status to "Completed".
                await updateVisit(diagnosisData.visit_id, { status: VisitStatus.Completed });

                showNotification(result.message || 'تم حفظ التشخيص بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشل حفظ التشخيص', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل حفظ التشخيص', 'error');
            console.error("Failed to add diagnosis:", e);
        }
    };
    
    const addUser = async (userData: Omit<User, 'user_id'>) => {
        try {
            const result = await postData('Users', userData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة المستخدم بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة المستخدم', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to add user:", e);
        }
    };

    const addDoctor = async (doctorData: Omit<Doctor, 'doctor_id'>) => {
        try {
            const result = await postData('Doctors', doctorData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة الطبيب بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة الطبيب', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة الطبيب', 'error');
            console.error("Failed to add doctor:", e);
        }
    };

    const updateUser = async (userId: number, userData: Partial<Omit<User, 'user_id'>>) => {
        try {
            const dataToSend = {
                action: 'update',
                user_id: userId,
                ...userData
            };
            const result = await postData('Users', dataToSend);
            if (result.success) {
                showNotification(result.message || 'تم تحديث المستخدم بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل تحديث المستخدم', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to update user:", e);
        }
    };

    const updateVisitStatus = (visitId: number, status: VisitStatus) => {
        // This is a purely optimistic UI update for immediate feedback (e.g., when a doctor opens a diagnosis modal).
        // The final, correct state will be established by fetchData.
        setVisits(prevVisits =>
            prevVisits.map(v => v.visit_id === visitId ? { ...v, status } : v)
        );
    };
    
    const value = {
        user, login, logout, currentView, setView,
        patients, visits, diagnoses, users, clinics, revenues, doctors,
        addPatient, addVisit, addDiagnosis, addManualRevenue, updateVisitStatus,
        addUser, updateUser, addDoctor,
        isAdding, isAddingVisit,
        loading, isSyncing, error,
        notification, hideNotification, showNotification
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
