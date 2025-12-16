import React, { useState, useMemo } from 'react';
import { Member, Loan, Transaction } from '../types';
import { financialService } from '../services/financialService';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  PieChart, Activity, Target, Shield, Download 
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface FinancialProjectionsProps {
  members: Member[];
  loans: Loan[];
  transactions: Transaction[];
}

const FinancialProjections: React.FC<FinancialProjectionsProps> = ({ members, loans, transactions }) => {
  const [projectionView, setProjectionView] = useState<'overview' | 'projections' | 'health'>('overview');

  // Calculate portfolio health
  const portfolioHealth = useMemo(() => 
    financialService.calculatePortfolioHealth(members, loans),
    [members, loans]
  );

  // Generate 12-month projections
  const projections = useMemo(() => 
    financialService.generateFinancialProjections(members, loans, transactions),
    [members, loans, transactions]
  );

  // Late loans
  const lateLoans = useMemo(() => 
    financialService.getLateLoansList(loans),
    [loans]
  );

  // Chart data for projections
  const projectionChartData = projections.map(p => ({
    month: p.month,
    balance: Math.round(p.projectedBalance),
    contributions: Math.round(p.projectedContributions),
    interest: Math.round(p.projectedInterest)
  }));

  const riskChartData = projections.map(p => ({
    month: p.month,
    risk: p.riskScore
  }));

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-900/30';
    if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/30';
    return 'bg-red-50 dark:bg-red-900/30';
  };

  const exportProjections = () => {
    const csv = [
      ['Month', 'Projected Balance', 'Contributions', 'Interest', 'Risk Score'].join(','),
      ...projections.map(p => 
        [p.month, p.projectedBalance.toFixed(2), p.projectedContributions.toFixed(2), 
         p.projectedInterest.toFixed(2), p.riskScore].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-projections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Financial Projections</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">12-month forecast and portfolio health analysis</p>
        </div>
        <button
          onClick={exportProjections}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setProjectionView('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            projectionView === 'overview'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity size={16} />
            Overview
          </div>
        </button>
        <button
          onClick={() => setProjectionView('projections')}
          className={`px-4 py-2 font-medium transition-colors ${
            projectionView === 'projections'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            12-Month Forecast
          </div>
        </button>
        <button
          onClick={() => setProjectionView('health')}
          className={`px-4 py-2 font-medium transition-colors ${
            projectionView === 'health'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} />
            Portfolio Health
          </div>
        </button>
      </div>

      {/* Overview Tab */}
      {projectionView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Assets */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Total Assets</span>
              <DollarSign size={20} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              ${portfolioHealth.totalAssets.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400 text-xs">
              <TrendingUp size={14} />
              <span>Club reserve fund</span>
            </div>
          </div>

          {/* Total Loaned */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Active Loans</span>
              <Target size={20} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              ${portfolioHealth.totalLoaned.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {portfolioHealth.averageLoanUtilization.toFixed(1)}% utilization
            </div>
          </div>

          {/* Interest Earned */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Interest Earned</span>
              <PieChart size={20} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              ${portfolioHealth.totalInterestEarned.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Total interest income
            </div>
          </div>

          {/* Health Score */}
          <div className={`${getHealthBg(portfolioHealth.healthScore)} p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Health Score</span>
              <Shield size={20} className={getHealthColor(portfolioHealth.healthScore)} />
            </div>
            <div className={`text-2xl font-bold ${getHealthColor(portfolioHealth.healthScore)}`}>
              {portfolioHealth.healthScore}/100
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {portfolioHealth.healthScore >= 80 ? 'Excellent' : 
               portfolioHealth.healthScore >= 60 ? 'Good' : 'Needs Attention'}
            </div>
          </div>
        </div>
      )}

      {/* Projections Tab */}
      {projectionView === 'projections' && (
        <div className="space-y-6">
          {/* Balance Projection Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Projected Club Balance</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={projectionChartData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Income Breakdown */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Income Projection</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="contributions" fill="#3b82f6" name="Contributions" />
                <Bar dataKey="interest" fill="#8b5cf6" name="Interest Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Trend */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Risk Score Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={riskChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="risk" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                  name="Risk Score"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              * Lower risk score is better. Score above 50 requires attention.
            </p>
          </div>
        </div>
      )}

      {/* Health Tab */}
      {projectionView === 'health' && (
        <div className="space-y-6">
          {/* Health Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4">Portfolio Metrics</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Loan Utilization</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {portfolioHealth.averageLoanUtilization.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      portfolioHealth.averageLoanUtilization > 80 ? 'bg-red-500' :
                      portfolioHealth.averageLoanUtilization > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, portfolioHealth.averageLoanUtilization)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Default Rate</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {portfolioHealth.defaultRate.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-red-500"
                    style={{ width: `${Math.min(100, portfolioHealth.defaultRate * 5)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Overall Health</span>
                  <span className={`font-bold ${getHealthColor(portfolioHealth.healthScore)}`}>
                    {portfolioHealth.healthScore}/100
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      portfolioHealth.healthScore >= 80 ? 'bg-emerald-500' :
                      portfolioHealth.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${portfolioHealth.healthScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4">Risk Factors</h4>
              <div className="space-y-3">
                {lateLoans.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-700 dark:text-red-300 text-sm">
                        Late Payments
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        {lateLoans.length} loan{lateLoans.length > 1 ? 's' : ''} past due
                      </div>
                    </div>
                  </div>
                )}

                {portfolioHealth.averageLoanUtilization > 80 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-yellow-700 dark:text-yellow-300 text-sm">
                        High Utilization
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        Loan utilization above 80% - limited lending capacity
                      </div>
                    </div>
                  </div>
                )}

                {portfolioHealth.defaultRate > 5 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-700 dark:text-red-300 text-sm">
                        Elevated Defaults
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Default rate above 5% - review lending criteria
                      </div>
                    </div>
                  </div>
                )}

                {lateLoans.length === 0 && 
                 portfolioHealth.averageLoanUtilization <= 80 && 
                 portfolioHealth.defaultRate <= 5 && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Shield size={20} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-emerald-700 dark:text-emerald-300 text-sm">
                        Healthy Portfolio
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        No significant risk factors detected
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Recommendations</h4>
            <div className="space-y-2">
              {portfolioHealth.healthScore >= 80 ? (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                  <span>Portfolio is performing well. Continue current lending practices.</span>
                </div>
              ) : null}
              
              {portfolioHealth.averageLoanUtilization > 70 && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                  <span>Consider increasing member contributions to improve liquidity.</span>
                </div>
              )}

              {lateLoans.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                  <span>Follow up with members who have late payments to avoid defaults.</span>
                </div>
              )}

              {portfolioHealth.totalInterestEarned > 0 && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  <span>Interest income of ${portfolioHealth.totalInterestEarned.toLocaleString()} strengthens club reserves.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialProjections;
