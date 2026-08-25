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
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user && company) {
      fetchStats();
    }
  }, [user, company]);

  const fetchStats = async () => {
    setLoadingStats(true);
    
    // Fetch counts and metrics in parallel
    const [custRes, prodRes, quotRes, supRes, poRes, poPendingRes, billsRes, invRes] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).or(`company.eq.${company},company.eq.Shared`),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('company', company),
      supabase.from('quotations').select('created_at, total_amount, status').eq('company_name', company),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }).or(`company.eq.${company},company.eq.Shared`),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('company_name', company),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('company_name', company).in('status', ['ordered', 'partially_received']),
      supabase.from('supplier_bills').select('net_amount, due_date, status').eq('company_name', company).neq('status', 'paid'),
      supabase.from('inventory').select('quantity_on_hand, reorder_level').or(`company.eq.${company},company.eq.Shared`),
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
          <h2>{company}</h2>
        </div>
        
        <nav className="nav-links">
          <div className="nav-section-label">ระบบขาย & ลูกค้า</div>
          <Link href="/" className="nav-link active">
            <Settings size={18} /> แดชบอร์ด
          </Link>
          <Link href="/customers" className="nav-link">
            <Users size={18} /> ลูกค้า
          </Link>
          <Link href="/products" className="nav-link">
            <Package size={18} /> สินค้า
          </Link>
          <Link href="/quotations" className="nav-link">
            <FileText size={18} /> ใบเสนอราคา
          </Link>
          <Link href="/catalogs" className="nav-link">
            <BookOpen size={18} /> แคตตาล็อก
          </Link>

          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>ระบบจัดซื้อ & สต็อก</div>
          <Link href="/suppliers" className="nav-link">
            <Truck size={18} /> ซัพพลายเออร์ (Suppliers)
          </Link>
          <Link href="/purchase-orders" className="nav-link">
            <ShoppingCart size={18} /> ใบสั่งซื้อ (PO)
          </Link>
          <Link href="/inventory" className="nav-link">
            <Layers size={18} /> คลังสินค้า & สต็อก
          </Link>
          <Link href="/supplier-bills" className="nav-link">
            <Receipt size={18} /> บิลเจ้าหนี้ & กำหนดจ่าย (AP)
          </Link>

          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>ตั้งค่าระบบ</div>
          <Link href="/settings" className="nav-link">
            <Settings size={18} /> ตั้งค่าบริษัท
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="company-toggle">
            <label className="label" style={{ fontSize: '0.8rem' }}>เลือกบริษัท</label>
            <select 
              className="input-field" 
              value={company}
              onChange={(e) => setCompany(e.target.value as any)}
            >
              <option value="SST">SST</option>
              <option value="Shinwa Anzen">Shinwa Anzen</option>
            </select>
          </div>
          
          <button className="btn nav-link logout-btn" onClick={signOut}>
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content animate-fade-in" style={{ overflowY: 'auto' }}>
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
              <option value="all">ทั้งหมด</option>
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
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
          📊 ภาพรวมงานขายและใบเสนอราคา (Sales Overview)
        </h2>
        <div className="dashboard-grid">
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><Users size={28} /></div>
            <div className="stat-info">
              <h3>ลูกค้าทั้งหมด</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.customers}</p>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><Package size={28} /></div>
            <div className="stat-info">
              <h3>สินค้าทั้งหมด</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.products}</p>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><FileText size={28} /></div>
            <div className="stat-info">
              <h3>ใบเสนอราคา</h3>
              <p className="stat-number">{loadingStats ? '-' : totalQuotations}</p>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><DollarSign size={28} /></div>
            <div className="stat-info">
              <h3>ยอดเสนอราคารวม</h3>
              <p className="stat-number">{loadingStats ? '-' : `฿${totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}`}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Purchasing, Inventory & AP Overview */}
        <h2 style={{ fontSize: '1.2rem', margin: '2rem 0 1rem 0', color: 'var(--primary-color)' }}>
          🏢 ภาพรวมจัดซื้อ คลังสินค้า และเจ้าหนี้ (Purchasing & AP Overview)
        </h2>
        <div className="dashboard-grid">
          <Link href="/suppliers" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
              <Truck size={28} />
            </div>
            <div className="stat-info">
              <h3>ซัพพลายเออร์</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.suppliers} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-light)' }}>ราย</span></p>
            </div>
          </Link>

          <Link href="/purchase-orders" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <ShoppingCart size={28} />
            </div>
            <div className="stat-info">
              <h3>รอรับสินค้าเข้าคลัง</h3>
              <p className="stat-number" style={{ color: stats.pendingReceipts > 0 ? '#f59e0b' : 'inherit' }}>
                {loadingStats ? '-' : stats.pendingReceipts} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-light)' }}>ใบสั่งซื้อ</span>
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
                {loadingStats ? '-' : stats.lowStockCount} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-light)' }}>รายการ</span>
              </p>
            </div>
          </Link>

          <Link href="/supplier-bills" className="stat-card glass-panel click-card">
            <div className="icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              <Receipt size={28} />
            </div>
            <div className="stat-info">
              <h3>ยอดค้างจ่าย Supplier</h3>
              <p className="stat-number" style={{ fontSize: '1.25rem', color: '#dc2626' }}>
                {loadingStats ? '-' : `฿${stats.unpaidBillsAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}`}
              </p>
            </div>
          </Link>
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
        }
        .sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          border-radius: 0;
          border-left: none;
          border-top: none;
          border-bottom: none;
          border-right: 1px solid var(--glass-border);
          z-index: 10;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        [data-company="Shinwa Anzen"] .brand {
          border-bottom-color: rgba(255,255,255,0.1);
        }
        .brand-logo {
          width: 40px;
          height: 40px;
          background: var(--primary-color);
          color: #fff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        [data-company="Shinwa Anzen"] .brand-logo {
          background: transparent;
        }
        .nav-section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-light);
          padding: 0 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .click-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
          color: inherit;
        }
        .click-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text-color);
          transition: all 0.2s;
        }
        .nav-link:hover {
          background: rgba(0,0,0,0.05);
        }
        [data-company="Shinwa Anzen"] .nav-link:hover {
          background: rgba(255,255,255,0.1);
        }
        .nav-link.active {
          background: var(--primary-color);
          color: #fff;
        }
        [data-company="Shinwa Anzen"] .nav-link.active {
          background: var(--secondary-color);
          color: var(--primary-color);
        }
        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        [data-company="Shinwa Anzen"] .sidebar-footer {
          border-top-color: rgba(255,255,255,0.1);
        }
        .logout-btn {
          width: 100%;
          justify-content: flex-start;
          color: var(--error-color);
          background: transparent;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .main-content {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }
        .topbar {
          margin-bottom: 2rem;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          background: rgba(0, 51, 160, 0.1);
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        [data-company="Shinwa Anzen"] .icon-wrapper {
          background: rgba(212, 175, 55, 0.1);
          color: var(--secondary-color);
        }
        .stat-info h3 {
          font-size: 1rem;
          color: var(--text-light);
          margin-bottom: 0.25rem;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: var(--text-color);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .dashboard-layout {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--glass-border);
            padding: 1rem;
          }
          .nav-links {
            flex-direction: row;
            flex-wrap: wrap;
          }
          .main-content {
            padding: 1rem;
          }
          .stat-card {
            flex-direction: column;
            text-align: center;
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
