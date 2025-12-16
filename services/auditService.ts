
import { AuditLog } from '../types';
import { authService } from './authService';

const AUDIT_STORAGE_KEY = 'mpm_audit_logs';

export const auditService = {
  // Log an action
  log: (
    action: string,
    entityType: 'member' | 'loan' | 'transaction' | 'application' | 'system',
    entityId: string,
    description: string,
    changes?: { field: string; oldValue: any; newValue: any }[]
  ): void => {
    const user = authService.getStoredUser();
    if (!user) return; // Can't log without authenticated user

    const auditLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      entityType,
      entityId,
      changes,
      description
    };

    const logs = auditService.getAllLogs();
    logs.unshift(auditLog);
    
    // Keep last 1000 logs
    if (logs.length > 1000) {
      logs.splice(1000);
    }

    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  },

  // Get all audit logs
  getAllLogs: (): AuditLog[] => {
    const logsStr = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!logsStr) return [];
    try {
      return JSON.parse(logsStr);
    } catch {
      return [];
    }
  },

  // Get logs for specific entity
  getEntityLogs: (entityType: string, entityId: string): AuditLog[] => {
    return auditService.getAllLogs().filter(
      log => log.entityType === entityType && log.entityId === entityId
    );
  },

  // Get logs by user
  getUserLogs: (userId: string): AuditLog[] => {
    return auditService.getAllLogs().filter(log => log.userId === userId);
  },

  // Get recent logs
  getRecentLogs: (limit: number = 50): AuditLog[] => {
    return auditService.getAllLogs().slice(0, limit);
  },

  // Clear all logs (admin only)
  clearLogs: (): void => {
    if (!authService.hasRole('admin')) return;
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  },

  // Export logs as CSV
  exportLogsAsCSV: (): string => {
    const logs = auditService.getAllLogs();
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Description'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.userName,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
      log.description
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
};
