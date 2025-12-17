import React, { useState } from 'react';
import { Member } from '../types';
import { Search, Plus, UserCheck, MoreVertical, Upload, Filter, X, Trash2, Award, Download } from 'lucide-react';
import { getMemberTier, MemberTier } from '../constants';
import * as XLSX from 'xlsx';

interface MembersListProps {
  members: Member[];
  setEditingMember: (member: Member) => void;
  handleAddMember: (e: React.FormEvent) => void;
  handleDeleteMember: (id: string) => void;
  setShowBatchUpload: (show: boolean) => void;
}

const MembersListComponent: React.FC<MembersListProps> = ({ members, setEditingMember, handleAddMember, handleDeleteMember, setShowBatchUpload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || m.accountStatus === statusFilter;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(m.joinDate) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(m.joinDate) <= new Date(endDate);
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'All' || startDate || endDate;

  // Export to Excel function
  const exportToExcel = () => {
    const dataToExport = filteredMembers.map(member => ({
      'Member ID': member.id,
      'Legal Name': member.name,
      'Nickname': member.nickname || '-',
      'Status': member.accountStatus,
      'Tier': getMemberTier(member),
      'Email': member.email,
      'Phone': member.phone || '-',
      'Address': member.address || '-',
      'Total Contribution': member.totalContribution,
      'Join Date': member.joinDate,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...dataToExport.map(row => String(row[key as keyof typeof row]).length)
        ),
        maxWidth
      )
    }));
    worksheet['!cols'] = colWidths;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Millionaires_Club_Members_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  // Helper for badge colors
  const getTierBadgeStyles = (tier: MemberTier) => {
      switch(tier) {
          case 'Diamond': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700';
          case 'Platinum': return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
          case 'Gold': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700';
          case 'Silver': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
          case 'Bronze': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      }
  };

  // Helper to suggest next ID
  const getNextIdHint = () => {
      const ids = members
        .map(m => {
          const match = m.id.match(/^MC-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
      const maxId = ids.length > 0 ? Math.max(...ids) : 1000;
      return `MC-${maxId + 1}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col gap-4">
        {/* Top Controls: Search + Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-slate-800 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={exportToExcel}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 dark:bg-emerald-700 border border-emerald-600 dark:border-emerald-700 text-white rounded-xl font-medium hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-colors shadow-sm"
              title="Export to Excel"
            >
              <Download size={18} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setShowBatchUpload(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Upload size={18} /> <span className="hidden sm:inline">Batch Upload</span>
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 dark:shadow-none"
            >
              <Plus size={18} /> Add Member
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Filter size={16} />
                <span className="text-xs font-bold uppercase">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                    <option value="All">Active</option>
                    <option value="Active">All Status</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                <span className="text-xs text-slate-400">Joined:</span>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs p-1 focus:outline-none text-slate-700 dark:text-white bg-transparent"
                />
                <span className="text-slate-300">-</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs p-1 focus:outline-none text-slate-700 dark:text-white bg-transparent"
                />
            </div>
            
            {hasActiveFilters && (
                <button 
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors ml-auto"
                >
                    <X size={14} /> Clear
                </button>
            )}
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">New Member Registration</h3>
          <form onSubmit={(e) => { handleAddMember(e); setShowAddForm(false); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input name="name" placeholder="Full Name" className="p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
             <input name="mc_id" placeholder={`Member ID (Auto: ${getNextIdHint()})`} className="p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
             <input name="email" type="email" placeholder="Email Address" className="p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
             <input name="phone" placeholder="Phone Number" className="p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
             <input name="nickname" placeholder="Nickname" className="p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
             <input name="address" placeholder="Address" className="p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
             <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold">Register Member</button>
             </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Legal Name</th>
                <th className="px-6 py-4">Nickname</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Total Contribution</th>
                <th className="px-6 py-4">Join Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredMembers.map((member) => {
                const tier = getMemberTier(member);
                return (
                <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-xs">{member.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm overflow-hidden border-2 border-slate-200 dark:border-slate-600">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 italic">
                    {member.nickname || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      member.accountStatus === 'Active' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                    }`}>
                      {member.accountStatus === 'Active' && <UserCheck size={12}/>}
                      {member.accountStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTierBadgeStyles(tier)}`}>
                        {tier === 'Diamond' && <Award size={10} />} {tier}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="text-slate-700 dark:text-slate-300">{member.email}</div>
                    <div className="text-slate-500 dark:text-slate-500">{member.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                    ${member.totalContribution.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">{member.joinDate}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingMember(member)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title="Edit Member"
                        >
                          <MoreVertical size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete Member"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">No members found matching your criteria.</div>
        )}
      </div>
    </div>
  );
};

export default MembersListComponent;