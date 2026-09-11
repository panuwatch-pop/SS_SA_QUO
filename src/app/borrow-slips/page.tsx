'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  Plus, Search, ArrowLeft, FileText, Eye, Edit2, Trash2, CheckCircle2, 
  Clock, AlertCircle, Filter, Copy, RefreshCw, Calendar, ArrowRight, BookOpen
} from 'lucide-react';
import Link from 'next/link';

interface BorrowSlip {
  id: string;
  borrow_number: string;
  quotation_id?: string;
  customer_id?: string;
  company_name: string;
  borrower_name: string;
  borrower_phone?: string;
  borrower_email?: string;
  contact_person?: string;
  status: string;
  borrow_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  purpose?: string;
  project_name?: string;
  deposit_amount: number;
  total_amount: number;
  created_at: string;
  borrow_slip_items?: any[];
  customers?: {
    name: string;
    customer_code: string;
    phone: string;
  };
}

export default function BorrowSlipsPage() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();

  const [slips, setSlips] = useState<BorrowSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    if (user && company) {
      fetchBorrowSlips();
    }
  }, [user, company]);

  const fetchBorrowSlips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('borrow_slips')
        .select(`
          *,
          borrow_slip_items (
            id, quantity, returned_quantity, serial_number
          ),
          customers (
            name,
            customer_code,
            phone
          )
        `)
        .eq('company_name', company)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet
          setSlips([]);
        } else {
          console.error('Error fetching borrow slips:', error);
          alert('เกิดข้อผิดพลาดในการโหลดใบยืมสินค้า: ' + error.message);
        }
      } else {
        setSlips(data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, slipNumber: string) => {
    if (confirm(`คุณต้องการลบใบยืมสินค้า "${slipNumber}" ใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`)) {
      try {
        const { error } = await supabase
          .from('borrow_slips')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('ลบใบยืมสินค้าเรียบร้อยแล้ว');
        fetchBorrowSlips();
      } catch (error: any) {
        console.error('Error deleting borrow slip:', error);
        alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    }
  };

  const isOverdue = (expectedDate?: string, status?: string) => {
    if (!expectedDate || status === 'returned' || status === 'cancelled') return false;
    const exp = new Date(expectedDate);
    exp.setHours(23, 59, 59, 999);
    return exp < new Date();
  };

  const getStatusBadge = (slip: BorrowSlip) => {
    if (isOverdue(slip.expected_return_date, slip.status)) {
      return (
        <span className="status-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>
          <AlertCircle size={12} /> เกินกำหนดคืน
        </span>
      );
    }

    switch (slip.status) {
      case 'draft':
        return <span className="status-badge status-draft"><Clock size={12} /> ฉบับร่าง</span>;
      case 'borrowed':
        return (
          <span className="status-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
            <Clock size={12} /> อยู่ระหว่างยืม
          </span>
        );
      case 'partially_returned':
        return (
          <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
            <RefreshCw size={12} /> คืนบางส่วน
          </span>
        );
      case 'returned':
        return <span className="status-badge status-received"><CheckCircle2 size={12} /> คืนครบแล้ว</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">ยกเลิก</span>;
      default:
        return <span className="status-badge">{slip.status}</span>;
    }
  };

  const handleQuickStatusChange = async (slipId: string, newStatus: string) => {
    // Optimistic UI update
    setSlips((prev: BorrowSlip[]) => prev.map(s => s.id === slipId ? { ...s, status: newStatus } : s));
    
    const updateData: any = { status: newStatus };
    if (newStatus === 'returned') {
      updateData.actual_return_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('borrow_slips')
      .update(updateData)
      .eq('id', slipId);

    if (error) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message);
      fetchBorrowSlips();
    }
  };

  // Stats calculation
  const totalSlips = slips.length;
  const activeBorrowed = slips.filter(s => s.status === 'borrowed' || s.status === 'partially_returned').length;
  const overdueCount = slips.filter(s => isOverdue(s.expected_return_date, s.status)).length;
  const returnedCount = slips.filter(s => s.status === 'returned').length;

  const filteredSlips = slips.filter(slip => {
    const matchesSearch = 
      (slip.borrow_number && slip.borrow_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (slip.borrower_name && slip.borrower_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (slip.project_name && slip.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (slip.purpose && slip.purpose.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (slip.borrow_slip_items && slip.borrow_slip_items.some((i: any) => i.serial_number && i.serial_number.toLowerCase().includes(searchTerm.toLowerCase())));

    let matchesStatus = true;
    if (statusFilter === 'overdue') {
      matchesStatus = isOverdue(slip.expected_return_date, slip.status);
    } else if (statusFilter !== 'all') {
      matchesStatus = slip.status === statusFilter;
    }

    let matchesMonth = true;
    if (selectedMonth !== 'all') {
      const d = new Date(slip.borrow_date || slip.created_at);
      matchesMonth = d.getMonth().toString() === selectedMonth;
    }

    return matchesSearch && matchesStatus && matchesMonth;
  });

  if (authLoading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!user) return null;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ใบยืมสินค้า (Goods Loan)</h1>
            <p className="subtitle">
              จัดการและติดตามการยืม-คืนอุปกรณ์และสินค้า ({company})
            </p>
          </div>
        </div>
        <Link href="/borrow-slips/new" className="btn btn-primary">
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> + ออกใบยืมสินค้า
        </Link>
      </header>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">ใบยืมทั้งหมด</span>
          <span className="stat-value">{totalSlips} <span className="stat-unit">ฉบับ</span></span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">อยู่ระหว่างยืม (Borrowed)</span>
          <span className="stat-value text-primary">{activeBorrowed} <span className="stat-unit">รายการ</span></span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">เกินกำหนดส่งคืน (Overdue)</span>
          <span className="stat-value" style={{ color: overdueCount > 0 ? '#dc2626' : 'inherit' }}>
            {overdueCount} <span className="stat-unit">รายการ</span>
          </span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">ส่งคืนครบแล้ว (Returned)</span>
          <span className="stat-value text-success">{returnedCount} <span className="stat-unit">รายการ</span></span>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="glass-panel filter-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="ค้นหาเลขที่ใบยืม, ผู้ยืม, โปรเจกต์, S/N..." 
            className="input-field search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-item">
            <label className="label" style={{ marginBottom: 0, fontSize: '0.85rem' }}>สถานะ:</label>
            <select 
              className="input-field select-small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="borrowed">อยู่ระหว่างยืม</option>
              <option value="overdue">⚠️ เกินกำหนดคืน</option>
              <option value="partially_returned">คืนบางส่วน</option>
              <option value="returned">คืนครบแล้ว</option>
              <option value="draft">ฉบับร่าง</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="label" style={{ marginBottom: 0, fontSize: '0.85rem' }}>เดือน:</label>
            <select 
              className="input-field select-small"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">ทุกเดือน</option>
              <option value="0">มกราคม</option>
              <option value="1">กุมภาพันธ์</option>
              <option value="2">มีนาคม</option>
              <option value="3">เมษายน</option>
              <option value="4">พฤษภาคม</option>
              <option value="5">มิถุนายน</option>
              <option value="6">กรกฎาคม</option>
              <option value="7">สิงหาคม</option>
              <option value="8">กันยายน</option>
              <option value="9">ตุลาคม</option>
              <option value="10">พฤศจิกายน</option>
              <option value="11">ธันวาคม</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Glass Panel Table */}
      <div className="glass-panel table-container">
        {loading && slips.length === 0 ? (
          <div className="empty-state">กำลังโหลดข้อมูล...</div>
        ) : filteredSlips.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>ไม่พบรายการใบยืมสินค้า</p>
            <Link href="/borrow-slips/new" className="btn btn-outline" style={{ marginTop: '1rem' }}>
              + ออกใบยืมสินค้าฉบับแรก
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>เลขที่ใบยืม</th>
                  <th style={{ width: '11%' }}>วันที่ยืม</th>
                  <th style={{ width: '22%' }}>ผู้ยืม / หน่วยงาน</th>
                  <th style={{ width: '14%' }}>กำหนดส่งคืน</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>จำนวน / ส่งคืน</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlips.map((slip) => {
                  const overdue = isOverdue(slip.expected_return_date, slip.status);
                  const totalItemsQty = slip.borrow_slip_items?.reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0) || 0;
                  const totalReturnedQty = slip.borrow_slip_items?.reduce((sum: number, i: any) => sum + Number(i.returned_quantity || 0), 0) || 0;
                  const remainingQty = Math.max(0, totalItemsQty - totalReturnedQty);

                  return (
                    <tr key={slip.id} className={overdue ? 'row-overdue' : ''}>
                      <td>
                        <Link href={`/borrow-slips/${slip.id}`} className="doc-link">
                          {slip.borrow_number}
                        </Link>
                        {slip.purpose && (
                          <div className="sub-text">
                            {slip.purpose}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem' }}>
                          {slip.borrow_date ? new Date(slip.borrow_date).toLocaleDateString('th-TH') : new Date(slip.created_at).toLocaleDateString('th-TH')}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{slip.borrower_name}</div>
                        {slip.contact_person && (
                          <div className="sub-text">
                            ผู้ติดต่อ: {slip.contact_person} {slip.borrower_phone ? `(${slip.borrower_phone})` : ''}
                          </div>
                        )}
                        {slip.project_name && (
                          <div className="sub-text" style={{ color: 'var(--primary-color)' }}>
                            โครงการ: {slip.project_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ 
                          fontSize: '0.88rem', 
                          fontWeight: overdue ? 'bold' : 'normal',
                          color: overdue ? '#dc2626' : 'inherit' 
                        }}>
                          {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}
                        </div>
                        {overdue && (
                          <span className="overdue-chip">
                            <AlertCircle size={10} /> เกินกำหนด
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {slip.status === 'returned' ? (
                          <span className="progress-badge progress-done">
                            <CheckCircle2 size={12} /> คืนครบ {totalItemsQty} ชิ้น
                          </span>
                        ) : totalReturnedQty > 0 ? (
                          <div>
                            <span className="progress-badge progress-partial">
                              คืนแล้ว {totalReturnedQty}/{totalItemsQty}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px', fontWeight: 500 }}>
                              (ค้าง {remainingQty} ชิ้น)
                            </div>
                          </div>
                        ) : (
                          <span className="progress-badge progress-pending">
                            ยืม {totalItemsQty} ชิ้น
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="status-selector-wrapper" onClick={(e) => e.stopPropagation()}>
                          <select 
                            className={`badge-select badge-${slip.status === 'returned' ? 'success' : slip.status === 'cancelled' ? 'error' : slip.status === 'partially_returned' ? 'warning' : slip.status === 'borrowed' ? 'sent' : 'draft'}`}
                            value={slip.status}
                            onChange={(e) => handleQuickStatusChange(slip.id, e.target.value)}
                            title="คลิกเพื่อเปลี่ยนสถานะได้ทันที"
                          >
                            <option value="borrowed">🔵 อยู่ระหว่างยืม</option>
                            <option value="partially_returned">🟡 คืนบางส่วน</option>
                            <option value="returned">🟢 คืนครบแล้ว</option>
                            <option value="draft">⚪ ฉบับร่าง</option>
                            <option value="cancelled">🔴 ยกเลิก</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <Link href={`/borrow-slips/new?cloneId=${slip.id}`} className="btn-icon bg-white" title="ทำซ้ำ (Duplicate)">
                            <Copy size={17} />
                          </Link>
                          <Link href={`/borrow-slips/${slip.id}/edit`} className="btn-icon bg-white" title="แก้ไข (Edit)">
                            <Edit2 size={17} />
                          </Link>
                          <Link href={`/borrow-slips/${slip.id}`} className="btn-icon bg-white text-primary" title="ดูรายละเอียด/พิมพ์ (View/Print)">
                            <Eye size={17} />
                          </Link>
                          <button 
                            className="btn-icon bg-white text-error" 
                            onClick={() => handleDelete(slip.id, slip.borrow_number)}
                            title="ลบ (Delete)"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container {
          padding: 2rem;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .subtitle {
          color: var(--text-light);
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--text-light);
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .stat-unit {
          font-size: 0.9rem;
          font-weight: 400;
          color: var(--text-light);
        }

        .text-primary { color: #3b82f6; }
        .text-success { color: #10b981; }
        .text-error { color: #ef4444; }

        .filter-panel {
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light);
        }

        .search-input {
          padding-left: 2.5rem;
          width: 100%;
        }

        .filter-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .select-small {
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          width: auto;
        }

        .table-container {
          padding: 0.5rem;
          overflow: hidden;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: var(--text-light);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .data-table th {
          padding: 1rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-light);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.01);
        }

        .data-table td {
          padding: 1rem 0.75rem;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          color: var(--text-color);
        }

        .data-table tbody tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .row-overdue {
          background-color: #fff9f9 !important;
        }

        .row-overdue:hover {
          background-color: #fee2e2 !important;
        }

        .doc-link {
          color: var(--primary-color);
          font-weight: bold;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .doc-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        [data-company="Shinwa Anzen"] .doc-link {
          color: var(--secondary-color);
        }

        .sub-text {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 2px;
        }

        .overdue-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.7rem;
          font-weight: 700;
          background-color: #fee2e2;
          color: #dc2626;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          margin-top: 3px;
        }

        .progress-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
        }

        .progress-done {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }

        .progress-partial {
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .progress-pending {
          background-color: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .status-selector-wrapper {
          display: inline-block;
        }

        .badge-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding: 0.35rem 1.65rem 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          border: 1px solid transparent;
          cursor: pointer;
          outline: none;
          font-family: inherit;
          background-repeat: no-repeat;
          background-position: right 0.45rem center;
          background-size: 10px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          transition: all 0.15s ease;
        }

        .badge-select:hover {
          filter: brightness(0.96);
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }

        .badge-draft { background: rgba(128, 128, 128, 0.15); color: #475569; }
        .badge-sent { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-success { background: rgba(16, 185, 129, 0.15); color: #059669; }
        .badge-error { background: rgba(239, 68, 68, 0.15); color: #dc2626; }

        .badge-select option {
          background-color: #ffffff;
          color: #1e293b;
          font-weight: 500;
          padding: 6px;
        }

        .action-buttons {
          display: flex;
          align-items: center;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.45rem;
          border-radius: 6px;
          transition: all 0.15s;
          text-decoration: none;
        }

        .btn-icon:hover {
          background: rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .bg-white {
          background-color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .bg-white:hover {
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
}
