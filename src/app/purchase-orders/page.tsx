'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Search, ArrowLeft, FileText, Eye, Edit2, Trash2, CheckCircle2, Clock, Truck, AlertCircle, Filter } from 'lucide-react';
import Link from 'next/link';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  company_name: string;
  status: string;
  issue_date: string;
  expected_delivery_date: string;
  total_amount: number;
  notes: string;
  created_at: string;
  suppliers: {
    name: string;
    code: string;
    phone: string;
  };
}

export default function PurchaseOrdersPage() {
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    if (user) {
      fetchPurchaseOrders();
    }
  }, [user, company]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name, code, phone)')
      .eq('company_name', company)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchase orders:', error);
    } else {
      setPurchaseOrders(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, poNumber: string) => {
    if (confirm(`คุณต้องการลบใบสั่งซื้อ "${poNumber}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase
          .from('purchase_orders')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('ลบใบสั่งซื้อเรียบร้อยแล้ว');
        fetchPurchaseOrders();
      } catch (error: any) {
        console.error('Error deleting purchase order:', error);
        alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="status-badge status-draft"><Clock size={12} /> ฉบับร่าง</span>;
      case 'ordered':
        return <span className="status-badge status-ordered"><Truck size={12} /> สั่งซื้อแล้ว</span>;
      case 'partially_received':
        return <span className="status-badge status-partial"><AlertCircle size={12} /> รับของบางส่วน</span>;
      case 'received':
        return <span className="status-badge status-received"><CheckCircle2 size={12} /> รับของครบแล้ว</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">ยกเลิก</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    // Search filter
    const matchesSearch = 
      (po.po_number && po.po_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (po.suppliers?.name && po.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (po.suppliers?.code && po.suppliers.code.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;

    // Month filter
    const poDate = new Date(po.issue_date || po.created_at);
    const matchesMonth = selectedMonth === 'all' || poDate.getMonth().toString() === selectedMonth;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  // Calculate summary figures
  const totalAmount = filteredPOs
    .filter(po => po.status !== 'cancelled')
    .reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);

  const pendingReceiptCount = filteredPOs.filter(po => po.status === 'ordered' || po.status === 'partially_received').length;

  if (authLoading) return <div className="loading-screen">กำลังโหลด...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ใบสั่งซื้อสินค้า (Purchase Orders)</h1>
            <p className="subtitle">รายการสั่งซื้อสินค้าไปยัง Supplier ของ {company}</p>
          </div>
        </div>
        <Link href="/purchase-orders/new" className="btn btn-primary">
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> สร้างใบสั่งซื้อใหม่
        </Link>
      </header>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">ใบสั่งซื้อทั้งหมด ({selectedMonth === 'all' ? 'ทั้งปี' : 'เดือนที่เลือก'})</span>
          <span className="stat-value">{filteredPOs.length} <span className="stat-unit">ฉบับ</span></span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">ยอดสั่งซื้อรวม (ไม่รวมยกเลิก)</span>
          <span className="stat-value text-primary">
            ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">รอรับสินค้าเข้าคลัง</span>
          <span className="stat-value text-warning">{pendingReceiptCount} <span className="stat-unit">รายการ</span></span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel filter-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่ PO, ชื่อผู้ขาย, รหัสผู้ขาย..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field search-input"
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
              <option value="draft">ฉบับร่าง (Draft)</option>
              <option value="ordered">สั่งซื้อแล้ว (Ordered)</option>
              <option value="partially_received">รับของบางส่วน</option>
              <option value="received">รับของครบแล้ว</option>
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

      {/* PO Table */}
      <div className="glass-panel table-container">
        {loading ? (
          <div className="loading-text">กำลังโหลดรายการใบสั่งซื้อ...</div>
        ) : filteredPOs.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>ไม่พบรายการใบสั่งซื้อ</p>
            <Link href="/purchase-orders/new" className="btn btn-outline" style={{ marginTop: '1rem' }}>
              + ออกใบสั่งซื้อฉบับแรก
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>เลขที่ PO</th>
                  <th style={{ width: '12%' }}>วันที่สั่งซื้อ</th>
                  <th style={{ width: '25%' }}>ซัพพลายเออร์ (Supplier)</th>
                  <th style={{ width: '15%' }}>กำหนดส่งของ</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>ยอดเงินรวม (บาท)</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map((po) => (
                  <tr key={po.id}>
                    <td>
                      <Link href={`/purchase-orders/${po.id}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {po.po_number}
                      </Link>
                    </td>
                    <td>
                      {po.issue_date ? new Date(po.issue_date).toLocaleDateString('th-TH') : new Date(po.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{po.suppliers?.name || 'ไม่ระบุ'}</div>
                      {po.suppliers?.code && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{po.suppliers.code}</div>}
                    </td>
                    <td>
                      {po.expected_delivery_date ? (
                        <span style={{ fontSize: '0.9rem' }}>
                          {new Date(po.expected_delivery_date).toLocaleDateString('th-TH')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>ตามตกลง</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {Number(po.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(po.status)}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <Link href={`/purchase-orders/${po.id}`} className="btn-icon" title="ดูรายละเอียด / พิมพ์ / รับของ">
                          <Eye size={18} />
                        </Link>
                        {po.status === 'draft' && (
                          <>
                            <Link href={`/purchase-orders/${po.id}/edit`} className="btn-icon" title="แก้ไข">
                              <Edit2 size={18} />
                            </Link>
                            <button className="btn-icon text-error" title="ลบ" onClick={() => handleDelete(po.id, po.po_number)}>
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; }
        .stat-label { font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem; }
        .stat-value { font-size: 1.5rem; font-weight: bold; }
        .stat-unit { font-size: 0.9rem; font-weight: normal; color: var(--text-light); }
        .text-primary { color: var(--primary-color); }
        .text-warning { color: #f59e0b; }
        
        .filter-panel { padding: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .search-box { position: relative; flex: 1; min-width: 250px; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-light); }
        .search-input { padding-left: 2.75rem; }
        .filter-controls { display: flex; gap: 1rem; align-items: center; }
        .filter-item { display: flex; align-items: center; gap: 0.5rem; }
        .select-small { padding: 0.5rem 0.75rem; font-size: 0.9rem; width: auto; }
        
        .table-container { padding: 1rem; overflow: hidden; }
        .table-responsive { overflow-x: auto; width: 100%; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .data-table th { font-weight: 600; color: var(--text-light); font-size: 0.85rem; text-transform: uppercase; }
        .data-table tbody tr:hover { background: rgba(0,0,0,0.02); }
        
        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; }
        .status-draft { background: rgba(100, 116, 139, 0.1); color: #475569; }
        .status-ordered { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
        .status-partial { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .status-received { background: rgba(16, 185, 129, 0.1); color: #059669; }
        .status-cancelled { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
        
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        .text-error { color: var(--error-color) !important; }
        .action-buttons { display: flex; gap: 0.25rem; }
        
        .loading-text, .empty-state { text-align: center; padding: 3rem; color: var(--text-light); }

        @media (max-width: 768px) {
          .page-container { padding: 1rem; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .filter-panel { flex-direction: column; align-items: stretch; }
          .filter-controls { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
