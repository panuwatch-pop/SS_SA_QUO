'use client';

import { useState, useEffect } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save, Truck, Calendar } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
  id?: string;
  product_id: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  total: number;
}

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [poNumber, setPoNumber] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [creditTerms, setCreditTerms] = useState(30);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [includeVat, setIncludeVat] = useState(true);
  const [includeWht, setIncludeWht] = useState(false);
  const [whtPercent, setWhtPercent] = useState(3);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    if (user && id) {
      loadInitialData();
    }
  }, [user, id]);

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

      // 2. Fetch Products
      const { data: prodData } = await fetchAllProducts();
      setProducts(prodData || []);

      // 3. Fetch PO
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();
      if (poError) throw poError;

      setPoNumber(poData.po_number);
      setSelectedSupplierId(poData.supplier_id);
      setIssueDate(poData.issue_date || poData.created_at.split('T')[0]);
      setExpectedDeliveryDate(poData.expected_delivery_date || '');
      setCreditTerms(poData.credit_terms || 30);
      setGlobalDiscountPercent(poData.global_discount_percent || 0);
      setIncludeVat(poData.has_vat !== false);
      setIncludeWht(poData.has_wht || false);
      setWhtPercent(poData.wht_percent || 3);
      setNotes(poData.notes || '');
      setStatus(poData.status || 'draft');

      // 4. Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*, products(*)')
        .eq('purchase_order_id', id);
      if (itemsError) throw itemsError;

      const mappedItems = (itemsData || []).map(i => ({
        id: i.id,
        product_id: i.product_id,
        product_name: i.products?.name || '',
        description: i.description || '',
        quantity: Number(i.quantity) || 1,
        unit_cost: Number(i.unit_cost) || 0,
        discount: Number(i.discount) || 0,
        total: Number(i.total) || 0
      }));
      setItems(mappedItems.length > 0 ? mappedItems : [{ product_id: '', product_name: '', quantity: 1, unit_cost: 0, discount: 0, total: 0 }]);

    } catch (error) {
      console.error('Error loading PO details:', error);
    } finally {
      setFetchingData(false);
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

  const handleUpdate = async () => {
    if (!selectedSupplierId) {
      alert('กรุณาเลือกซัพพลายเออร์');
      return;
    }

    if (items.length === 0 || items.some(i => !i.product_id)) {
      alert('กรุณาเลือกสินค้าให้ครบทุกแถว');
      return;
    }

    setLoading(true);
    try {
      // 1. Update PO Header
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          po_number: poNumber,
          supplier_id: selectedSupplierId,
          issue_date: issueDate,
          expected_delivery_date: expectedDeliveryDate || null,
          credit_terms: creditTerms,
          global_discount_percent: globalDiscountPercent,
          has_vat: includeVat,
          has_wht: includeWht,
          wht_percent: whtPercent,
          total_amount: netPayable,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (poError) throw poError;

      // 2. Delete and re-insert items
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id);

      const itemsToInsert = items.map(item => ({
        purchase_order_id: id,
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

      alert('บันทึกการแก้ไขใบสั่งซื้อเรียบร้อยแล้ว');
      router.push(`/purchase-orders/${id}`);
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
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
          <Link href={`/purchase-orders/${id}`} className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>แก้ไขใบสั่งซื้อสินค้า {poNumber}</h1>
            <p className="subtitle">ปรับปรุงข้อมูลใบสั่งซื้อของ {company}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
          <Save size={18} style={{ marginRight: '0.5rem' }} /> บันทึกการแก้ไข
        </button>
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
              onChange={setSelectedSupplierId}
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
                required
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
