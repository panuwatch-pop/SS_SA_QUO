'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Edit2, Trash2, Search, ArrowLeft, Truck, Phone, Mail, CreditCard, Building2, FileText } from 'lucide-react';
import Link from 'next/link';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  credit_terms: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  company: string;
  notes: string;
  created_at: string;
}

export default function SuppliersPage() {
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    credit_terms: 30,
    bank_name: '',
    bank_account_no: '',
    bank_account_name: '',
    company: 'Shared',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchSuppliers();
    }
  }, [user, company]);

  const fetchSuppliers = async () => {
    setLoading(true);
    // Fetch suppliers that match this company or are 'Shared'
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .or(`company.eq.${company},company.eq.Shared`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching suppliers:', error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        code: supplier.code || '',
        name: supplier.name || '',
        contact_name: supplier.contact_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        tax_id: supplier.tax_id || '',
        credit_terms: supplier.credit_terms || 30,
        bank_name: supplier.bank_name || '',
        bank_account_no: supplier.bank_account_no || '',
        bank_account_name: supplier.bank_account_name || '',
        company: supplier.company || 'Shared',
        notes: supplier.notes || ''
      });
    } else {
      setEditingSupplier(null);
      // Auto-generate code
      const nextCode = `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
      setFormData({
        code: nextCode,
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        tax_id: '',
        credit_terms: 30,
        bank_name: '',
        bank_account_no: '',
        bank_account_name: '',
        company: 'Shared',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('กรุณากรอกชื่อผู้ขาย (Supplier Name)');
      return;
    }

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', editingSupplier.id);
        if (error) throw error;
        alert('แก้ไขข้อมูลซัพพลายเออร์สำเร็จ');
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([formData]);
        if (error) throw error;
        alert('เพิ่มซัพพลายเออร์ใหม่สำเร็จ');
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`คุณต้องการลบซัพพลายเออร์ "${name}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('ลบซัพพลายเออร์สำเร็จ');
        fetchSuppliers();
      } catch (error: any) {
        console.error('Error deleting supplier:', error);
        alert(`ไม่สามารถลบได้ อาจมีใบสั่งซื้ออ้างอิงอยู่ (${error.message})`);
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.contact_name && s.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.tax_id && s.tax_id.includes(searchTerm))
  );

  if (authLoading) return <div className="loading-screen">กำลังโหลด...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>จัดการซัพพลายเออร์ (Suppliers)</h1>
            <p className="subtitle">รายชื่อผู้ขายและร้านค้าสำหรับจัดซื้อสินค้า ({company})</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> เพิ่มซัพพลายเออร์
        </button>
      </header>

      {/* Filter and Search */}
      <div className="glass-panel filter-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ขาย, รหัส, ผู้ติดต่อ, เบอร์โทร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field search-input"
          />
        </div>
      </div>

      {/* Supplier List Table */}
      <div className="glass-panel table-container">
        {loading ? (
          <div className="loading-text">กำลังโหลดข้อมูลซัพพลายเออร์...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <Truck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>ไม่พบข้อมูลซัพพลายเออร์</p>
            <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => handleOpenModal()}>
              + เพิ่มซัพพลายเออร์รายแรก
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>รหัส</th>
                  <th style={{ width: '25%' }}>ชื่อซัพพลายเออร์ / บริษัท</th>
                  <th style={{ width: '18%' }}>ผู้ติดต่อ / เบอร์โทร</th>
                  <th style={{ width: '12%' }}>เครดิตเทอม</th>
                  <th style={{ width: '20%' }}>ข้อมูลบัญชีธนาคาร</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="code-badge">{s.code || '-'}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{s.name}</div>
                      {s.tax_id && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Tax ID: {s.tax_id}</div>}
                      {s.company && s.company !== 'Shared' && (
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 51, 160, 0.1)', color: 'var(--primary-color)' }}>
                          เฉพาะ {s.company}
                        </span>
                      )}
                    </td>
                    <td>
                      {s.contact_name && <div>{s.contact_name}</div>}
                      {s.phone && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={12} /> {s.phone}
                        </div>
                      )}
                      {s.email && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Mail size={12} /> {s.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {s.credit_terms ? `${s.credit_terms} วัน` : 'เงินสด'}
                      </span>
                    </td>
                    <td>
                      {s.bank_account_no ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: '500' }}>{s.bank_name || 'ธนาคาร'}</div>
                          <div style={{ color: 'var(--primary-color)', fontFamily: 'monospace' }}>{s.bank_account_no}</div>
                          {s.bank_account_name && <div style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>{s.bank_account_name}</div>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <Link href={`/purchase-orders/new?supplierId=${s.id}`} className="btn-icon" title="ออกใบสั่งซื้อ PO">
                          <FileText size={18} style={{ color: 'var(--primary-color)' }} />
                        </Link>
                        <button className="btn-icon" title="แก้ไข" onClick={() => handleOpenModal(s)}>
                          <Edit2 size={18} />
                        </button>
                        <button className="btn-icon text-error" title="ลบ" onClick={() => handleDelete(s.id, s.name)}>
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>{editingSupplier ? 'แก้ไขข้อมูลซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์ใหม่'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">รหัสซัพพลายเออร์ (Code)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="เช่น SUP-001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">ใช้งานสำหรับบริษัท</label>
                  <select
                    className="input-field"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  >
                    <option value="Shared">ทั้งสองบริษัท (Shared)</option>
                    <option value="SST">เฉพาะ SST</option>
                    <option value="Shinwa Anzen">เฉพาะ Shinwa Anzen</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">ชื่อผู้ขาย / บริษัท (Supplier Name) *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น บริษัท อุปกรณ์อุตสาหกรรม จำกัด"
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="label">ชื่อผู้ติดต่อ (Contact Person)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="เช่น คุณสมชาย (ฝ่ายขาย)"
                  />
                </div>

                <div className="form-group">
                  <label className="label">เบอร์โทรศัพท์ (Phone)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="เช่น 02-123-4567, 081-xxx-xxxx"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="label">อีเมล (Email สำหรับส่ง PO)</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@supplier.com"
                  />
                </div>

                <div className="form-group">
                  <label className="label">เครดิตเทอม (Credit Terms - วัน)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.credit_terms}
                    onChange={(e) => setFormData({ ...formData, credit_terms: Number(e.target.value) })}
                    placeholder="30"
                    min={0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="เลข 13 หลัก"
                />
              </div>

              <div className="form-group">
                <label className="label">ที่อยู่ (Address)</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="ที่อยู่ตาม ภ.พ.20 สำหรับออกใบสั่งซื้อ"
                />
              </div>

              {/* Bank Info Section */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                  ข้อมูลบัญชีธนาคารสำหรับโอนเงิน (Payment Account)
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label" style={{ fontSize: '0.8rem' }}>ธนาคาร (Bank Name)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="เช่น กสิกรไทย, กรุงเทพ"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label" style={{ fontSize: '0.8rem' }}>เลขที่บัญชี (Account No.)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.bank_account_no}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      placeholder="xxx-x-xxxxx-x"
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="label" style={{ fontSize: '0.8rem' }}>ชื่อบัญชี (Account Name)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    placeholder="ชื่อบริษัท หรือ ชื่อเจ้าของบัญชี"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">หมายเหตุเพิ่มเติม (Notes)</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="บันทึกข้อตกลงพิเศษ หรือเงื่อนไขเพิ่มเติม"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'บันทึกการแก้ไข' : 'เพิ่มซัพพลายเออร์'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        .text-error { color: var(--error-color) !important; }
        
        .filter-panel { padding: 1rem; margin-bottom: 1.5rem; }
        .search-box { position: relative; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-light); }
        .search-input { padding-left: 2.75rem; }
        
        .table-container { padding: 1rem; overflow: hidden; }
        .table-responsive { overflow-x: auto; width: 100%; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .data-table th { font-weight: 600; color: var(--text-light); font-size: 0.85rem; text-transform: uppercase; }
        .data-table tbody tr:hover { background: rgba(0,0,0,0.02); }
        
        .code-badge { background: rgba(0, 51, 160, 0.08); color: var(--primary-color); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; }
        
        .action-buttons { display: flex; gap: 0.5rem; }
        .loading-text, .empty-state { text-align: center; padding: 3rem; color: var(--text-light); }
        
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
        .modal-content { background: var(--bg-color); width: 100%; border-radius: 12px; padding: 2rem; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-light); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }

        @media (max-width: 768px) {
          .page-container { padding: 1rem; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
