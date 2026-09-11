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
            <h1>รายการใบยืมสินค้า</h1>
            <p className="subtitle">
              ติดตามการยืม-คืนอุปกรณ์และสินค้าของบริษัท {company}
            </p>
          </div>
        </div>
        <Link href="/borrow-slips/new" className="btn btn-primary">
          <Plus size={20} style={{ marginRight: '0.5rem' }} /> สร้างใบยืมสินค้า
        </Link>
      </header>

      {/* KPI Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ใบยืมทั้งหมด</span>
            <span className="stat-value">{totalSlips}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">อยู่ระหว่างยืม</span>
            <span className="stat-value">{activeBorrowed}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">เกินกำหนดส่งคืน</span>
            <span className="stat-value" style={{ color: overdueCount > 0 ? '#dc2626' : 'inherit' }}>
              {overdueCount}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ส่งคืนครบแล้ว</span>
            <span className="stat-value">{returnedCount}</span>
          </div>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel content-panel">
        
        {/* Search & Filters */}
        <div className="filter-container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '280px', margin: 0 }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="ค้นหาเลขที่, ผู้ยืม, โปรเจกต์, S/N..."
              className="input-field"
              style={{ width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--text-light)' }} />
            <select 
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '160px', padding: '0.45rem' }}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="borrowed">อยู่ระหว่างยืม</option>
              <option value="overdue">⚠️ เกินกำหนดคืน</option>
              <option value="partially_returned">คืนบางส่วน</option>
              <option value="returned">คืนครบแล้ว</option>
              <option value="draft">ฉบับร่าง</option>
              <option value="cancelled">ยกเลิก</option>
            </select>

            <select 
              className="input-field"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '140px', padding: '0.45rem' }}
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

        {/* Table Content */}
        {loading && slips.length === 0 ? (
          <div className="empty-state">กำลังโหลดข้อมูล...</div>
        ) : filteredSlips.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>ไม่พบรายการใบยืมสินค้า</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
              สามารถกดปุ่ม "สร้างใบยืมสินค้า" ด้านบนเพื่อเริ่มบันทึกรายการยืมได้ทันที
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>เลขที่ใบยืม</th>
                  <th style={{ width: '22%' }}>ผู้ยืม / หน่วยงาน</th>
                  <th style={{ width: '12%' }}>วันที่ยืม</th>
                  <th style={{ width: '14%' }}>กำหนดส่งคืน</th>
                  <th style={{ width: '14%' }}>วัตถุประสงค์</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>จำนวนชิ้น</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlips.map((slip) => {
                  const overdue = isOverdue(slip.expected_return_date, slip.status);
                  const totalItemsQty = slip.borrow_slip_items?.reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0) || 0;
                  const totalReturnedQty = slip.borrow_slip_items?.reduce((sum: number, i: any) => sum + Number(i.returned_quantity || 0), 0) || 0;

                  return (
                    <tr key={slip.id} style={{ backgroundColor: overdue ? '#fff5f5' : 'inherit' }}>
                      <td>
                        <Link href={`/borrow-slips/${slip.id}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                          {slip.borrow_number}
                        </Link>
                        {slip.project_name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                            {slip.project_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{slip.borrower_name}</div>
                        {slip.contact_person && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            ติดต่อ: {slip.contact_person} {slip.borrower_phone ? `(${slip.borrower_phone})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>
                        {slip.borrow_date ? new Date(slip.borrow_date).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: overdue ? 'bold' : 'normal',
                          color: overdue ? '#b91c1c' : 'inherit' 
                        }}>
                          {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}
                        </span>
                        {overdue && (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                            เกินกำหนด!
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <span className="mini-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                          {slip.purpose || 'ยืมใช้งาน'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{totalItemsQty}</span>
                        {totalReturnedQty > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                            คืนแล้ว {totalReturnedQty}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getStatusBadge(slip)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <Link href={`/borrow-slips/${slip.id}`} className="btn-icon" title="ดูเอกสาร / บันทึกรับคืน">
                            <Eye size={16} />
                          </Link>
                          <Link href={`/borrow-slips/${slip.id}/edit`} className="btn-icon" title="แก้ไขข้อมูล">
                            <Edit2 size={16} />
                          </Link>
                          <Link href={`/borrow-slips/new?cloneId=${slip.id}`} className="btn-icon" title="คัดลอก (ทำซ้ำใบใหม่)">
                            <Copy size={16} />
                          </Link>
                          <button 
                            className="btn-icon delete-btn" 
                            onClick={() => handleDelete(slip.id, slip.borrow_number)}
                            title="ลบใบยืมสินค้า"
                          >
                            <Trash2 size={16} />
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
    </div>
  );
}
