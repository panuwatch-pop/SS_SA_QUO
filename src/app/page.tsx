'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  LogOut, Users, Package, FileText, Settings, DollarSign, BookOpen, 
  Truck, ShoppingCart, Layers, Receipt, AlertTriangle, Clock, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { company, setCompany } = useCompany();
  
  const [stats, setStats] = useState({ 
    customers: 0, 
    products: 0,
    suppliers: 0,
    purchaseOrders: 0,
    pendingReceipts: 0,
    unpaidBillsAmount: 0,
    overdueBillsCount: 0,
    lowStockCount: 0
  });
  const [quotationsList, setQuotationsList] = useState<any[]>([]);
  const [purchaseOrdersList, setPurchaseOrdersList] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user && company) {
      fetchStats();
    }
  }, [user, company]);

  const fetchStats = async () => {
    setLoadingStats(true);
    
    // Fetch counts, quotations and POs in parallel
    const [custRes, prodRes, quotRes, supRes, poRes, poPendingRes, billsRes, invRes, recentPOsRes] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).or(`company.eq.${company},company.eq.Shared`),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('company', company),
      supabase.from('quotations').select('id, quotation_number, customer_id, created_at, total_amount, status, customers(name)').eq('company_name', company).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }).or(`company.eq.${company},company.eq.Shared`),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('company_name', company),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('company_name', company).in('status', ['ordered', 'partially_received']),
      supabase.from('supplier_bills').select('net_amount, due_date, status').eq('company_name', company).neq('status', 'paid'),
      supabase.from('inventory').select('quantity_on_hand, reorder_level').or(`company.eq.${company},company.eq.Shared`),
      supabase.from('purchase_orders').select('id, po_number, supplier_id, issue_date, created_at, total_amount, status, suppliers(name)').eq('company_name', company).order('created_at', { ascending: false }).limit(6),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unpaidBills = billsRes.data || [];
    const totalUnpaid = unpaidBills.reduce((sum, b) => sum + Number(b.net_amount || 0), 0);
    const overdueCount = unpaidBills.filter(b => {
      const d = new Date(b.due_date);
      d.setHours(0, 0, 0, 0);
      return d < today;
    }).length;

    const lowStock = (invRes.data || []).filter(
      i => Number(i.quantity_on_hand) <= Number(i.reorder_level || 5)
    ).length;

    setStats({
      customers: custRes.count || 0,
      products: prodRes.count || 0,
      suppliers: supRes.count || 0,
      purchaseOrders: poRes.count || 0,
      pendingReceipts: poPendingRes.count || 0,
      unpaidBillsAmount: totalUnpaid,
      overdueBillsCount: overdueCount,
      lowStockCount: lowStock
    });
    setQuotationsList(quotRes.data || []);
    setPurchaseOrdersList(recentPOsRes.data || []);
    
    setLoadingStats(false);
  };

  const filteredQuotations = selectedMonth === 'all' 
    ? quotationsList 
    : quotationsList.filter(q => {
        const d = new Date(q.created_at);
        return d.getMonth().toString() === selectedMonth;
      });

  const totalQuotations = filteredQuotations.length;
  const totalAmount = filteredQuotations
    .filter(q => q.status !== 'rejected')
    .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

  const getQuotationBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="mini-badge badge-draft">ฉบับร่าง</span>;
      case 'sent': return <span className="mini-badge badge-sent">ส่งแล้ว</span>;
      case 'approved': return <span className="mini-badge badge-success">อนุมัติแล้ว</span>;
      case 'rejected': return <span className="mini-badge badge-error">ยกเลิก</span>;
      default: return <span className="mini-badge">{status}</span>;
    }
  };

  const getPOBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="mini-badge badge-draft">ฉบับร่าง</span>;
      case 'ordered': return <span className="mini-badge badge-ordered">สั่งซื้อแล้ว</span>;
      case 'partially_received': return <span className="mini-badge badge-partial">รับของบางส่วน</span>;
      case 'received': return <span className="mini-badge badge-success">รับครบแล้ว</span>;
      case 'cancelled': return <span className="mini-badge badge-error">ยกเลิก</span>;
      default: return <span className="mini-badge">{status}</span>;
    }
  };

  if (authLoading) {
    return <div className="loading-screen">กำลังโหลด...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="brand-logo">
            {company === 'SST' ? (
              <img src="/sst-logo.jpg" alt="SST" style={{width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px'}} />
            ) : (
              <img src="/shinwa-logo.jpg" alt="Shinwa Anzen" style={{width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px'}} />
            )}
          </div>
          <div className="brand-info">
            <h2>{company}</h2>
            <span className="brand-badge">Quotation & ERP</span>
          </div>
        </div>
        
        <nav className="nav-links">
          <div className="nav-group">
            <span className="nav-group-title">ทั่วไป</span>
            <Link href="/" className="nav-link active">
              <Settings size={18} className="nav-icon" /> <span>แดชบอร์ด</span>
            </Link>
          </div>

          <div className="nav-group">
            <span className="nav-group-title">งานขาย & ลูกค้า</span>
            <Link href="/customers" className="nav-link">
              <Users size={18} className="nav-icon" /> <span>ลูกค้า</span>
            </Link>
            <Link href="/products" className="nav-link">
              <Package size={18} className="nav-icon" /> <span>สินค้า & ราคา</span>
            </Link>
            <Link href="/quotations" className="nav-link">
              <FileText size={18} className="nav-icon" /> <span>ใบเสนอราคา</span>
            </Link>
            <Link href="/catalogs" className="nav-link">
              <BookOpen size={18} className="nav-icon" /> <span>แคตตาล็อก</span>
            </Link>
          </div>

          <div className="nav-group">
            <span className="nav-group-title">งานจัดซื้อ & สต็อก</span>
            <Link href="/suppliers" className="nav-link">
              <Truck size={18} className="nav-icon" /> <span>ซัพพลายเออร์</span>
            </Link>
            <Link href="/purchase-orders" className="nav-link">
              <ShoppingCart size={18} className="nav-icon" /> <span>ใบสั่งซื้อสินค้า (PO)</span>
            </Link>
            <Link href="/inventory" className="nav-link">
              <Layers size={18} className="nav-icon" /> <span>คลังสินค้า & สต็อก</span>
            </Link>
            <Link href="/supplier-bills" className="nav-link">
              <Receipt size={18} className="nav-icon" /> <span>บิลเจ้าหนี้ & จ่ายเงิน</span>
            </Link>
          </div>

          <div className="nav-group">
            <span className="nav-group-title">การตั้งค่า</span>
            <Link href="/settings" className="nav-link">
              <Settings size={18} className="nav-icon" /> <span>ตั้งค่าบริษัท</span>
            </Link>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="company-toggle">
            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>สลับบริษัทใช้งาน</label>
            <select 
              className="input-field select-company" 
              value={company}
              onChange={(e) => setCompany(e.target.value as any)}
            >
              <option value="SST">🏢 SST (Thailand)</option>
              <option value="Shinwa Anzen">🏢 Shinwa Anzen</option>
            </select>
          </div>
          
          <button className="btn logout-btn" onClick={signOut}>
            <LogOut size={16} /> <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content animate-fade-in">
        <header className="topbar">
          <div>
            <h1>ยินดีต้อนรับ, {user.email}</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '0.25rem' }}>
              กำลังใช้งานในนามบริษัท: <strong>{company}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label className="label" style={{ marginBottom: 0 }}>เลือกเดือน:</label>
            <select 
              className="input-field" 
              style={{ width: '150px' }}
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">ทั้งหมด (ทั้งปี)</option>
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
        </header>

        {/* Section 1: Sales & Quotations Overview */}
        <h2 className="dashboard-section-title">
          📊 ภาพรวมงานขายและใบเสนอราคา (Sales Overview)
        </h2>
        <div className="dashboard-grid">
          <Link href="/customers" className="stat-card glass-panel click-card">
            <div className="icon-wrapper"><Users size={28} /></div>
            <div className="stat-info">
              <h3>ลูกค้าทั้งหมด</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.customers}</p>
            </div>
          </Link>
          <Link href="/products" className="stat-card glass-panel click-card">
            <div className="icon-wrapper"><Package size={28} /></div>
            <div className="stat-info">
              <h3>สินค้าทั้งหมด</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.products}</p>
            </div>
          </Link>
          <Link href="/quotations" className="stat-card glass-panel click-card">
            <div className="icon-wrapper"><FileText size={28} /></div>
            <div className="stat-info">
              <h3>ใบเสนอราคา ({selectedMonth === 'all' ? 'ทั้งปี' : 'เดือนนี้'})</h3>
              <p className="stat-number">{loadingStats ? '-' : totalQuotations}</p>
            </div>
          </Link>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><DollarSign size={28} /></div>
            <div className="stat-info">
              <h3>ยอดเสนอราคารวม</h3>
              <p className="stat-number text-primary">{loadingStats ? '-' : `฿${totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}`}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Purchasing, Inventory & AP Overview */}
        <h2 className="dashboard-section-title" style={{ marginTop: '2.5rem' }}>
          🏢 ภาพรวมจัดซื้อ คลังสินค้า และเจ้าหนี้ (Purchasing & AP Overview)
        </h2>
        <div className="dashboard-grid">
          <Link href="/suppliers" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
              <Truck size={28} />
            </div>
            <div className="stat-info">
              <h3>ซัพพลายเออร์</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.suppliers} <span className="stat-unit">ราย</span></p>
            </div>
          </Link>

          <Link href="/purchase-orders" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <ShoppingCart size={28} />
            </div>
            <div className="stat-info">
              <h3>รอรับสินค้าเข้าคลัง</h3>
              <p className="stat-number" style={{ color: stats.pendingReceipts > 0 ? '#f59e0b' : 'inherit' }}>
                {loadingStats ? '-' : stats.pendingReceipts} <span className="stat-unit">ใบสั่งซื้อ</span>
              </p>
            </div>
          </Link>

          <Link href="/inventory" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <Layers size={28} />
            </div>
            <div className="stat-info">
              <h3>สินค้าสต็อกต่ำ</h3>
              <p className="stat-number" style={{ color: stats.lowStockCount > 0 ? '#ef4444' : 'inherit' }}>
                {loadingStats ? '-' : stats.lowStockCount} <span className="stat-unit">รายการ</span>
              </p>
            </div>
          </Link>

          <Link href="/supplier-bills" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              <Receipt size={28} />
            </div>
            <div className="stat-info">
              <h3>ยอดค้างจ่าย Supplier</h3>
              <p className="stat-number" style={{ fontSize: '1.3rem', color: '#dc2626' }}>
                {loadingStats ? '-' : `฿${stats.unpaidBillsAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}`}
              </p>
            </div>
          </Link>
        </div>

        {/* Section 3: Recent Activity Tables (Recent Quotations & Recent POs) */}
        <div className="tables-dual-grid" style={{ marginTop: '2.5rem' }}>
          {/* Recent Quotations Table */}
          <div className="glass-panel table-panel">
            <div className="panel-header">
              <h3>📄 ใบเสนอราคาล่าสุด</h3>
              <Link href="/quotations" className="view-all-link">ดูทั้งหมด &rarr;</Link>
            </div>
            <div className="table-responsive">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>เลขที่</th>
                    <th>ลูกค้า</th>
                    <th style={{ textAlign: 'right' }}>ยอดเงิน</th>
                    <th style={{ textAlign: 'center' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.slice(0, 5).map(q => (
                    <tr key={q.id}>
                      <td>
                        <Link href={`/quotations/${q.id}`} className="table-link">
                          {q.quotation_number}
                        </Link>
                      </td>
                      <td>{q.customers?.name || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ฿{Number(q.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getQuotationBadge(q.status)}
                      </td>
                    </tr>
                  ))}
                  {filteredQuotations.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                        ไม่มีรายการใบเสนอราคา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Purchase Orders Table */}
          <div className="glass-panel table-panel">
            <div className="panel-header">
              <h3>📝 ใบสั่งซื้อสินค้าล่าสุด (PO)</h3>
              <Link href="/purchase-orders" className="view-all-link">ดูทั้งหมด &rarr;</Link>
            </div>
            <div className="table-responsive">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>เลขที่ PO</th>
                    <th>ซัพพลายเออร์</th>
                    <th style={{ textAlign: 'right' }}>ยอดเงิน</th>
                    <th style={{ textAlign: 'center' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrdersList.map(po => (
                    <tr key={po.id}>
                      <td>
                        <Link href={`/purchase-orders/${po.id}`} className="table-link">
                          {po.po_number}
                        </Link>
                      </td>
                      <td>{po.suppliers?.name || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ฿{Number(po.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getPOBadge(po.status)}
                      </td>
                    </tr>
                  ))}
                  {purchaseOrdersList.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                        ไม่มีรายการใบสั่งซื้อ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .loading-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-size: 1.2rem;
          color: var(--primary-color);
        }
        .dashboard-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: #f8fafc;
        }
        
        /* Sidebar Styling */
        .sidebar {
          width: 270px;
          min-width: 270px;
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          border-radius: 0;
          border-left: none;
          border-top: none;
          border-bottom: none;
          border-right: 1px solid #e2e8f0;
          z-index: 10;
          background: #ffffff;
          box-shadow: 2px 0 12px rgba(0,0,0,0.02);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.25rem 0.5rem 1.25rem 0.5rem;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 1.25rem;
        }
        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .brand-info h2 {
          font-size: 1.2rem;
          font-weight: 800;
          margin: 0;
          line-height: 1.2;
          color: #0f172a;
        }
        .brand-badge {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Nav Links */
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex-grow: 1;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
        }
        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          margin-bottom: 1rem;
        }
        .nav-group-title {
          font-size: 0.82rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          padding: 0.4rem 0.75rem 0.25rem 0.75rem;
          display: flex;
          align-items: center;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          color: #334155;
          font-size: 0.94rem;
          font-weight: 600;
          transition: all 0.15s ease-in-out;
          text-decoration: none;
        }
        .nav-link:hover {
          background: #f1f5f9;
          color: var(--primary-color);
          transform: translateX(2px);
        }
        .nav-link.active {
          background: var(--primary-color);
          color: #ffffff !important;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(0, 51, 160, 0.2);
        }
        [data-company="Shinwa Anzen"] .nav-link.active {
          background: #002266;
          color: #ffffff !important;
          box-shadow: 0 3px 10px rgba(0, 34, 102, 0.25);
        }

        /* Sidebar Footer */
        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }
        .select-company {
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
        }
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.55rem;
          font-size: 0.88rem;
          font-weight: 600;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .logout-btn:hover {
          background: #fee2e2;
        }
        
        /* Main Content */
        .main-content {
          flex: 1;
          padding: 2.25rem 2.75rem;
          overflow-y: auto;
          background: #f8fafc;
        }
        .topbar {
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .topbar h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
        }
        .dashboard-section-title {
          font-size: 1.15rem;
          margin-bottom: 1rem;
          color: #1e293b;
          font-weight: 800;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
        }
        .click-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
          color: inherit;
        }
        .click-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.06);
        }
        .stat-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-info h3 {
          font-size: 0.88rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
        .stat-number {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
        }
        .stat-unit {
          font-size: 0.88rem;
          font-weight: normal;
          color: #64748b;
        }
        .text-primary { color: #2563eb; }

        /* Tables Dual Grid */
        .tables-dual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .table-panel {
          padding: 1.5rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.85rem;
        }
        .panel-header h3 {
          font-size: 1.05rem;
          margin: 0;
          font-weight: 800;
          color: #0f172a;
        }
        .view-all-link {
          font-size: 0.88rem;
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
        }
        .view-all-link:hover {
          text-decoration: underline;
        }
        
        .table-responsive {
          overflow-x: auto;
          width: 100%;
        }
        .mini-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }
        .mini-table th, .mini-table td {
          padding: 0.85rem 0.6rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .mini-table th {
          font-weight: 700;
          color: #64748b;
          font-size: 0.82rem;
          text-transform: uppercase;
        }
        .table-link {
          font-weight: 700;
          color: #2563eb;
          text-decoration: none;
        }
        .table-link:hover {
          text-decoration: underline;
        }

        .mini-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .badge-draft { background: #f1f5f9; color: #475569; }
        .badge-sent { background: #eff6ff; color: #2563eb; }
        .badge-ordered { background: #eff6ff; color: #2563eb; }
        .badge-partial { background: #fffbeb; color: #d97706; }
        .badge-success { background: #ecfdf5; color: #059669; }
        .badge-error { background: #fef2f2; color: #dc2626; }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .tables-dual-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .dashboard-layout {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            min-width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem;
          }
          .nav-links {
            flex-direction: row;
            flex-wrap: wrap;
            max-height: 200px;
          }
          .main-content {
            padding: 1.25rem 1rem;
          }
          .stat-card {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
