'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Save, Building2, ArrowLeft, Download, Upload, Database } from 'lucide-react';
import Link from 'next/link';

interface CompanyProfile {
  id: string;
  full_name: string;
  address: string;
  tax_id: string;
  phone: string;
  email: string;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  
  const [activeTab, setActiveTab] = useState<string>('SST');
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Backup / Restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set default tab to current company
    if (company) {
      setActiveTab(company);
    }
    
    if (user) {
      fetchCompanies();
    }
  }, [user, company]);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('companies').select('*');
    
    if (error) {
      console.error('Error fetching companies:', error);
    } else if (data) {
      const profileMap: Record<string, CompanyProfile> = {};
      data.forEach(item => {
        profileMap[item.id] = item;
      });
      setProfiles(profileMap);
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof CompanyProfile, value: string) => {
    setProfiles({
      ...profiles,
      [activeTab]: {
        ...profiles[activeTab],
        id: activeTab, // Ensure ID is set if it doesn't exist yet
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    const profileToSave = profiles[activeTab];
    if (!profileToSave || !profileToSave.full_name) {
      alert('กรุณากรอกชื่อบริษัท');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .upsert({
          id: activeTab,
          full_name: profileToSave.full_name,
          address: profileToSave.address,
          tax_id: profileToSave.tax_id,
          phone: profileToSave.phone,
          email: profileToSave.email,
        });

      if (error) throw error;
      alert('บันทึกข้อมูลบริษัทเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error saving company:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      const [
        { data: customers },
        { data: products },
        { data: quotations },
        { data: quotation_items }
      ] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('products').select('*'),
        supabase.from('quotations').select('*'),
        supabase.from('quotation_items').select('*')
      ]);

      const backupData = {
        customers,
        products,
        quotations,
        quotation_items,
        timestamp: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการสำรองข้อมูล: ' + error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('คุณกำลังนำเข้าข้อมูลจากไฟล์ Backup ข้อมูลเดิมที่มีรหัสตรงกันจะถูก "เขียนทับ" ทันที คุณต้องการทำต่อหรือไม่?')) {
      if (restoreInputRef.current) restoreInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setRestoreLoading(true);
        const jsonText = event.target?.result as string;
        const data = JSON.parse(jsonText);

        if (!data.customers || !data.products || !data.quotations || !data.quotation_items) {
          throw new Error('รูปแบบไฟล์ Backup ไม่ถูกต้อง');
        }

        // 1. Upsert Customers & Products (Independent tables)
        if (data.customers.length > 0) {
          const { error } = await supabase.from('customers').upsert(data.customers);
          if (error) throw new Error('Customers: ' + error.message);
        }
        if (data.products.length > 0) {
          const { error } = await supabase.from('products').upsert(data.products);
          if (error) throw new Error('Products: ' + error.message);
        }

        // 2. Upsert Quotations
        if (data.quotations.length > 0) {
          const { error } = await supabase.from('quotations').upsert(data.quotations);
          if (error) throw new Error('Quotations: ' + error.message);
        }

        // 3. Upsert Quotation Items
        if (data.quotation_items.length > 0) {
          const { error } = await supabase.from('quotation_items').upsert(data.quotation_items);
          if (error) throw new Error('Quotation Items: ' + error.message);
        }

        alert('กู้คืนข้อมูลสำเร็จ!');
      } catch (error: any) {
        console.error('Restore error:', error);
        alert('เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + error.message);
      } finally {
        setRestoreLoading(false);
        if (restoreInputRef.current) restoreInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (authLoading || loading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!user) return null;

  const currentProfile = profiles[activeTab] || { id: activeTab, full_name: '', address: '', tax_id: '', phone: '', email: '' };

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ตั้งค่าบริษัท (Company Settings)</h1>
            <p className="subtitle">จัดการข้อมูลที่อยู่ เบอร์โทร สำหรับออกใบเสนอราคา</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={20} style={{ marginRight: '0.5rem' }} /> 
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </header>

      <div className="settings-container glass-panel">
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'SST' ? 'active sst' : ''}`}
            onClick={() => setActiveTab('SST')}
          >
            <Building2 size={18} /> SST (Thailand) Co.,Ltd.
          </button>
          <button 
            className={`tab-btn ${activeTab === 'Shinwa Anzen' ? 'active shinwa' : ''}`}
            onClick={() => setActiveTab('Shinwa Anzen')}
          >
            <Building2 size={18} /> Shinwa Anzen Co.,Ltd.
          </button>
        </div>

        <div className="tab-content">
          <h2 style={{ marginBottom: '1.5rem', color: activeTab === 'SST' ? '#002266' : '#d4af37' }}>
            ข้อมูลบริษัท {activeTab}
          </h2>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">ชื่อเต็มบริษัท (จดทะเบียน) *</label>
              <input 
                type="text" 
                className="input-field" 
                value={currentProfile.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="เช่น บริษัท สยามเซฟตี้เทค จำกัด"
              />
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">ที่อยู่บริษัท</label>
              <textarea 
                className="input-field" 
                rows={3}
                value={currentProfile.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="เช่น 123 ถนนสุขุมวิท แขวง... เขต..."
              />
            </div>
            
            <div className="form-group">
              <label className="label">เลขประจำตัวผู้เสียภาษี</label>
              <input 
                type="text" 
                className="input-field" 
                value={currentProfile.tax_id || ''}
                onChange={(e) => handleInputChange('tax_id', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="label">เบอร์โทรศัพท์</label>
              <input 
                type="text" 
                className="input-field" 
                value={currentProfile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="label">อีเมลติดต่อ</label>
              <input 
                type="email" 
                className="input-field" 
                value={currentProfile.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
              <strong>หมายเหตุ:</strong> ข้อมูลนี้จะถูกดึงไปแสดงในส่วนหัวของไฟล์ PDF ใบเสนอราคาโดยอัตโนมัติ การเปลี่ยนแปลงจะมีผลกับไฟล์ PDF ที่สร้างใหม่ทั้งหมด
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel settings-container" style={{ marginTop: '2rem', padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-color)' }}>
          <Database size={24} color="var(--primary-color)" /> สำรองและกู้คืนข้อมูล (Backup & Restore)
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
          สำรองข้อมูลทั้งหมดของระบบ (ลูกค้า, สินค้า, ใบเสนอราคา) เป็นไฟล์ JSON ไว้ในเครื่อง และสามารถนำกลับมากู้คืนระบบได้ในภายหลัง
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <div>
            <button className="btn btn-outline" onClick={handleBackup} disabled={backupLoading}>
              <Download size={18} style={{ marginRight: '0.5rem' }} /> 
              {backupLoading ? 'กำลังสร้างไฟล์ Backup...' : 'ดาวน์โหลดไฟล์ Backup'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>* นำออกข้อมูลล่าสุดจากระบบ</p>
          </div>

          <div style={{ width: '1px', height: '50px', background: 'var(--glass-border)', margin: '0 1rem' }} />

          <div>
            <button 
              className="btn btn-warning" 
              onClick={async () => {
                if (!confirm('ต้องการอัปเดต/นำเข้า ข้อมูลลูกค้าและสินค้าของ Shinwa จากไฟล์ระบบหรือไม่? (ข้อมูลเดิมอาจถูกอัปเดต)')) return;
                
                try {
                  setRestoreLoading(true);
                  // Load customers
                  const custRes = await fetch('/shinwa_customers_import.json');
                  if (custRes.ok) {
                    const custData = await custRes.json();
                    
                    // Fetch existing to get IDs based on customer_code
                    const { data: existingCusts } = await supabase.from('customers').select('id, customer_code').eq('company', 'Shinwa Anzen');
                    const custMap = new Map();
                    if (existingCusts) {
                      existingCusts.forEach((c: any) => {
                        if (c.customer_code) custMap.set(c.customer_code, c.id);
                      });
                    }
                    
                    const toUpsert = custData.map((c: any) => ({
                      ...c,
                      id: custMap.get(c.customer_code) || undefined
                    }));
                    
                    if (toUpsert.length > 0) {
                      const { error } = await supabase.from('customers').upsert(toUpsert);
                      if (error) console.error('Customer Error:', error);
                    }
                  }
                  
                  // Load products
                  const prodRes = await fetch('/shinwa_products_import.json');
                  if (prodRes.ok) {
                    const prodData = await prodRes.json();
                    
                    const { data: existingProds } = await supabase.from('products').select('id, product_code').eq('company', 'Shinwa Anzen');
                    const prodMap = new Map();
                    if (existingProds) {
                      existingProds.forEach((p: any) => {
                        if (p.product_code) prodMap.set(p.product_code, p.id);
                      });
                    }
                    
                    const toUpsert = prodData.map((p: any) => ({
                      ...p,
                      id: prodMap.get(p.product_code) || undefined
                    }));
                    
                    if (toUpsert.length > 0) {
                      const { error } = await supabase.from('products').upsert(toUpsert);
                      if (error) console.error('Product Error:', error);
                    }
                  }
                  
                  alert('อัปเดตข้อมูล Shinwa สำเร็จ!');
                } catch (err: any) {
                  alert('Error: ' + err.message);
                } finally {
                  setRestoreLoading(false);
                }
              }}
              disabled={restoreLoading}
            >
              <Database size={18} style={{ marginRight: '0.5rem' }} /> 
              อัปเดตฐานข้อมูล Shinwa
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>* ดึงข้อมูลลูกค้า/สินค้า Shinwa ให้ครบถ้วน</p>
          </div>

          <div style={{ width: '1px', height: '50px', background: 'var(--glass-border)', margin: '0 1rem' }} />

          <div>
            <button 
              className="btn btn-warning" 
              onClick={async () => {
                if (!confirm('ต้องการอัปเดต/นำเข้า ข้อมูลลูกค้าและสินค้าของ SST จากไฟล์ระบบหรือไม่? (ข้อมูลเดิมอาจถูกอัปเดต)')) return;
                
                try {
                  setRestoreLoading(true);
                  // Load customers
                  const custRes = await fetch('/sst_customers_import.json');
                  if (custRes.ok) {
                    const custData = await custRes.json();
                    
                    const { data: existingCusts } = await supabase.from('customers').select('id, customer_code').eq('company', 'SST');
                    const custMap = new Map();
                    if (existingCusts) {
                      existingCusts.forEach((c: any) => {
                        if (c.customer_code) custMap.set(c.customer_code, c.id);
                      });
                    }
                    
                    const toUpsert = custData.map((c: any) => ({
                      ...c,
                      id: custMap.get(c.customer_code) || undefined
                    }));
                    
                    if (toUpsert.length > 0) {
                      const { error } = await supabase.from('customers').upsert(toUpsert);
                      if (error) console.error('Customer Error:', error);
                    }
                  }

                  // Load products
                  const prodRes = await fetch('/sst_products_import.json');
                  if (prodRes.ok) {
                    const prodData = await prodRes.json();
                    
                    const { data: existingProds } = await supabase.from('products').select('id, product_code').eq('company', 'SST');
                    const prodMap = new Map();
                    if (existingProds) {
                      existingProds.forEach((p: any) => {
                        if (p.product_code) prodMap.set(p.product_code, p.id);
                      });
                    }
                    
                    const toUpsert = prodData.map((p: any) => ({
                      ...p,
                      id: prodMap.get(p.product_code) || undefined
                    }));
                    
                    if (toUpsert.length > 0) {
                      const { error } = await supabase.from('products').upsert(toUpsert);
                      if (error) console.error('Product Error:', error);
                    }
                  }
                  
                  alert('อัปเดตข้อมูลลูกค้าและสินค้า SST สำเร็จ!');
                } catch (err: any) {
                  alert('Error: ' + err.message);
                } finally {
                  setRestoreLoading(false);
                }
              }}
              disabled={restoreLoading}
            >
              <Database size={18} style={{ marginRight: '0.5rem' }} /> 
              อัปเดตฐานข้อมูล SST
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>* ดึงข้อมูลลูกค้า/สินค้า SST ล่าสุด</p>
          </div>

          <div style={{ width: '1px', height: '50px', background: 'var(--glass-border)', margin: '0 1rem' }} />

          <div>
            <input 
              type="file" 
              accept=".json"
              style={{ display: 'none' }}
              ref={restoreInputRef}
              onChange={handleRestore}
            />
            <button className="btn btn-primary" onClick={() => restoreInputRef.current?.click()} disabled={restoreLoading}>
              <Upload size={18} style={{ marginRight: '0.5rem' }} /> 
              {restoreLoading ? 'กำลังกู้คืนข้อมูล...' : 'กู้คืนจากไฟล์ Backup'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>* จะทำการเขียนทับและเพิ่มข้อมูลใหม่</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1000px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        
        .settings-container { overflow: hidden; }
        
        .tabs { 
          display: flex; 
          border-bottom: 1px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.5);
        }
        [data-company="Shinwa Anzen"] .tabs {
          border-bottom-color: rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
        }
        
        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-light);
          transition: all 0.3s;
        }
        .tab-btn:hover { background: rgba(0,0,0,0.02); }
        .tab-btn.active { color: var(--text-color); font-weight: bold; background: transparent; }
        
        .tab-btn.active.sst { border-bottom-color: #002266; color: #002266; }
        .tab-btn.active.shinwa { border-bottom-color: #d4af37; color: #d4af37; }
        
        .tab-content { padding: 2rem; }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
