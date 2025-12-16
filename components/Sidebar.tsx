
import React from 'react';
import { 
  Users, LayoutDashboard, FileText, Wallet, ArrowRightLeft, 
  BarChart3, Settings, Moon, Sun, Calculator, LogOut, X, Award, TrendingUp 
} from 'lucide-react';
import { Member } from '../types';
import { getMemberTier } from '../constants';

interface NavItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  count?: number;
}

const NavItem: React.FC<NavItemProps> = ({ id, icon, label, activeTab, setActiveTab, count }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
      activeTab === id 
        ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 font-medium'
    }`}
  >
    {icon}
    <span className="text-sm tracking-wide">{label}</span>
    {count && count > 0 ? (
      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/40 animate-pulse">
        {count}
      </span>
    ) : null}
  </button>
);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  pendingLoanCount: number;
  isDarkMode: boolean;
  setIsDarkMode: (mode: boolean) => void;
  setShowCalculator: (show: boolean) => void;
  setViewMode: (mode: any) => void;
  userType: 'admin' | 'member';
  member?: Member | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, 
  pendingLoanCount, isDarkMode, setIsDarkMode, setShowCalculator, setViewMode, userType, member 
}) => {
  
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const tier = member ? getMemberTier(member) : 'Bronze';

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 text-slate-400 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-slate-800 flex flex-col`}>
      <div className="p-8 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500 rounded-lg text-white"><Users size={20} /></div>
          Millionaires Club
          </h1>
          <button className="md:hidden" onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button>
      </div>

      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <NavItem id="dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" activeTab={activeTab} setActiveTab={handleTabClick} />
        
        {userType === 'admin' ? (
          <>
            <NavItem id="members" icon={<Users size={18} />} label="Members" activeTab={activeTab} setActiveTab={handleTabClick} />
            <NavItem id="contributions" icon={<Wallet size={18} />} label="Contributions" activeTab={activeTab} setActiveTab={handleTabClick} />
            <NavItem id="loans" icon={<ArrowRightLeft size={18} />} label="Loans" activeTab={activeTab} setActiveTab={handleTabClick} count={pendingLoanCount} />
            <NavItem id="transactions" icon={<FileText size={18} />} label="Transactions" activeTab={activeTab} setActiveTab={handleTabClick} />
            <NavItem id="reports" icon={<BarChart3 size={18} />} label="Reports" activeTab={activeTab} setActiveTab={handleTabClick} />
            <NavItem id="projections" icon={<TrendingUp size={18} />} label="Projections" activeTab={activeTab} setActiveTab={handleTabClick} />
            <div className="my-4 border-t border-slate-800"></div>
            <NavItem id="system" icon={<Settings size={18} />} label="System & Auto" activeTab={activeTab} setActiveTab={handleTabClick} />
          </>
        ) : (
          /* Member Portal Links could go here if managed by same sidebar component, though currently MemberPortal has internal sidebar */
          <></>
        )}
      </nav>

      <div className="p-6 border-t border-slate-800 space-y-4 shrink-0">
           <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition-colors"
          >
              {isDarkMode ? <><Sun size={14}/> Light Mode</> : <><Moon size={14}/> Dark Mode</>}
          </button>

          <button onClick={() => setShowCalculator(true)} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-bold transition-colors">
              <Calculator size={14}/> Loan Calculator
          </button>
          
          <button 
              onClick={() => setViewMode('landing')}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-xs font-bold transition-colors"
          >
              <LogOut size={14}/> Log Out
          </button>

          {userType === 'admin' ? (
            <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold">A</div>
                <div><p className="text-white font-medium">Admin User</p></div>
            </div>
          ) : member ? (
            <div className="flex items-center gap-3 text-sm bg-slate-800/50 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">{member.name.charAt(0)}</div>
                <div className="overflow-hidden">
                    <p className="text-white font-medium truncate">{member.name}</p>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 uppercase font-bold">
                       {tier === 'Diamond' && <Award size={8} />} {tier}
                    </span>
                </div>
            </div>
          ) : null}
      </div>
    </aside>
  );
};

export default Sidebar;
