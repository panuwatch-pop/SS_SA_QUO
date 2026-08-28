'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  Plus, Search, ArrowLeft, FileText, Eye, Edit2, Trash2, CheckCircle2, 
  Clock, Truck, AlertCircle, Filter, Copy, PackageCheck, Send 
} from 'lucide-react';
import Link from 'next/link';

interface DeliveryOrder {
  id: string;
  do_number: string;
  quotation_id?: string;
  customer_id: string;
  company_name: string;
  status: string;
  issue_date: string;
  expected_delivery_date?: string;
  customer_po_no?: string;
  project_name?: string;
  transport_by?: string;
  driver_name?: string;
  hide_price: boolean;
  total_amount: number;
  created_at: string;
  customers: {
    name: string;
    customer_code: string;
    phone: string;
  };
}

export default function DeliveryOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();

  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    if (user && company) {
      fetchDeliveryOrders();
    }
  }, [user, company]);

  const fetchDeliveryOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          customers (
            name,
            customer_code,
            phone
          )
        `)
        .eq('company_name', company)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet, show friendly empty state
        if (error.code === '42P01') {
          setDeliveryOrders([]);
        } else {
          console.error('Error fetching delivery orders:', error);
          alert('เกิดข้อผิดพลาดในการโหลดใบส่งของชั่วคราว: ' + error.message);
        }
      } else {
        setDeliveryOrders(data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, doNumber: string) => {
    if (confirm(`คุณต้องการลบใบส่งของชั่วคราว "${doNumber}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase
          .from('delivery_orders')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('ลบใบส่งของชั่วคราวเรียบร้อยแล้ว');
        fetchDeliveryOrders();
      } catch (error: any) {
        console.error('Error deleting delivery order:', error);
        alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="status-badge status-draft"><Clock size={12} /> ฉบับร่าง</span>;
      case 'delivering':
        return <span className="status-badge status-ordered"><Truck size={12} /> กำลังจัดส่ง</span>;
      case 'delivered':
        return <span className="status-badge status-received"><CheckCircle2 size={12} /> ส่งมอบสำเร็จ</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">ยกเลิก</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const filteredOrders = deliveryOrders.filter(order => {
    const matchesSearch = 
      (order.do_number && order.do_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customers?.name && order.customers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customer_po_no && order.customer_po_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.project_name && order.project_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    const orderDate = new Date(order.issue_date || order.created_at);
    const matchesMonth = selectedMonth === 'all' || orderDate.getMonth().toString() === selectedMonth;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  // Summary Metrics
  const totalCount = deliveryOrders.length;
  const deliveringCount = deliveryOrders.filter(d => d.status === 'delivering').length;
  const deliveredCount = deliveryOrders.filter(d => d.status === 'delivered').length;
  const totalAmount = deliveryOrders
    .filter(d => d.status !== 'cancelled')
    .reduce((sum, d) => sum + Number(d.total_amount || 0), 0);

  if (authLoading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ใบส่งของชั่วคราว (Delivery Orders - DO)</h1>
            <p className="subtitle">จัดการและติดตามการส่งมอบสินค้า ({company})</p>
          </div>
        </div>
        
        <Link href="/delivery-orders/new" className="btn btn-primary">
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> + ออกใบส่งของชั่วคราว
        </Link>
      </header>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">ใบส่งของทั้งหมด</span>
          <span className="stat-value">{totalCount} <span className="stat-unit">ฉบับ</span></span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">อยู่ระหว่างจัดส่ง (Delivering)</span>
          <span className="stat-value text-primary">{deliveringCount} <span className="stat-unit">รายการ</span></span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">ส่งมอบสำเร็จ (Delivered)</span>
          <span className="stat-value text-success">{deliveredCount} <span className="stat-unit">รายการ</span></span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">มูลค่าสินค้ารวมที่ส่ง</span>
          <span className="stat-value text-success">{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="stat-unit">บาท</span></span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel filter-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่ DO, ชื่อลูกค้า, เลขที่ PO ลูกค้า, โครงการ..."
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
              <option value="delivering">กำลังจัดส่ง (Delivering)</option>
              <option value="delivered">ส่งมอบสำเร็จ (Delivered)</option>
              <option value="cancelled">ยกเลิก (Cancelled)</option>
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

      {/* DO Table */}
      <div className="glass-panel table-container">
        {loading ? (
          <div className="loading-text">กำลังโหลดรายการใบส่งของชั่วคราว...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <Truck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>ไม่พบรายการใบส่งของชั่วคราว</p>
            <Link href="/delivery-orders/new" className="btn btn-outline" style={{ marginTop: '1rem' }}>
              + ออกใบส่งของชั่วคราวฉบับแรก
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>เลขที่ DO</th>
                  <th style={{ width: '12%' }}>วันที่ส่งของ</th>
                  <th style={{ width: '23%' }}>ลูกค้า (Customer)</th>
                  <th style={{ width: '15%' }}>PO ลูกค้า / โครงการ</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>มูลค่ารวม</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/delivery-orders/${order.id}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {order.do_number}
                      </Link>
                      {order.hide_price && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>(ซ่อนราคา)</div>
                      )}
                    </td>
                    <td>
                      {order.issue_date ? new Date(order.issue_date).toLocaleDateString('th-TH') : new Date(order.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{order.customers?.name || 'ไม่ระบุ'}</div>
                      {order.customers?.customer_code && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{order.customers.customer_code}</div>}
                    </td>
                    <td>
                      {order.customer_po_no && <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>PO: {order.customer_po_no}</div>}
                      {order.project_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{order.project_name}</div>}
                      {!order.customer_po_no && !order.project_name && <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {order.hide_price ? (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>
                      ) : (
                        `${Number(order.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.`
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(order.status)}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center', gap: '0.25rem' }}>
                        <Link href={`/delivery-orders/${order.id}`} className="btn-icon" title="ดูรายละเอียด / พิมพ์ PDF / ส่งของ">
                          <Eye size={18} />
                        </Link>
                        <Link href={`/delivery-orders/new?cloneId=${order.id}`} className="btn-icon" title="คัดลอก (Duplicate)">
                          <Copy size={18} />
                        </Link>
                        <Link href={`/delivery-orders/${order.id}/edit`} className="btn-icon" title="แก้ไข">
                          <Edit2 size={18} />
                        </Link>
                        <button className="btn-icon text-error" title="ลบ" onClick={() => handleDelete(order.id, order.do_number)}>
                          <Trash2 size={18} />
                        </button>
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
        .page-container {
          padding: 3rem 2rem 2rem 2rem;
          max-width: 1300px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
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

        .action-buttons {
          display: flex;
          align-items: center;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-draft {
          background: rgba(100, 116, 139, 0.1);
          color: #64748b;
        }

        .status-ordered {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
        }

        .status-received {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .status-cancelled {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          color: var(--text-light);
        }

        .loading-text {
          padding: 3rem;
          text-align: center;
          color: var(--text-light);
        }
      `}</style>
    </div>
  );
}
