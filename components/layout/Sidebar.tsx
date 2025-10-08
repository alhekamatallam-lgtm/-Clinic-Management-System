import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Role, View } from '../../types';
import { ChartBarIcon, UserGroupIcon, ClipboardDocumentListIcon, UsersIcon, BuildingOffice2Icon, DocumentChartBarIcon, PresentationChartLineIcon, BeakerIcon, QueueListIcon, DocumentPlusIcon, CurrencyDollarIcon, HeartIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
    const { user, currentView, setView, isSidebarOpen } = useApp();

    if (!user) return null;

    const navItems = [
        { view: 'dashboard', label: 'لوحة التحكم', icon: PresentationChartLineIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'queue', label: 'شاشة الانتظار', icon: QueueListIcon, roles: [Role.Reception, Role.Doctor, Role.Manager], color: 'text-amber-400' },
        { view: 'patients', label: 'المرضى', icon: UserGroupIcon, roles: [Role.Reception, Role.Manager] },
        { view: 'visits', label: 'الزيارات', icon: ClipboardDocumentListIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'revenues', label: 'الإيرادات', icon: CurrencyDollarIcon, roles: [Role.Reception, Role.Manager] },
        { view: 'diagnosis', label: 'التشخيص', icon: BeakerIcon, roles: [Role.Doctor, Role.Manager] },
        { view: 'users', label: 'المستخدمين', icon: UsersIcon, roles: [Role.Manager] },
        { view: 'clinics', label: 'العيادات', icon: BuildingOffice2Icon, roles: [Role.Manager] },
        { view: 'doctors', label: 'الأطباء', icon: HeartIcon, roles: [Role.Manager] },
        { view: 'reports', label: 'تقارير الإيرادات', icon: DocumentChartBarIcon, roles: [Role.Manager] },
        { view: 'medical-report', label: 'التقارير الطبية', icon: DocumentTextIcon, roles: [Role.Doctor, Role.Manager] },
    ];

    const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

    const NavLink = ({ item }: { item: typeof filteredNavItems[0] }) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        const colorClass = (item as { color?: string }).color || '';
        return (
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); setView(item.view as View); }}
                className={`flex items-center px-4 py-3 text-gray-100 hover:bg-teal-700 rounded-lg transition-colors duration-200 ${isActive ? 'bg-teal-700 font-bold' : ''} ${!isSidebarOpen ? 'justify-center' : ''}`}
                title={!isSidebarOpen ? item.label : ''}
            >
                <Icon className={`h-6 w-6 flex-shrink-0 ${isSidebarOpen ? 'ml-3' : ''} ${colorClass}`} />
                {isSidebarOpen && <span>{item.label}</span>}
            </a>
        );
    };

    const mobileTransform = isSidebarOpen ? 'translate-x-0' : 'translate-x-full';
    const desktopWidth = isSidebarOpen ? 'lg:w-64' : 'lg:w-20';

    return (
        <div className={`fixed lg:static inset-y-0 right-0 z-30 bg-teal-800 text-white flex flex-col p-4 space-y-4 w-64 transform lg:transform-none transition-all duration-300 ease-in-out ${mobileTransform} ${desktopWidth}`}>
            <div className="flex items-center justify-center py-4 border-b border-teal-700 overflow-hidden">
                <ChartBarIcon className="h-8 w-8 text-teal-300 flex-shrink-0"/>
                {isSidebarOpen && <h1 className="text-xl font-bold ml-2 text-center whitespace-nowrap">مستوصف الراجحي</h1>}
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