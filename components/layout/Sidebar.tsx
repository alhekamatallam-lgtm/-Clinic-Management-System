import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Role, View } from '../../types';
import { ChartBarIcon, UserGroupIcon, ClipboardDocumentListIcon, UsersIcon, BuildingOffice2Icon, DocumentChartBarIcon, PresentationChartLineIcon, BeakerIcon, ClockIcon, DocumentPlusIcon, CurrencyDollarIcon, HeartIcon } from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
    const { user, currentView, setView } = useApp();

    if (!user) return null;

    const navItems = [
        { view: 'dashboard', label: 'لوحة التحكم', icon: PresentationChartLineIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'queue', label: 'شاشة الانتظار', icon: ClockIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'patients', label: 'المرضى', icon: UserGroupIcon, roles: [Role.Reception, Role.Manager] },
        { view: 'visits', label: 'الزيارات', icon: ClipboardDocumentListIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'revenues', label: 'الإيرادات', icon: CurrencyDollarIcon, roles: [Role.Reception, Role.Manager] },
        { view: 'diagnosis', label: 'التشخيص', icon: BeakerIcon, roles: [Role.Doctor, Role.Manager] },
        { view: 'users', label: 'المستخدمين', icon: UsersIcon, roles: [Role.Manager] },
        { view: 'clinics', label: 'العيادات', icon: BuildingOffice2Icon, roles: [Role.Manager] },
        { view: 'doctors', label: 'الأطباء', icon: HeartIcon, roles: [Role.Manager] },
        { view: 'reports', label: 'التقارير', icon: DocumentChartBarIcon, roles: [Role.Doctor, Role.Manager] },
        // { view: 'manual-revenue', label: 'إيراد يدوي', icon: DocumentPlusIcon, roles: [Role.Manager, Role.Reception] },
    ];

    const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

    const NavLink = ({ item }: { item: typeof filteredNavItems[0] }) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        return (
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); setView(item.view as View); }}
                className={`flex items-center px-4 py-3 text-gray-100 hover:bg-teal-700 rounded-lg transition-colors duration-200 ${isActive ? 'bg-teal-700 font-bold' : ''}`}
            >
                <Icon className="h-6 w-6 ml-3" />
                <span>{item.label}</span>
            </a>
        );
    };

    return (
        <div className="w-64 bg-teal-800 text-white flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-center py-4 border-b border-teal-700">
                <ChartBarIcon className="h-8 w-8 text-teal-300 flex-shrink-0"/>
                <h1 className="text-xl font-bold ml-2 text-center">مستوصف عيادات الراجحي التكافلي</h1>
            </div>
            <nav className="flex-1">
                <ul className="space-y-2">
                    {filteredNavItems.map(item => (
                        <li key={item.view}>
                           <NavLink item={item} />
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;