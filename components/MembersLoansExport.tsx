import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Download, Loader } from 'lucide-react';

interface MemberLoanData {
  id: string;
  mcId: string;
  name: string;
  email: string;
  phone: string;
  totalLoansTaken: number;
  totalOutstandingBalance: number;
  numberOfLoans: number;
  joinDate: string;
}

export const MembersLoansExport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<MemberLoanData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  const handleSyncToSheets = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/members/sync/sheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to sync data');

      const result = await response.json();
      setData(result.data);
      setTotalAmount(result.totalLoanAmount);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'MC ID',
      'Name',
      'Email',
      'Phone',
      'Total Loans Taken',
      'Outstanding Balance',
      'Number of Loans',
      'Join Date',
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        [
          row.mcId,
          `"${row.name}"`,
          row.email,
          row.phone,
          row.totalLoansTaken.toFixed(2),
          row.totalOutstandingBalance.toFixed(2),
          row.numberOfLoans,
          new Date(row.joinDate).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-loans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Members & Loans Export</h2>
        <button
          onClick={handleSyncToSheets}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? <Loader className="animate-spin" size={18} /> : <Download size={18} />}
          {loading ? 'Syncing...' : 'Sync to Sheets'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-800">Success</h3>
            <p className="text-green-700">Data retrieved successfully! {data.length} members found.</p>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-blue-600">{data.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Loans Taken</p>
              <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <p className="text-sm text-gray-600">Average Loan</p>
              <p className="text-2xl font-bold text-purple-600">
                ${(totalAmount / data.length).toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} />
            Export as CSV
          </button>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-3">MC ID</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-right p-3">Total Loans</th>
                  <th className="text-right p-3">Outstanding</th>
                  <th className="text-center p-3"># Loans</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{row.mcId}</td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3 text-gray-600">{row.email}</td>
                    <td className="p-3 text-right font-semibold text-blue-600">
                      ${row.totalLoansTaken.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-orange-600">
                      ${row.totalOutstandingBalance.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-gray-200 px-2 py-1 rounded">{row.numberOfLoans}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>Click "Sync to Sheets" to load members and their loan data</p>
        </div>
      )}
    </div>
  );
};
