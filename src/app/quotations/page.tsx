'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Search, ArrowLeft, FileText, Trash2, Eye, Edit, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  company_name: string;
  status: string;
  project_name?: string;
  total_amount: number;
  created_at: string;
  customers: {
    name: string;
    customer_code: string;
  };
}

export default function QuotationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (user && company) {
      fetchQuotations();
    }
  }, [user, company]);

  const fetchQuotations = async () => {
    setLoading(true);
    
    // In Supabase, if a user belongs to both or we want to filter by the active company context
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          name,
          customer_code
        )
      `)
      .eq('company_name', company)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotations:', error);
      alert('เกิดข้อผิดพลาดในการโหลดใบเสนอราคา');
    } else {
      setQuotations(data as any || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, quotationNumber: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคา ${quotationNumber}?\n(ไม่สามารถกู้คืนได้)`)) {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) {
        alert('เกิดข้อผิดพลาดในการลบใบเสนอราคา');
      } else {
        fetchQuotations();
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-draft">ฉบับร่าง</span>;
      case 'sent':
        return <span className="badge badge-sent">ส่งแล้ว</span>;
      case 'approved':
        return <span className="badge badge-success">อนุมัติแล้ว</span>;
      case 'rejected':
        return <span className="badge badge-error">ปฏิเสธ</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (q.project_name && q.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.customers?.name && q.customers.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) return <div className="loading-screen">กำลังโหลด...</div>;
  if (!user) return null;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>รายการใบเสนอราคา</h1>
            <p className="subtitle">ดูและจัดการใบเสนอราคาของบริษัท {company}</p>
          </div>
        </div>
        <Link href="/quotations/new" className="btn btn-primary">
          <Plus size={20} style={{ marginRight: '0.5rem' }} /> สร้างใบเสนอราคา
        </Link>
      </header>

      <div className="glass-panel content-panel">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า หรือ ชื่อโปรเจกต์..." 
            className="input-field"
            style={{ width: '100%', minWidth: '350px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading && quotations.length === 0 ? (
          <div className="empty-state">กำลังโหลดข้อมูล...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>ไม่พบรายการใบเสนอราคา</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>เลขที่เอกสาร</th>
                  <th>วันที่สร้าง</th>
                  <th>ลูกค้า / โปรเจกต์</th>
                  <th>ยอดชำระสุทธิ</th>
                  <th>สถานะ</th>
                  <th style={{ textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map(quote => (
                  <tr key={quote.id}>
                    <td>
                      <Link href={`/quotations/${quote.id}`} className="doc-link">
                        {quote.quotation_number}
                      </Link>
                    </td>
                    <td>{new Date(quote.created_at).toLocaleDateString('th-TH')}</td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{quote.customers?.name || '-'}</div>
                      {quote.project_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{quote.project_name}</div>}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      {quote.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td>{getStatusBadge(quote.status)}</td>
                    <td className="actions-cell">
                      <Link href={`/quotations/new?cloneId=${quote.id}`} className="btn-icon bg-white" title="ทำซ้ำ (Duplicate)">
                        <Copy size={18} />
                      </Link>
                      <Link href={`/quotations/${quote.id}/edit`} className="btn-icon bg-white" title="แก้ไข (Edit)">
                        <Edit size={18} />
                      </Link>
                      <Link href={`/quotations/${quote.id}`} className="btn-icon bg-white text-primary" title="ดูรายละเอียด/พิมพ์ (View/Print)">
                        <Eye size={18} />
                      </Link>
                      <button 
                        className="btn-icon bg-white text-error" 
                        onClick={() => handleDelete(quote.id, quote.quotation_number)}
                        title="ลบ (Delete)"
                      >
                        <Trash2 size={18} />
                      </button>
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
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        [data-company="Shinwa Anzen"] .btn-icon:hover { background: rgba(255,255,255,0.1); }
        
        .content-panel { padding: 1.5rem; }
        .search-bar { position: relative; margin-bottom: 1.5rem; max-width: 400px; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-light); }
        .search-bar .input-field { padding-left: 3rem; }
        .empty-state { text-align: center; padding: 4rem 1rem; color: var(--text-light); display: flex; flex-direction: column; align-items: center; }

        .table-responsive { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.05); }
        [data-company="Shinwa Anzen"] .data-table th, [data-company="Shinwa Anzen"] .data-table td { border-bottom-color: rgba(255,255,255,0.05); }
        .data-table th { color: var(--text-light); font-weight: 500; font-size: 0.9rem; }
        .actions-cell { display: flex; gap: 0.5rem; justify-content: flex-end; }
        
        .doc-link { color: var(--primary-color); font-weight: bold; text-decoration: none; transition: opacity 0.2s; }
        .doc-link:hover { opacity: 0.8; text-decoration: underline; }
        [data-company="Shinwa Anzen"] .doc-link { color: var(--secondary-color); }

        .bg-white { background-color: rgba(255,255,255,0.9); }
        .bg-white:hover { background-color: #fff; }
        .text-primary { color: var(--primary-color); }
        .text-error { color: var(--error-color); }
        [data-company="Shinwa Anzen"] .text-primary { color: var(--secondary-color); }
        
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
        .badge-draft { background: rgba(128, 128, 128, 0.2); color: #666; }
        [data-company="Shinwa Anzen"] .badge-draft { background: rgba(255, 255, 255, 0.2); color: #ccc; }
        .badge-sent { background: rgba(59, 130, 246, 0.2); color: #2563eb; }
        [data-company="Shinwa Anzen"] .badge-sent { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
        .badge-success { background: rgba(16, 185, 129, 0.2); color: #059669; }
        [data-company="Shinwa Anzen"] .badge-success { background: rgba(16, 185, 129, 0.3); color: #6ee7b7; }
        .badge-error { background: rgba(239, 68, 68, 0.2); color: #dc2626; }
        [data-company="Shinwa Anzen"] .badge-error { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
      `}</style>
    </div>
  );
}
