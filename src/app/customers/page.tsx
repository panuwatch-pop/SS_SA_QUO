'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Edit2, Trash2, Search, ArrowLeft, Download, Upload, X, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_line: string;
  credit_terms: string;
  company?: string;
}

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import CSV state
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    customer_code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_line: '',
    credit_terms: '',
    is_shared: false
  });

  useEffect(() => {
    if (user && company) {
      fetchCustomers();
    }
  }, [user, company]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`company.eq.${company},company.eq.Shared`)
      .order('customer_code', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า');
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        customer_code: customer.customer_code || '',
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        tax_id: customer.tax_id || '',
        contact_name: customer.contact_name || '',
        contact_phone: customer.contact_phone || '',
        contact_email: customer.contact_email || '',
        contact_line: customer.contact_line || '',
        credit_terms: customer.credit_terms || '',
        is_shared: (customer as any).company === 'Shared'
      });
    } else {
      // Calculate next customer code (CUS-XXXX)
      let nextCode = 'CUS-0001';
      const codes = customers
        .map(c => c.customer_code)
        .filter(code => code && code.startsWith('CUS-'))
        .map(code => parseInt(code.replace('CUS-', ''), 10))
        .filter(num => !isNaN(num));
        
      if (codes.length > 0) {
        const maxCode = Math.max(...codes);
        nextCode = `CUS-${String(maxCode + 1).padStart(4, '0')}`;
      }

      setEditingCustomer(null);
      setFormData({ 
        customer_code: nextCode, name: '', email: '', phone: '', address: '', tax_id: '',
        contact_name: '', contact_phone: '', contact_email: '', contact_line: '', credit_terms: '', is_shared: false
      });
    }
    setIsModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check for duplicate customer_code
    if (formData.customer_code) {
      const isDuplicate = customers.some(c => 
        c.customer_code === formData.customer_code && c.id !== editingCustomer?.id
      );
      if (isDuplicate) {
        alert(`รหัสลูกค้า ${formData.customer_code} มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`);
        setLoading(false);
        return;
      }
    }

    const savePayload = { ...formData };
    const isShared = savePayload.is_shared;
    delete (savePayload as any).is_shared; // Remove it so we don't send to DB if it's not a real column
    const finalCompany = isShared ? 'Shared' : company;

    if (editingCustomer) {
      // Update
      const { error } = await supabase
        .from('customers')
        .update({ ...savePayload, company: finalCompany })
        .eq('id', editingCustomer.id);

      if (error) alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      else fetchCustomers();
    } else {
      // Insert
      const { error } = await supabase
        .from('customers')
        .insert([{ ...savePayload, company: finalCompany }]);

      if (error) alert('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
      else fetchCustomers();
    }

    setLoading(false);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้?')) {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      else fetchCustomers();
    }
  };

  const handleExportCSV = () => {
    // กำหนดหัวตาราง (Headers) ที่ต้องการส่งออก
    const exportData = customers.map(c => ({
      customer_code: c.customer_code || '',
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      tax_id: c.tax_id || '',
      contact_name: c.contact_name || '',
      contact_phone: c.contact_phone || '',
      contact_email: c.contact_email || '',
      contact_line: c.contact_line || '',
      credit_terms: c.credit_terms || '',
      company: c.company || company
    }));

    const csv = Papa.unparse(exportData);
    
    // Create BOM for UTF-8 to display Thai correctly in Excel
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${company}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            alert('ไม่พบข้อมูลในไฟล์ CSV');
            return;
          }

          // ตรวจสอบว่ามีคอลัมน์ชื่อหรือเปล่า (เป็น required)
          if (rows[0] && !('name' in rows[0])) {
            alert('รูปแบบไฟล์ไม่ถูกต้อง: ต้องมีคอลัมน์ name (ชื่อลูกค้า)');
            return;
          }

          // จัดเตรียมข้อมูลสำหรับการ Insert / Upsert
          const payloads = rows.map(row => ({
            customer_code: row.customer_code?.trim() || null,
            name: row.name?.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            address: row.address?.trim() || null,
            tax_id: row.tax_id?.trim() || null,
            contact_name: row.contact_name?.trim() || null,
            contact_phone: row.contact_phone?.trim() || null,
            contact_email: row.contact_email?.trim() || null,
            contact_line: row.contact_line?.trim() || null,
            credit_terms: row.credit_terms?.trim() || null,
            company: row.company?.trim() || company // ให้ความสำคัญกับค่าในไฟล์ก่อน
          }));

          // ทำการ upsert (Update ถ้ามีรหัสลูกค้าเดิม, Insert ถ้าไม่มี)
          // เนื่องจาก supabase upsert ต้องการ unique constraint บนคอลัมน์ที่ใช้อ้างอิง
          // หากไม่มี unique_constraint บน customer_code, อาจจะใช้วิธี insert อย่างเดียว 
          // (หรือเช็คทีละอัน ซึ่งช้า สำหรับความเรียบง่ายจะ insert/update ด้วยการจัดการแยก)
          
          // เพื่อความชัวร์ จะแยก insert โดยตรวจสอบรหัสที่ซ้ำ (เพื่อให้โค้ดรองรับแม้ไม่มี unique constraint บน db)
          const { data: existingCustomers } = await supabase
            .from('customers')
            .select('id, customer_code, name')
            .eq('company', company);
            
          const existingCodeMap = new Map();
          const existingNameMap = new Map();
          if (existingCustomers) {
            existingCustomers.forEach((c: any) => {
              if (c.customer_code) existingCodeMap.set(c.customer_code, c.id);
              if (c.name) existingNameMap.set(c.name.trim(), c.id);
            });
          }

          const recordsToInsert = [];
          const recordsToUpdate = [];

          for (const item of payloads) {
            let matchedId = null;
            if (item.customer_code && existingCodeMap.has(item.customer_code)) {
              matchedId = existingCodeMap.get(item.customer_code);
            } else if (item.name && existingNameMap.has(item.name)) {
              matchedId = existingNameMap.get(item.name);
            }

            if (matchedId) {
              // Update
              recordsToUpdate.push({ ...item, id: matchedId });
            } else {
              // Insert
              recordsToInsert.push(item);
            }
          }

          if (recordsToInsert.length > 0) {
            const { error: insertError } = await supabase.from('customers').insert(recordsToInsert);
            if (insertError) throw insertError;
          }

          if (recordsToUpdate.length > 0) {
            const { error: updateError } = await supabase.from('customers').upsert(recordsToUpdate);
            if (updateError) throw updateError;
          }

          alert(`นำเข้าข้อมูลสำเร็จ!\nเพิ่มใหม่: ${recordsToInsert.length} รายการ\nอัปเดต: ${recordsToUpdate.length} รายการ`);
          fetchCustomers();
        } catch (error: any) {
          console.error('Import error:', error);
          alert('เกิดข้อผิดพลาดในการนำเข้า: ' + error.message);
        } finally {
          setImporting(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
        }
      },
      error: (error) => {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: ' + error.message);
        setImporting(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  const cleanDuplicates = async () => {
    if (!confirm('ระบบจะทำการลบรายชื่อลูกค้าที่ชื่อซ้ำกันออกทั้งหมด (เก็บไว้เพียงรายการเดียว) คุณแน่ใจหรือไม่?')) return;
    
    setLoading(true);
    try {
      const nameMap = new Map();
      const idsToDelete: string[] = [];

      customers.forEach(c => {
        if (!c.name) return;
        const name = c.name.trim();
        if (nameMap.has(name)) {
          idsToDelete.push(c.id);
        } else {
          nameMap.set(name, true);
        }
      });

      if (idsToDelete.length === 0) {
        alert('ไม่พบข้อมูลที่ซ้ำกัน');
        setLoading(false);
        return;
      }

      for (const id of idsToDelete) {
        await supabase.from('customers').delete().eq('id', id);
      }

      alert(`ลบข้อมูลที่ซ้ำกันสำเร็จจำนวน ${idsToDelete.length} รายการ`);
      fetchCustomers();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูลที่ซ้ำ');
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.customer_code && c.customer_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) return <div className="loading-screen">กำลังโหลด...</div>;
  if (!user) return null;

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ระบบจัดการลูกค้า</h1>
            <p className="subtitle">เพิ่ม แก้ไข และดูข้อมูลลูกค้าของบริษัท {company}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input 
            type="file" 
            accept=".csv" 
            style={{ display: 'none' }} 
            ref={csvInputRef} 
            onChange={handleImportCSV} 
          />
          <button className="btn btn-outline" onClick={() => csvInputRef.current?.click()} disabled={importing}>
            <Upload size={18} style={{ marginRight: '0.5rem' }} /> {importing ? 'กำลังนำเข้า...' : 'นำเข้า CSV'}
          </button>
          <div className="action-buttons">
            <button className="btn btn-warning" onClick={cleanDuplicates}>
              <ShieldAlert size={20} />
              ลบข้อมูลที่ซ้ำ
            </button>
            <button className="btn btn-outline" onClick={handleExportCSV}>
              <Download size={20} />
              ส่งออก Excel
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} style={{ marginRight: '0.5rem' }} /> เพิ่มลูกค้าใหม่
          </button>
        </div>
      </header>

      <div className="glass-panel content-panel">
        <div className="search-bar" style={{ position: 'relative' }}>
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ หรือ อีเมล..." 
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingRight: '40px' }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="ล้างการค้นหา"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {loading && customers.length === 0 ? (
          <div className="empty-state">กำลังโหลดข้อมูล...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">ไม่พบข้อมูลลูกค้า</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>รหัสลูกค้า</th>
                  <th>ชื่อลูกค้า / บริษัท</th>
                  <th>ติดต่อ</th>
                  <th className="actions-cell">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <span style={{fontWeight: 'bold'}}>{customer.customer_code || '-'}</span>
                    </td>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>
                      {customer.phone && <div>📞 {customer.phone}</div>}
                      {customer.email && <div>✉️ {customer.email}</div>}
                      {customer.contact_name && <div style={{marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-light)'}}>ผู้ติดต่อ: {customer.contact_name}</div>}
                    </td>
                    <td className="actions-cell">
                      <button className="btn-icon text-primary" onClick={() => handleOpenModal(customer)}>
                        <Edit2 size={18} />
                      </button>
                      <button className="btn-icon text-error" onClick={() => handleDelete(customer.id)}>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="label">รหัสลูกค้า</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.customer_code}
                  onChange={e => setFormData({...formData, customer_code: e.target.value})}
                  placeholder="เช่น CUST-001"
                />
              </div>
              <div className="form-group">
                <label className="label">ชื่อลูกค้า / ชื่อบริษัท *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">อีเมล</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">เบอร์โทรศัพท์</label>
                  <input 
                    type="tel" 
                    className="input-field" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.tax_id}
                  onChange={e => setFormData({...formData, tax_id: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="label">ที่อยู่</label>
                <textarea 
                  className="input-field" 
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                ></textarea>
              </div>

              <h3 style={{marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--primary-color)'}}>ข้อมูลผู้ติดต่อ & เครดิต</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="label">ชื่อผู้ติดต่อ</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.contact_name}
                    onChange={e => setFormData({...formData, contact_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">เบอร์โทรผู้ติดต่อ</label>
                  <input 
                    type="tel" 
                    className="input-field" 
                    value={formData.contact_phone}
                    onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">อีเมลผู้ติดต่อ</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={formData.contact_email}
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">LINE ID ผู้ติดต่อ</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.contact_line}
                    onChange={e => setFormData({...formData, contact_line: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">เครดิต (เช่น 30 วัน, 60 วัน)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.credit_terms}
                  onChange={e => setFormData({...formData, credit_terms: e.target.value})}
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                    checked={formData.is_shared}
                    onChange={(e) => setFormData({...formData, is_shared: e.target.checked})}
                  />
                  ใช้ลูกค้ารายนี้ร่วมกันทั้งสองบริษัท (SST และ Shinwa Anzen)
                </label>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginLeft: '1.8rem', marginTop: '0.25rem' }}>
                  หากติ๊กเลือก ลูกค้ารายนี้จะแสดงในหน้ารายการของทั้งสองบริษัท
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={handleCloseModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 2rem;
          max-width: 1200px;
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
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .btn-icon:hover {
          background: rgba(0,0,0,0.05);
        }
        [data-company="Shinwa Anzen"] .btn-icon:hover {
          background: rgba(255,255,255,0.1);
        }
        .text-primary { color: var(--primary-color); }
        .text-error { color: var(--error-color); }
        [data-company="Shinwa Anzen"] .text-primary { color: var(--secondary-color); }

        .content-panel {
          padding: 1.5rem;
        }
        .search-bar {
          position: relative;
          margin-bottom: 1.5rem;
          max-width: 400px;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light);
        }
        .search-bar .input-field {
          padding-left: 3rem;
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
          padding: 1rem;
          border-bottom: 2px solid rgba(0,0,0,0.1);
          color: var(--text-light);
          font-weight: 600;
        }
        [data-company="Shinwa Anzen"] .data-table th {
          border-bottom-color: rgba(255,255,255,0.1);
        }
        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        [data-company="Shinwa Anzen"] .data-table td {
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .actions-cell {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-light);
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          width: 100%;
          max-width: 600px;
          padding: 2rem;
          background: var(--bg-color); /* opaque fallback */
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-content h2 {
          margin-bottom: 1.5rem;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-row {
          display: flex;
          gap: 1rem;
        }
        .form-row .form-group {
          flex: 1;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .form-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
