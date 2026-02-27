'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate } from '@/lib/utils';
import {
  FileText,
  Download,
  Calendar,
  BarChart2,
  Wand2,
  TrendingUp,
} from 'lucide-react';
import type { BoardReport } from '@/types';

export default function ReportsPage() {
  const { user, getToken, isAdmin, isBoard } = useAuth();
  const toast = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState<BoardReport | null>(null);

  async function fetchReport() {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ format: 'json' });
      if (startDate) params.set('startDate', startDate);
      if (endDate)   params.set('endDate', endDate);

      const res = await fetch(`/api/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReport(data.data as BoardReport);
      toast('success', 'Report generated');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  async function exportCSV() {
    try {
      const token = await getToken();
      const params = new URLSearchParams({ format: 'csv' });
      if (startDate) params.set('startDate', startDate);
      if (endDate)   params.set('endDate', endDate);

      const res  = await fetch(`/api/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `tbhf-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('success', 'CSV downloaded');
    } catch (err) {
      toast('error', 'Export failed');
    }
  }

  async function exportPDF() {
    if (!report) return;
    try {
      const { jsPDF }       = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFillColor(217, 119, 6); // brand-500
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TBHF Social Studio', margin, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Board Report', margin, 20);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW - margin, 20, { align: 'right' });

      // ── Executive Summary ────────────────────────────────────────────────────
      doc.setTextColor(28, 25, 23);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', margin, 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const summaryLines = [
        `Reporting Period: ${report.dateRange.start || 'All time'} – ${report.dateRange.end || 'Present'}`,
        `Total Campaigns: ${report.campaigns.length}`,
        `Total Posts Created: ${report.totalPostsCreated}`,
        `Total AI Generations: ${report.totalAIGenerations}`,
        `Overall Reach: ${report.overallReach.toLocaleString()}`,
        `Overall Engagement: ${report.overallEngagement.toLocaleString()}`,
      ];
      summaryLines.forEach((line, i) => {
        doc.text(line, margin, 46 + i * 6);
      });

      // ── Campaign Summary Table ────────────────────────────────────────────────
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Campaign Performance', margin, 88);

      autoTable(doc, {
        startY:  92,
        margin:  { left: margin, right: margin },
        head: [['Campaign', 'Posts', 'Reach', 'Avg Engagement', 'Donation Clicks', 'Volunteers']],
        body: report.campaigns.map((cs) => [
          cs.campaign.name,
          cs.postCount,
          cs.totalReach.toLocaleString(),
          cs.avgEngagement.toFixed(1),
          cs.impact?.donationClicks ?? 0,
          cs.impact?.volunteerSignups ?? 0,
        ]),
        headStyles:  { fillColor: [217, 119, 6], textColor: 255, fontSize: 8 },
        bodyStyles:  { fontSize: 8, textColor: [28, 25, 23] },
        alternateRowStyles: { fillColor: [250, 249, 247] },
        tableLineColor: [231, 229, 228],
        tableLineWidth: 0.1,
      });

      // ── Footer ─────────────────────────────────────────────────────────────
      const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 113, 108);
        doc.text(
          `TBHF Social Studio | Confidential | Page ${i} of ${totalPages}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' },
        );
      }

      doc.save(`tbhf-board-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast('success', 'PDF downloaded');
    } catch (err) {
      console.error(err);
      toast('error', 'PDF export failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Board Reports</h2>
        <p className="text-stone-500 text-sm mt-0.5">
          Generate executive-ready reports for board review.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <h3 className="section-heading mb-4">Report Configuration</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="label block mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="label block mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-base"
            />
          </div>
          <Button
            onClick={fetchReport}
            loading={loading}
            icon={<BarChart2 className="h-4 w-4" />}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report */}
      {report && (
        <div className="space-y-5">
          {/* Export buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={exportPDF}
            >
              Export PDF
            </Button>
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={exportCSV}
            >
              Export CSV
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Campaigns"        value={report.campaigns.length}          icon={<FileText   className="h-5 w-5" />} />
            <MetricCard label="Total Posts"      value={report.totalPostsCreated}         icon={<FileText   className="h-5 w-5" />} />
            <MetricCard label="Total Reach"      value={formatNumber(report.overallReach)} icon={<BarChart2  className="h-5 w-5" />} />
            <MetricCard label="AI Generations"   value={report.totalAIGenerations}        icon={<Wand2      className="h-5 w-5" />} />
          </div>

          {/* Campaign table */}
          <div className="card p-5">
            <h3 className="section-heading mb-4">Campaign Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    {['Campaign', 'Posts', 'Total Reach', 'Avg Engagement', 'Donation Clicks', 'Volunteer Signups', 'Media Mentions'].map((h) => (
                      <th key={h} className="pb-3 pr-4 font-medium text-stone-500 text-xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {report.campaigns.map((cs) => (
                    <tr key={cs.campaign.id} className="hover:bg-stone-50/50">
                      <td className="py-3 pr-4 font-medium text-stone-800">{cs.campaign.name}</td>
                      <td className="py-3 pr-4 text-stone-600">{cs.postCount}</td>
                      <td className="py-3 pr-4 text-stone-600">{formatNumber(cs.totalReach)}</td>
                      <td className="py-3 pr-4 text-stone-600">{cs.avgEngagement.toFixed(1)}</td>
                      <td className="py-3 pr-4 text-stone-600">{cs.impact?.donationClicks ?? '—'}</td>
                      <td className="py-3 pr-4 text-stone-600">{cs.impact?.volunteerSignups ?? '—'}</td>
                      <td className="py-3 pr-4 text-stone-600">{cs.impact?.mediaMentions ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Meta */}
          <p className="text-xs text-stone-400">
            Report generated on {formatDate(report.generatedAt, 'MMMM d, yyyy h:mm a')}.
            Confidential — for board use only.
          </p>
        </div>
      )}

      {!report && !loading && (
        <div className="card p-12 text-center">
          <FileText className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-700">No report generated yet</h3>
          <p className="text-sm text-stone-400 mt-1">
            Configure the date range above and click &quot;Generate Report&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
