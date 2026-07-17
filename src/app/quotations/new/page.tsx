'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  customer_code: string;
  address: string;
  tax_id: string;
}

interface Product {
  id: string;
  product_code: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
}

interface QuotationItem {
  product_id: string;
  product_name: string; // for display only
  description?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

function NewQuotationContent() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneId = searchParams.get('cloneId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [notes, setNotes] = useState('กำหนดยืนราคา 30 วัน นับจากวันที่เสนอราคา');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [includeVat, setIncludeVat] = useState(true);
  const [includeWht, setIncludeWht] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (user && company) {
      fetchMasterData();
    }
  }, [user, company]);

  const fetchMasterData = async () => {
    setFetchingData(true);
    // Fetch customers
    const { data: cData } = await supabase.from('customers').select('*').or(`company.eq.${company},company.eq.Shared`).order('customer_code', { ascending: true });
    if (cData) setCustomers(cData);

    // Fetch products
    const { data: pData } = await fetchAllProducts(company);
    if (pData) setProducts(pData);
    
    // Set default quotation number
    const nextQn = await generateQuotationNumber();
    setQuotationNumber(nextQn);
    
    // Check if we need to clone an existing quotation
    if (cloneId) {
      const { data: qData } = await supabase.from('quotations').select('*').eq('id', cloneId).single();
      if (qData) {
        setSelectedCustomerId(qData.customer_id);
        setProjectName(qData.project_name || '');
        setNotes(qData.notes || '');
        setGlobalDiscountPercent(qData.global_discount_percent || 0);
        setIncludeVat(qData.has_vat);
        setIncludeWht(qData.has_wht);
        
        const { data: iData } = await supabase.from('quotation_items').select('*, products(name)').eq('quotation_id', cloneId);
        if (iData) {
          setItems(iData.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.products?.name || '',
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            total: item.total
          })));
        }
      }
    } else {
      // Try to load from draft
      const draftStr = localStorage.getItem(`quotation_draft_${company}`);
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (draft.selectedCustomerId) setSelectedCustomerId(draft.selectedCustomerId);
          if (draft.projectName !== undefined) setProjectName(draft.projectName);
          if (draft.items && Array.isArray(draft.items)) setItems(draft.items);
          if (draft.notes !== undefined) setNotes(draft.notes);
          if (draft.globalDiscountPercent !== undefined) setGlobalDiscountPercent(draft.globalDiscountPercent);
          if (draft.includeVat !== undefined) setIncludeVat(draft.includeVat);
          if (draft.includeWht !== undefined) setIncludeWht(draft.includeWht);
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
    }

    setFetchingData(false);
  };

  // Auto-save draft
  useEffect(() => {
    if (fetchingData || !company) return;
    
    const draftData = {
      selectedCustomerId,
      projectName,
      items,
      notes,
      globalDiscountPercent,
      includeVat,
      includeWht,
    };
    localStorage.setItem(`quotation_draft_${company}`, JSON.stringify(draftData));
  }, [selectedCustomerId, projectName, items, notes, globalDiscountPercent, includeVat, includeWht, company, fetchingData]);

  const generateQuotationNumber = async () => {
    const prefix = company === 'SST' ? 'SST-QT-' : 'SA-QT-';
    const year = new Date().getFullYear().toString().slice(-2); // e.g. 23
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const fullPrefix = `${prefix}${year}${month}-`; // e.g. SST-QT-2310-

    // Find latest quotation with this prefix
    const { data } = await supabase
      .from('quotations')
      .select('quotation_number')
      .like('quotation_number', `${fullPrefix}%`)
      .order('quotation_number', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNumStr = data[0].quotation_number.replace(fullPrefix, '');
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${fullPrefix}${String(nextNum).padStart(3, '0')}`;
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: product.id,
          product_name: product.name,
          description: product.description || '',
          unit_price: product.price,
          total: product.price * newItems[index].quantity - newItems[index].discount
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
      // Recalculate total for this row
      if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
        const q = field === 'quantity' ? value : newItems[index].quantity;
        const p = field === 'unit_price' ? value : newItems[index].unit_price;
        const d = field === 'discount' ? value : newItems[index].discount;
        newItems[index].total = (q * p) - d;
      }
    }
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const globalDiscountAmount = (subtotal * globalDiscountPercent) / 100;
  const afterDiscount = subtotal - globalDiscountAmount;
  const vatAmount = includeVat ? afterDiscount * 0.07 : 0;
  const grandTotal = afterDiscount + vatAmount;
  const whtAmount = includeWht ? afterDiscount * 0.03 : 0;
  const netPayable = grandTotal - whtAmount;

  const handleSave = async () => {
    if (!selectedCustomerId) {
      alert('กรุณาเลือกลูกค้า');
      return;
    }
    if (items.length === 0 || items.some(i => !i.product_id)) {
      alert('กรุณาเลือกสินค้าให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const finalQuotationNumber = quotationNumber.trim() || await generateQuotationNumber();

      // Insert Quotation
      const { data: qtData, error: qtError } = await supabase
        .from('quotations')
        .insert([{
          quotation_number: finalQuotationNumber,
          customer_id: selectedCustomerId,
          company_name: company,
          project_name: projectName || null,
          status: 'draft',
          total_amount: netPayable,
          global_discount_percent: globalDiscountPercent,
          has_vat: includeVat,
          has_wht: includeWht,
          notes: notes
        }])
        .select()
        .single();

      if (qtError) throw qtError;

      // Insert Items
      const itemsToInsert = items.map(item => ({
        quotation_id: qtData.id,
        product_id: item.product_id,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert('บันทึกใบเสนอราคาเรียบร้อยแล้ว');
      localStorage.removeItem(`quotation_draft_${company}`);
      router.push(`/quotations`);

    } catch (error: any) {
      console.error('Save error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDraft = () => {
    if (confirm('คุณต้องการล้างข้อมูลที่กรอกไว้ทั้งหมดและเริ่มใหม่ใช่หรือไม่?')) {
      localStorage.removeItem(`quotation_draft_${company}`);
      setSelectedCustomerId('');
      setProjectName('');
      setItems([]);
      setNotes('กำหนดยืนราคา 30 วัน นับจากวันที่เสนอราคา');
      setGlobalDiscountPercent(0);
      setIncludeVat(true);
      setIncludeWht(false);
      generateQuotationNumber().then(setQuotationNumber);
    }
  };

  if (authLoading || fetchingData) return <div className="loading-screen">กำลังโหลด...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/quotations" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>สร้างใบเสนอราคาใหม่</h1>
            <p className="subtitle">บริษัท {company}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={handleClearDraft} disabled={loading} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            ล้างข้อมูล (เริ่มใหม่)
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            <Save size={20} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </header>

      <div className="quotation-form-grid">
        {/* Customer Section */}
        <div className="glass-panel section-panel">
          <h2 className="section-title">ข้อมูลลูกค้าและโปรเจกต์</h2>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="label">เลขที่เอกสาร (Quotation Number) *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="ระบบจะสร้างให้อัตโนมัติหากเว้นว่าง"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="label">ชื่อโปรเจกต์ (Project Name)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="เช่น งานติดตั้งระบบ Network ชั้น 12"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">เลือกลูกค้า *</label>
            <SearchableSelect
              options={customers.map(c => ({
                id: c.id,
                label: c.name,
                subLabel: c.customer_code ? `รหัส: ${c.customer_code}` : undefined
              }))}
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              placeholder="-- เลือกลูกค้า --"
            />
          </div>
          
          {selectedCustomerId && (
            <div className="customer-preview">
              {customers.filter(c => c.id === selectedCustomerId).map(c => (
                <div key={c.id}>
                  <p><strong>ที่อยู่:</strong> {c.address || '-'}</p>
                  <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {c.tax_id || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options Section Removed as fields are moved to summary */}
      </div>

      {/* Items Section */}
      <div className="glass-panel section-panel items-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>รายการสินค้า</h2>
          <button className="btn btn-outline" onClick={addItem}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} /> เพิ่มรายการ
          </button>
        </div>

        <div className="table-responsive">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>ลำดับ</th>
                <th style={{ width: '35%' }}>สินค้า</th>
                <th style={{ width: '15%' }}>จำนวน</th>
                <th style={{ width: '15%' }}>ราคา/หน่วย</th>
                <th style={{ width: '15%' }}>ส่วนลด</th>
                <th style={{ width: '10%' }}>รวมเงิน</th>
                <th style={{ width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td>
                    <SearchableSelect
                      options={products.map(p => ({
                        id: p.id,
                        label: p.name,
                        subLabel: p.product_code ? `รหัส: ${p.product_code} | ราคา: ฿${p.price}` : `ราคา: ฿${p.price}`
                      }))}
                      value={item.product_id}
                      onChange={(value) => updateItem(index, 'product_id', value)}
                      placeholder="-- เลือกสินค้า --"
                    />
                    <textarea 
                      className="input-field"
                      style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem', minHeight: '40px' }}
                      rows={2}
                      placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput 
                      className="input-field" 
                      value={item.quantity || 0}
                      onChange={(val) => updateItem(index, 'quantity', val)}
                      allowDecimals={false}
                      style={{ textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput 
                      className="input-field" 
                      value={item.unit_price || 0}
                      onChange={(val) => updateItem(index, 'unit_price', val)}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput 
                      className="input-field" 
                      value={item.discount || 0}
                      onChange={(val) => updateItem(index, 'discount', val)}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon text-error" onClick={() => removeItem(index)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    ยังไม่มีรายการสินค้า กรุณากด "เพิ่มรายการ"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Notes */}
        <div className="summary-section">
          <div className="notes-box">
            <label className="label">หมายเหตุ / เงื่อนไข</label>
            <textarea 
              className="input-field" 
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
          
          <div className="totals-box">
            <div className="total-row">
              <span>รวมเป็นเงิน (Subtotal)</span>
              <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>
            
            <div className="total-row" style={{ alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ส่วนลดท้ายบิล
                <FormattedNumberInput 
                  className="input-field" 
                  style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }}
                  value={globalDiscountPercent || 0}
                  onChange={(val) => setGlobalDiscountPercent(val > 100 ? 100 : val)}
                /> %
              </span>
              <span style={{ color: 'var(--error-color)' }}>
                - {globalDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>

            {globalDiscountPercent > 0 && (
              <div className="total-row">
                <span>จำนวนเงินหลังหักส่วนลด (After Discount)</span>
                <span>{afterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}

            <div className="total-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={includeVat} 
                  onChange={(e) => setIncludeVat(e.target.checked)} 
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                ภาษีมูลค่าเพิ่ม (VAT 7%)
              </label>
              <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>
            
            <div className="total-row grand-total">
              <span>จำนวนเงินรวม (Grand Total)</span>
              <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>

            <div className="total-row" style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--error-color)' }}>
                <input 
                  type="checkbox" 
                  checked={includeWht} 
                  onChange={(e) => setIncludeWht(e.target.checked)} 
                  style={{ accentColor: 'var(--error-color)' }}
                />
                หักภาษี ณ ที่จ่าย 3% (WHT)
              </label>
              <span style={{ color: 'var(--error-color)' }}>
                - {whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            
            {includeWht && (
              <div className="total-row grand-total" style={{ borderTop: 'none', paddingTop: 0 }}>
                <span>ยอดชำระสุทธิ (Net Payable)</span>
                <span>{netPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        [data-company="Shinwa Anzen"] .btn-icon:hover { background: rgba(255,255,255,0.1); }
        
        .quotation-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
        
        .section-panel { padding: 1.5rem; }
        .section-title { font-size: 1.2rem; margin-bottom: 1rem; color: var(--primary-color); border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5rem; }
        [data-company="Shinwa Anzen"] .section-title { color: var(--secondary-color); border-bottom-color: rgba(255,255,255,0.1); }
        
        .customer-preview { margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.03); border-radius: 8px; font-size: 0.9rem; line-height: 1.5; }
        [data-company="Shinwa Anzen"] .customer-preview { background: rgba(255,255,255,0.05); }

        .items-panel { margin-top: 1.5rem; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th { padding: 0.75rem; text-align: center; color: var(--text-light); font-weight: normal; border-bottom: 1px solid rgba(0,0,0,0.1); }
        [data-company="Shinwa Anzen"] .items-table th { border-bottom-color: rgba(255,255,255,0.1); }
        .items-table td { padding: 0.75rem; vertical-align: top; }
        .items-table .input-field { padding: 0.5rem; }
        select.input-field option { background-color: #ffffff; color: #333333; }
        [data-company="Shinwa Anzen"] select.input-field option { background-color: #0a1128; color: #ffffff; }

        .btn-outline {
          background: transparent;
          border: 1px solid var(--primary-color);
          color: var(--primary-color);
        }
        [data-company="Shinwa Anzen"] .btn-outline {
          border-color: var(--secondary-color);
          color: var(--secondary-color);
        }
        
        .summary-section { display: grid; grid-template-columns: 3fr 2fr; gap: 2rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(0,0,0,0.1); }
        [data-company="Shinwa Anzen"] .summary-section { border-top-color: rgba(255,255,255,0.1); }
        
        .totals-box { display: flex; flex-direction: column; gap: 1rem; background: rgba(0,0,0,0.02); padding: 1.5rem; border-radius: 8px; }
        [data-company="Shinwa Anzen"] .totals-box { background: rgba(255,255,255,0.03); }
        .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; }
        .total-row span:last-child { font-weight: bold; }
        .grand-total { font-weight: bold; font-size: 1.3rem; color: var(--primary-color); border-top: 2px solid rgba(0,0,0,0.1); padding-top: 1rem; margin-top: 0.5rem; }
        [data-company="Shinwa Anzen"] .grand-total { color: var(--secondary-color); border-top-color: rgba(255,255,255,0.1); }
        
        /* Mobile Responsive Adjustments */
        @media (max-width: 768px) {
          .page-container { padding: 1rem; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .header-left { width: 100%; }
          .page-header .btn-primary { width: 100%; justify-content: center; }
          .quotation-form-grid { grid-template-columns: 1fr; }
          .summary-section { grid-template-columns: 1fr; gap: 1rem; }
          .items-table { display: block; overflow-x: auto; white-space: nowrap; }
          .glass-panel.section-panel:first-child { z-index: 50; position: relative; }
        }

        @media (max-width: 900px) {
          .quotation-form-grid { grid-template-columns: 1fr; }
          .summary-section { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="loading-screen">กำลังโหลด...</div>}>
      <NewQuotationContent />
    </Suspense>
  );
}
