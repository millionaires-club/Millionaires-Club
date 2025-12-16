import React, { useState, useMemo } from 'react';
import { AuditLog } from '../types';
import { auditService } from '../services/auditService';
import { formatDateTime } from '../constants';
import { FileDown, Search, Filter, Calendar, User, Database } from 'lucide-react';

interface AuditLogViewerProps {
  members: any[];
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ members }) => {
  const [logs, setLogs] = useState<AuditLog[]>(auditService.getAllLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Get unique values for filters
  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map(log => log.userName));
    return Array.from(users).sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    const entities = new Set(logs.map(log => log.entityType));
    return Array.from(entities).sort();
  }, [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      if (searchTerm && !log.description.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !log.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !log.entityId?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // User filter
      if (filterUser && log.userName !== filterUser) return false;

      // Action filter
      if (filterAction && log.action !== filterAction) return false;

      // Entity filter
      if (filterEntity && log.entityType !== filterEntity) return false;

      // Date range filter
      if (dateFrom) {
        const logDate = new Date(log.timestamp);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (logDate < fromDate) return false;
      }

      if (dateTo) {
        const logDate = new Date(log.timestamp);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) return false;
      }

      return true;
    });
  }, [logs, searchTerm, filterUser, filterAction, filterEntity, dateFrom, dateTo]);

  const handleExportCSV = () => {
    // Create CSV from filtered logs
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Description'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.userName,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
      log.description
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setLogs(auditService.getAllLogs());
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterUser('');
    setFilterAction('');
    setFilterEntity('');
    setDateFrom('');
    setDateTo('');
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
    if (action.startsWith('UPDATE')) return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
    if (action.startsWith('DELETE')) return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
    if (action === 'LOGIN') return 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30';
    if (action === 'LOGOUT') return 'text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30';
    return 'text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30';
  };

  const getRoleBadgeColor = (role?: string) => {
    if (role === 'admin') return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
    if (role === 'treasurer') return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
    return 'text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30';
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Audit Trail</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track all system activities and changes
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <FileDown size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* User Filter */}
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="relative">
            <Database size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Entities</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="From Date"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="To Date"
            />
          </div>
        </div>

        {/* Active Filters & Clear */}
        {(searchTerm || filterUser || filterAction || filterEntity || dateFrom || dateTo) && (
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Database size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">No audit logs found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800 dark:text-white">
                          {log.userName}
                        </span>
                        {log.userRole && (
                          <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${getRoleBadgeColor(log.userRole)}`}>
                            {log.userRole}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {log.entityType}
                      {log.entityId && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          ID: {log.entityId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                      {log.description}
                    </td>
                    <td className="py-3 px-4">
                      {log.changes.length > 0 ? (
                        <details className="text-xs cursor-pointer">
                          <summary className="text-emerald-600 dark:text-emerald-400 hover:underline">
                            {log.changes.length} change(s)
                          </summary>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                            {log.changes.map((change, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{change.field}:</span>{' '}
                                <span className="text-red-600 dark:text-red-400 line-through">{change.oldValue}</span>
                                {' → '}
                                <span className="text-emerald-600 dark:text-emerald-400">{change.newValue}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {filteredLogs.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total Logs
            </div>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {filteredLogs.filter(l => l.action.startsWith('CREATE')).length}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
              Creates
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {filteredLogs.filter(l => l.action.startsWith('UPDATE')).length}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Updates
            </div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {filteredLogs.filter(l => l.action.startsWith('DELETE')).length}
            </div>
            <div className="text-xs text-red-600 dark:text-red-500 mt-1">
              Deletes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
