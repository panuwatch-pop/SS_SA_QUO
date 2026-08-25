'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save, Building2, Truck, Calendar, CreditCard, Calculator } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
}

interface Product {
  id: string;
  product_code: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
}

interface POItem {
  product_id: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  total: number;
}

function NewPurchaseOrderContent() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedSupplierId = searchParams.get('supplierId');
  const fromQuotationId = searchParams.get('quotationId');
  const cloneId = searchParams.get('cloneId');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [poNumber, setPoNumber] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(preSelectedSupplierId || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [creditTerms, setCreditTerms] = useState(30);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [includeVat, setIncludeVat] = useState(true);
  const [includeWht, setIncludeWht] = useState(false);
  const [whtPercent, setWhtPercent] = useState(3);
  const [notes, setNotes] = useState('1. กรุณาแนบใบส่งของและใบกำกับภาษีทุกครั้งที่ส่งมอบสินค้า\n2. สินค้าต้องอยู่ในสภาพสมบูรณ์และตรงตามสเปกที่ระบุ');
  
  const [items, setItems] = useState<POItem[]>([
    { product_id: '', product_name: '', quantity: 1, unit_cost: 0, discount: 0, total: 0 }
  ]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, company]);

  const loadInitialData = async () => {
    setFetchingData(true);
    try {
      // 1. Fetch Suppliers
      const { data: supData } = await supabase
        .from('suppliers')
        .select('*')
        .or(`company.eq.${company},company.eq.Shared`)
        .order('name', { ascending: true });
      
      setSuppliers(supData || []);

      // 2. Fetch Products for current company
      const { data: prodData } = await fetchAllProducts(company);
      setProducts(prodData || []);

      // 3. Generate PO Number
      const generatedPO = await generatePONumber();
      setPoNumber(generatedPO);

      // 4. If supplier was pre-selected, apply credit terms
      if (preSelectedSupplierId && supData) {
        const found = supData.find((s: any) => s.id === preSelectedSupplierId);
        if (found) {
          setSelectedSupplierId(found.id);
          setCreditTerms(found.credit_terms || 30);
        }
      }

      // 5. If duplicating from an existing PO (cloneId)
      if (cloneId) {
        const { data: clonePO } = await supabase
          .from('purchase_orders')
          .select('*, purchase_order_items(*, products(*))')
          .eq('id', cloneId)
          .single();

        if (clonePO) {
          if (clonePO.supplier_id) setSelectedSupplierId(clonePO.supplier_id);
          if (clonePO.credit_terms) setCreditTerms(clonePO.credit_terms);
          if (clonePO.global_discount_percent !== undefined) setGlobalDiscountPercent(clonePO.global_discount_percent);
          if (clonePO.has_vat !== undefined) setIncludeVat(clonePO.has_vat);
          if (clonePO.has_wht !== undefined) setIncludeWht(clonePO.has_wht);
          if (clonePO.wht_percent !== undefined) setWhtPercent(clonePO.wht_percent);
          if (clonePO.notes) setNotes(clonePO.notes);

          if (clonePO.purchase_order_items && clonePO.purchase_order_items.length > 0) {
            const duplicatedItems = clonePO.purchase_order_items.map((it: any) => ({
              product_id: it.product_id,
              product_name: it.products?.name || '',
              description: it.description || '',
              quantity: Number(it.quantity) || 1,
              unit_cost: Number(it.unit_cost) || 0,
              discount: Number(it.discount) || 0,
              total: Number(it.total) || 0
            }));
            setItems(duplicatedItems);
          }
        }
      }

      // 6. If converted from Quotation, populate items
      if (fromQuotationId) {
        const { data: qData } = await supabase
          .from('quotations')
          .select('*, quotation_items(*, products(*))')
          .eq('id', fromQuotationId)
          .single();

        if (qData && qData.quotation_items) {
          const poItems = qData.quotation_items.map((qi: any) => ({
            product_id: qi.product_id,
            product_name: qi.products?.name || '',
            description: qi.description || '',
            quantity: Number(qi.quantity) || 1,
            unit_cost: 0, // Cost price to be filled by purchaser
            discount: 0,
            total: 0
          }));
          if (poItems.length > 0) {
            setItems(poItems);
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const generatePONumber = async () => {
    const prefix = company === 'SST' ? 'PO-SST-' : 'PO-SW-';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const fullPrefix = `${prefix}${yy}${mm}`;

    const { data } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .like('po_number', `${fullPrefix}%`)
      .order('po_number', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNumStr = data[0].po_number.replace(fullPrefix, '');
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${fullPrefix}${String(nextNum).padStart(3, '0')}`;
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const sup = suppliers.find(s => s.id === supplierId);
    if (sup) {
      setCreditTerms(sup.credit_terms || 30);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_cost: 0, discount: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      alert('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        newItems[index] = {
          ...newItems[index],
          product_id: prod.id,
          product_name: prod.name,
          description: prod.description || '',
          unit_cost: newItems[index].unit_cost || 0,
          total: (newItems[index].unit_cost || 0) * newItems[index].quantity - newItems[index].discount
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'quantity' || field === 'unit_cost' || field === 'discount') {
        const q = field === 'quantity' ? Number(value) : newItems[index].quantity;
        const c = field === 'unit_cost' ? Number(value) : newItems[index].unit_cost;
        const d = field === 'discount' ? Number(value) : newItems[index].discount;
        newItems[index].total = (q * c) - d;
      }
    }
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const globalDiscountAmount = (subtotal * globalDiscountPercent) / 100;
  const afterDiscount = subtotal - globalDiscountAmount;
  const vatAmount = includeVat ? afterDiscount * 0.07 : 0;
  const grandTotal = afterDiscount + vatAmount;
  const whtAmount = includeWht ? afterDiscount * (whtPercent / 100) : 0;
  const netPayable = grandTotal - whtAmount;

  const handleSave = async (status: 'draft' | 'ordered') => {
    if (!selectedSupplierId) {
      alert('กรุณาเลือกซัพพลายเออร์ (Supplier)');
      return;
    }

    if (items.length === 0 || items.some(i => !i.product_id)) {
      alert('กรุณาเลือกสินค้าให้ครบทุกแถว');
      return;
    }

    setLoading(true);
    try {
      const finalPONumber = poNumber.trim() || await generatePONumber();

      // 1. Insert Purchase Order
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: finalPONumber,
          supplier_id: selectedSupplierId,
          company_name: company,
          status: status,
          issue_date: issueDate,
          expected_delivery_date: expectedDeliveryDate || null,
          credit_terms: creditTerms,
          global_discount_percent: globalDiscountPercent,
          has_vat: includeVat,
          has_wht: includeWht,
          wht_percent: whtPercent,
          total_amount: netPayable,
          notes: notes
        }])
        .select()
        .single();

      if (poError) throw poError;

      // 2. Insert PO Items
      const itemsToInsert = items.map(item => ({
        purchase_order_id: poData.id,
        product_id: item.product_id,
        description: item.description || null,
        quantity: item.quantity,
        received_quantity: 0,
        unit_cost: item.unit_cost,
        discount: item.discount,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert(`บันทึกใบสั่งซื้อเลขที่ ${finalPONumber} เรียบร้อยแล้ว`);
      router.push(`/purchase-orders/${poData.id}`);
    } catch (error: any) {
      console.error('Error saving purchase order:', error);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  if (authLoading || fetchingData) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/purchase-orders" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>สร้างใบสั่งซื้อสินค้าใหม่ (New PO)</h1>
            <p className="subtitle">ออกใบสั่งซื้อไปยังซัพพลายเออร์ในนาม {company}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => handleSave('draft')} disabled={loading}>
            <Save size={18} style={{ marginRight: '0.5rem' }} /> บันทึกฉบับร่าง
          </button>
          <button className="btn btn-primary" onClick={() => handleSave('ordered')} disabled={loading}>
            <Save size={18} style={{ marginRight: '0.5rem' }} /> ยืนยันสั่งซื้อ (Ordered)
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="po-form-grid">
        {/* Left Side: Supplier & Basic Info */}
        <div className="glass-panel section-panel">
          <h2 className="section-title">
            <Truck size={18} style={{ marginRight: '0.5rem' }} /> ข้อมูลผู้ขาย (Supplier)
          </h2>

          <div className="form-group">
            <label className="label">เลือกซัพพลายเออร์ (Supplier) *</label>
            <SearchableSelect
              options={suppliers.map(s => ({
                id: s.id,
                label: s.name,
                subLabel: `รหัส: ${s.code || '-'} | เครดิต: ${s.credit_terms || 0} วัน`
              }))}
              value={selectedSupplierId}
              onChange={handleSupplierChange}
              placeholder="-- ค้นหาและเลือกซัพพลายเออร์ --"
            />
          </div>

          {selectedSupplier && (
            <div className="supplier-card animate-fade-in">
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary-color)' }}>
                {selectedSupplier.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
                {selectedSupplier.address || 'ไม่มีที่อยู่'}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px', fontSize: '0.85rem' }}>
                {selectedSupplier.tax_id && <div><strong>Tax ID:</strong> {selectedSupplier.tax_id}</div>}
                {selectedSupplier.phone && <div><strong>โทร:</strong> {selectedSupplier.phone}</div>}
                {selectedSupplier.contact_name && <div><strong>ผู้ติดต่อ:</strong> {selectedSupplier.contact_name}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: PO Meta */}
        <div className="glass-panel section-panel">
          <h2 className="section-title">
            <Calendar size={18} style={{ marginRight: '0.5rem' }} /> ข้อมูลเอกสารและเงื่อนไข
          </h2>

          <div className="form-grid">
            <div className="form-group">
              <label className="label">เลขที่ใบสั่งซื้อ (PO Number)</label>
              <input
                type="text"
                className="input-field"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="รันอัตโนมัติ"
              />
            </div>

            <div className="form-group">
              <label className="label">วันที่สั่งซื้อ (Issue Date)</label>
              <input
                type="date"
                className="input-field"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="label">กำหนดส่งสินค้า (Delivery Date)</label>
              <input
                type="date"
                className="input-field"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">เครดิตเทอม (วัน)</label>
              <input
                type="number"
                className="input-field"
                value={creditTerms}
                onChange={(e) => setCreditTerms(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="glass-panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>รายการสินค้าสั่งซื้อ</h2>
          <button className="btn btn-outline" onClick={addItem}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} /> เพิ่มแถวสินค้า
          </button>
        </div>

        <div className="table-responsive">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>ลำดับ</th>
                <th style={{ width: '38%' }}>สินค้า (Product)</th>
                <th style={{ width: '12%' }}>จำนวน</th>
                <th style={{ width: '15%' }}>ราคาต้นทุน/หน่วย (Cost)</th>
                <th style={{ width: '12%' }}>ส่วนลด (บาท)</th>
                <th style={{ width: '13%', textAlign: 'right' }}>จำนวนเงิน (บาท)</th>
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
                        subLabel: `รหัส: ${p.product_code || '-'} | หน่วย: ${p.unit || 'ชิ้น'}`
                      }))}
                      value={item.product_id}
                      onChange={(value) => updateItem(index, 'product_id', value)}
                      placeholder="-- เลือกสินค้า --"
                    />
                    <textarea
                      className="input-field"
                      style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem', minHeight: '38px' }}
                      rows={1}
                      placeholder="รายละเอียดเพิ่มเติม / สเปกสินค้า..."
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput
                      className="input-field"
                      value={item.quantity || 0}
                      onChange={(val) => updateItem(index, 'quantity', val)}
                      allowDecimals={true}
                      style={{ textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput
                      className="input-field"
                      value={item.unit_cost || 0}
                      onChange={(val) => updateItem(index, 'unit_cost', val)}
                      allowDecimals={true}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput
                      className="input-field"
                      value={item.discount || 0}
                      onChange={(val) => updateItem(index, 'discount', val)}
                      allowDecimals={true}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {Number(item.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-icon text-error" onClick={() => removeItem(index)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary and Calculation Area */}
        <div className="summary-section">
          {/* Notes */}
          <div className="form-group">
            <label className="label">หมายเหตุและเงื่อนไขการส่งมอบ (Notes / Conditions)</label>
            <textarea
              className="input-field"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ข้อตกลงเรื่องการส่งของ การรับประกัน..."
            />
          </div>

          {/* Totals Box */}
          <div className="totals-box">
            <div className="total-row">
              <span>รวมเป็นเงิน (Subtotal):</span>
              <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>

            <div className="total-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>ส่วนลดรวม (Discount):</span>
                <input
                  type="number"
                  className="input-field"
                  style={{ width: '70px', padding: '0.2rem 0.5rem', textAlign: 'center' }}
                  value={globalDiscountPercent}
                  onChange={(e) => setGlobalDiscountPercent(Number(e.target.value))}
                  min={0}
                  max={100}
                />
                <span>%</span>
              </div>
              <span style={{ color: 'var(--error-color)' }}>
                - {globalDiscountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>

            <div className="total-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                />
                ภาษีมูลค่าเพิ่ม (VAT 7%)
              </label>
              <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>

            <div className="total-row grand-total">
              <span>จำนวนเงินรวมทั้งสิ้น (Grand Total):</span>
              <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>

            <div className="total-row" style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error-color)' }}>
                <input
                  type="checkbox"
                  checked={includeWht}
                  onChange={(e) => setIncludeWht(e.target.checked)}
                />
                <span>หักภาษี ณ ที่จ่าย</span>
                <select
                  className="input-field"
                  style={{ width: '60px', padding: '0.2rem', textAlign: 'center' }}
                  value={whtPercent}
                  onChange={(e) => setWhtPercent(Number(e.target.value))}
                  disabled={!includeWht}
                >
                  <option value="1">1%</option>
                  <option value="2">2%</option>
                  <option value="3">3%</option>
                  <option value="5">5%</option>
                </select>
              </div>
              <span style={{ color: 'var(--error-color)' }}>
                - {whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>

            {includeWht && (
              <div className="total-row grand-total" style={{ borderTop: 'none', paddingTop: 0, color: 'var(--primary-color)' }}>
                <span>ยอดชำระสุทธิ (Net Payable):</span>
                <span>{netPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        .text-error { color: var(--error-color) !important; }
        
        .po-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .section-panel { padding: 1.5rem; }
        .section-title { font-size: 1.1rem; margin-bottom: 1rem; color: var(--primary-color); display: flex; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 0.5rem; }
        
        .supplier-card { background: rgba(0, 51, 160, 0.04); border: 1px solid rgba(0, 51, 160, 0.15); border-radius: 8px; padding: 1rem; margin-top: 1rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        
        .table-responsive { overflow-x: auto; width: 100%; margin-top: 1rem; }
        .items-table { width: 100%; border-collapse: collapse; text-align: left; }
        .items-table th, .items-table td { padding: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .items-table th { font-weight: 600; color: var(--text-light); font-size: 0.85rem; }
        
        .summary-section { display: grid; grid-template-columns: 3fr 2fr; gap: 2rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); }
        .totals-box { background: rgba(0,0,0,0.02); border-radius: 8px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .grand-total { font-weight: bold; font-size: 1.15rem; border-top: 2px solid rgba(0,0,0,0.1); padding-top: 0.75rem; margin-top: 0.25rem; }

        @media (max-width: 900px) {
          .po-form-grid { grid-template-columns: 1fr; }
          .summary-section { grid-template-columns: 1fr; gap: 1rem; }
        }
        @media (max-width: 768px) {
          .page-container { padding: 1rem; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={<div className="loading-screen">กำลังโหลด...</div>}>
      <NewPurchaseOrderContent />
    </Suspense>
  );
}
