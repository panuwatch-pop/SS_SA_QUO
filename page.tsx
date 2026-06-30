'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { LogOut, Users, Package, FileText, Settings, DollarSign, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { company, setCompany } = useCompany();
  
  const [stats, setStats] = useState({ customers: 0, products: 0 });
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
    
    // Fetch counts and quotation data in parallel
    const [custRes, prodRes, quotRes] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).or(`company.eq.${company},company.eq.Shared`),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('company', company),
      supabase.from('quotations').select('created_at, total_amount, status').eq('company_name', company),
    ]);

    setStats({
      customers: custRes.count || 0,
      products: prodRes.count || 0
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
  // Exclude rejected/draft if needed, but let's sum all or maybe only approved/sent?
  // User didn't specify, we'll sum all that aren't rejected.
  const totalAmount = filteredQuotations
    .filter(q => q.status !== 'rejected')
    .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

  useEffect(() => {
    async function doImportShinwa() {
      if (localStorage.getItem('shinwa_customers_imported')) return;
      try {
        const res = await fetch('/shinwa_customers_import.json');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length > 0) {
          const { error } = await supabase.from('customers').insert(data);
          if (error) {
            console.error('Import failed:', error);
          } else {
            console.log('Import successful!');
            localStorage.setItem('shinwa_customers_imported', 'true');
            alert(`นำเข้าลูกค้า Shinwa อัตโนมัติเรียบร้อยแล้ว (${data.length} รายการ)`);
          }
        }
      } catch (err) {
        console.error('Error fetching import data', err);
      }
    }
    
    async function doImportShinwaProducts() {
      if (localStorage.getItem('shinwa_products_imported')) return;
      try {
        const res = await fetch('/shinwa_products_import.json');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.length > 0) {
          // Check if already inserted
          const { data: existing } = await supabase.from('products').select('id').eq('company', 'Shinwa Anzen').limit(1);
          if (existing && existing.length > 0) {
            localStorage.setItem('shinwa_products_imported', 'true');
            return;
          }
          
          const { error } = await supabase.from('products').insert(data);
          if (error) {
            console.error('Product Import failed:', error);
          } else {
            console.log('Product Import successful!');
            localStorage.setItem('shinwa_products_imported', 'true');
            alert(`นำเข้าสินค้า Shinwa อัตโนมัติเรียบร้อยแล้ว (${data.length} รายการ)`);
          }
        }
      } catch (err) {
        console.error('Error fetching product import data', err);
      }
    }
    
    if (user && !authLoading) {
      doImportShinwa();
      doImportShinwaProducts();
    }
  }, [user, authLoading]);

  useEffect(() => {
    async function doCleanup() {
      if (localStorage.getItem('customers_cleaned_v2')) return;
      try {
        const { data: allCustomers, error: fetchErr } = await supabase.from('customers').select('*');
        if (fetchErr) throw fetchErr;

        if (allCustomers && allCustomers.length > 0) {
          const seen = new Set();
          const duplicates = [];

          // Sort by created_at so we keep the first one
          allCustomers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          for (const c of allCustomers) {
            // Check uniqueness by name and company
            const key = `${c.company}-${c.name}`.toLowerCase();
            if (seen.has(key)) {
              duplicates.push(c.id);
            } else {
              seen.add(key);
            }
          }

          if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicates. Deleting...`);
            const { error: delErr } = await supabase.from('customers').delete().in('id', duplicates);
            if (delErr) {
              console.error('Delete failed:', delErr);
            } else {
              console.log('Cleanup successful!');
              localStorage.setItem('customers_cleaned_v2', 'true');
              alert(`ลบรายชื่อที่ซ้ำกันออกเรียบร้อยแล้วครับ (${duplicates.length} รายการ)`);
            }
          } else {
            console.log('No duplicates found.');
            localStorage.setItem('customers_cleaned_v2', 'true');
          }
        }
      } catch (err) {
        console.error('Error cleaning up', err);
      }
    }
    
    if (user && !authLoading) {
      doCleanup();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return <div className="loading-screen">กำลังโหลด...</div>;
  }

  if (!user) {
    return null; // Will redirect via AuthContext
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
          <Link href="/" className="nav-link active">
            <Settings size={20} /> แดชบอร์ด
          </Link>
          <Link href="/customers" className="nav-link">
            <Users size={20} /> ลูกค้า
          </Link>
          <Link href="/products" className="nav-link">
            <Package size={20} /> สินค้า
          </Link>
          <Link href="/quotations" className="nav-link">
            <FileText size={20} /> ใบเสนอราคา
          </Link>
          <Link href="/catalogs" className="nav-link">
            <BookOpen size={20} /> แคตตาล็อก
          </Link>
          <Link href="/settings" className="nav-link">
            <Settings size={20} /> ตั้งค่าบริษัท
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
            <LogOut size={20} /> ออกจากระบบ
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

        <div className="dashboard-grid">
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><Users size={32} /></div>
            <div className="stat-info">
              <h3>ลูกค้า (บริษัทนี้)</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.customers}</p>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><Package size={32} /></div>
            <div className="stat-info">
              <h3>สินค้าทั้งหมด (บริษัทนี้)</h3>
              <p className="stat-number">{loadingStats ? '-' : stats.products}</p>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><FileText size={32} /></div>
            <div className="stat-info">
              <h3>ใบเสนอราคา (บริษัทนี้)</h3>
              <p className="stat-number">{loadingStats ? '-' : totalQuotations}</p>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="icon-wrapper"><DollarSign size={32} /></div>
            <div className="stat-info">
              <h3>ยอดเงินรวม (ไม่รวมยกเลิก)</h3>
              <p className="stat-number">{loadingStats ? '-' : `฿${totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}`}</p>
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
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-grow: 1;
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
