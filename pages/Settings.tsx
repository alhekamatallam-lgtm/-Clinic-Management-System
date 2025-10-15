import React from 'react';
import { useApp } from '../contexts/AppContext';
import { PhotoIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Role } from '../types';

const Settings: React.FC = () => {
    const { user, clinicLogo, setClinicLogo, clinicStamp, setClinicStamp, showNotification } = useApp();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (base64: string | null) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            // Basic validation for file type and size
            if (!file.type.startsWith('image/')) {
                showNotification('يرجى اختيار ملف صورة صالح.', 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                showNotification('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string);
                showNotification('تم رفع الصورة بنجاح.', 'success');
            };
            reader.onerror = () => {
                showNotification('حدث خطأ أثناء قراءة الملف.', 'error');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = (setter: (base64: string | null) => void, type: string) => {
        if (window.confirm(`هل أنت متأكد من إزالة ${type}؟`)) {
            setter(null);
            showNotification(`تمت إزالة ${type} بنجاح.`, 'success');
        }
    };

    if (user?.role !== Role.Manager) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold text-red-600">وصول غير مصرح به</h1>
                <p className="text-gray-600">هذه الصفحة متاحة للمديرين فقط.</p>
            </div>
        );
    }

    const ImageUploader: React.FC<{
        title: string;
        imageSrc: string | null;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onRemove: () => void;
    }> = ({ title, imageSrc, onFileChange, onRemove }) => (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-teal-800 dark:text-teal-300 mb-4">{title}</h2>
            <div className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center mb-4 bg-white dark:bg-gray-800">
                {imageSrc ? (
                    <img src={imageSrc} alt={title} className="max-h-full max-w-full object-contain p-2" />
                ) : (
                    <div className="text-center text-gray-400">
                        <PhotoIcon className="h-16 w-16 mx-auto" />
                        <p>لا توجد صورة حالياً</p>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-center flex items-center justify-center">
                    <CloudArrowUpIcon className="h-5 w-5 ml-2" />
                    <span>اختر صورة...</span>
                    <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={onFileChange} />
                </label>
                {imageSrc && (
                    <button onClick={onRemove} className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                        <TrashIcon className="h-5 w-5 ml-2" />
                        <span>إزالة</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6 border-b pb-4 dark:border-gray-700">الإعدادات العامة</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageUploader
                    title="شعار المستوصف"
                    imageSrc={clinicLogo}
                    onFileChange={(e) => handleFileChange(e, setClinicLogo)}
                    onRemove={() => handleRemoveImage(setClinicLogo, 'الشعار')}
                />
                <ImageUploader
                    title="ختم المستوصف"
                    imageSrc={clinicStamp}
                    onFileChange={(e) => handleFileChange(e, setClinicStamp)}
                    onRemove={() => handleRemoveImage(setClinicStamp, 'الختم')}
                />
            </div>
        </div>
    );
};

export default Settings;
