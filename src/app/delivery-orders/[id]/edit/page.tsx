'use client';

import { useState, useEffect } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save, Truck, EyeOff, Eye } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

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

interface DOItem {
  product_id: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export default function EditDeliveryOrderPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [doNumber, setDoNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [customerPoNo, setCustomerPoNo] = useState('');
  const [projectName, setProjectName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [transportBy, setTransportBy] = useState('รถบริษัท');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [hidePrice, setHidePrice] = useState(false);
  const [status, setStatus] = useState('draft');

  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [includeVat, setIncludeVat] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DOItem[]>([]);

  useEffect(() => {
    if (user && id) {
      loadInitialData();
    }
  }, [user, id]);

  const loadInitialData = async () => {
    setFetchingData(true);
    try {
      // 1. Fetch DO record
      const { data: doData, error: doError } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (doError) throw doError;

      const doCompany = doData.company_name || company;

      // 2. Fetch Customers
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .or(`company.eq.${doCompany},company.eq.Shared`)
        .order('name', { ascending: true });
      setCustomers(custData || []);

      // 3. Fetch Products for this company
      const { data: prodData } = await fetchAllProducts(doCompany);
      setProducts(prodData || []);

      // 4. Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('delivery_order_items')
        .select('*, products(*)')
        .eq('delivery_order_id', id);

      if (itemsError) throw itemsError;

      setDoNumber(doData.do_number);
      setSelectedCustomerId(doData.customer_id);
      setIssueDate(doData.issue_date || doData.created_at.split('T')[0]);
      setExpectedDeliveryDate(doData.expected_delivery_date || '');
      setCustomerPoNo(doData.customer_po_no || '');
      setProjectName(doData.project_name || '');
      setDeliveryAddress(doData.delivery_address || '');
      setTransportBy(doData.transport_by || 'รถบริษัท');
      setDriverName(doData.driver_name || '');
      setDriverPhone(doData.driver_phone || '');
      setHidePrice(doData.hide_price || false);
      setGlobalDiscountPercent(doData.global_discount_percent || 0);
      setIncludeVat(doData.has_vat !== false);
      setNotes(doData.notes || '');
      setStatus(doData.status || 'draft');

      if (itemsData && itemsData.length > 0) {
        setItems(itemsData.map((it: any) => ({
          product_id: it.product_id,
          product_name: it.products?.name || '',
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          discount: Number(it.discount) || 0,
          total: Number(it.total) || 0
        })));
      } else {
        setItems([{ product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }]);
      }

    } catch (error) {
      console.error('Error loading DO for edit:', error);
      alert('ไม่พบข้อมูลใบส่งของชั่วคราว');
    } finally {
      setFetchingData(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof DOItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id === value);
      if (selectedProd) {
        item.product_name = selectedProd.name;
        item.description = selectedProd.description || '';
        item.unit_price = Number(selectedProd.price) || 0;
      }
    }

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const disc = Number(item.discount) || 0;
    item.total = Math.max(0, qty * price - disc);

    newItems[index] = item;
    setItems(newItems);
  };

  // Totals Calculation
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const discountAmount = (subtotal * (globalDiscountPercent || 0)) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = includeVat ? afterDiscount * 0.07 : 0;
  const grandTotal = afterDiscount + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doNumber) {
      alert('กรุณาระบุเลขที่ใบส่งของ');
      return;
    }
    if (!selectedCustomerId) {
      alert('กรุณาเลือกลูกค้า');
      return;
    }
    if (items.length === 0 || items.some(i => !i.product_id || Number(i.quantity) <= 0)) {
      alert('กรุณาเลือกรายการสินค้าและระบุจำนวนที่ต้องการส่งให้ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      // 1. Update delivery_orders
      const { error: doError } = await supabase
        .from('delivery_orders')
        .update({
          do_number: doNumber,
          customer_id: selectedCustomerId,
          issue_date: issueDate,
          expected_delivery_date: expectedDeliveryDate || null,
          customer_po_no: customerPoNo || null,
          project_name: projectName || null,
          delivery_address: deliveryAddress || null,
          transport_by: transportBy || 'รถบริษัท',
          driver_name: driverName || null,
          driver_phone: driverPhone || null,
          hide_price: hidePrice,
          global_discount_percent: globalDiscountPercent,
          has_vat: includeVat,
          total_amount: grandTotal,
          notes: notes,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (doError) throw doError;

      // 2. Delete old items
      const { error: delError } = await supabase
        .from('delivery_order_items')
        .delete()
        .eq('delivery_order_id', id);

      if (delError) throw delError;

      // 3. Insert updated items
      const doItems = items.map(item => ({
        delivery_order_id: id,
        product_id: item.product_id,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('delivery_order_items')
        .insert(doItems);

      if (itemsError) throw itemsError;

      alert(`บันทึกการแก้ไขใบส่งของชั่วคราว ${doNumber} สำเร็จ!`);
      router.push(`/delivery-orders/${id}`);

    } catch (error: any) {
      console.error('Error updating delivery order:', error);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetchingData) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href={`/delivery-orders/${id}`} className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>แก้ไขใบส่งของชั่วคราว</h1>
            <p className="subtitle">เอกสารเลขที่ {doNumber} • บริษัท {company}</p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          <Save size={18} style={{ marginRight: '0.5rem' }} /> 
          {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="form-layout">
        {/* Top Info Cards */}
        <div className="form-grid-top">
          <div className="glass-panel form-card">
            <h2 className="card-title">1. ข้อมูลลูกค้าและสถานที่จัดส่ง</h2>
            
            <div className="form-group">
              <label className="label">เลือกลูกค้า (Customer) *</label>
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

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="label">สถานที่จัดส่งสินค้า (Delivery Address)</label>
              <textarea
                className="input-field"
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            <div className="form-row-2" style={{ marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="label">เลขที่ PO ลูกค้า (PO Ref)</label>
                <input
                  type="text"
                  className="input-field"
                  value={customerPoNo}
                  onChange={(e) => setCustomerPoNo(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">ชื่อโครงการ / หน้างาน</label>
                <input
                  type="text"
                  className="input-field"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="glass-panel form-card">
            <h2 className="card-title">2. ข้อมูลเอกสารและการขนส่ง</h2>

            <div className="form-row-2">
              <div className="form-group">
                <label className="label">เลขที่ใบส่งของ (DO No.) *</label>
                <input
                  type="text"
                  className="input-field"
                  value={doNumber}
                  onChange={(e) => setDoNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">วันที่จัดส่ง (Delivery Date) *</label>
                <input
                  type="date"
                  className="input-field"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="label">จัดส่งโดย (Transport Method)</label>
              <input
                type="text"
                className="input-field"
                value={transportBy}
                onChange={(e) => setTransportBy(e.target.value)}
              />
            </div>

            <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label className="label">พนักงานขับรถ / ทะเบียนรถ</label>
                <input
                  type="text"
                  className="input-field"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">เบอร์โทรคนขับ / ผู้ส่ง</label>
                <input
                  type="text"
                  className="input-field"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="hide-price-toggle" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', color: hidePrice ? '#7c3aed' : 'var(--text-color)' }}>
                <input
                  type="checkbox"
                  checked={hidePrice}
                  onChange={(e) => setHidePrice(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                {hidePrice ? <EyeOff size={16} color="#7c3aed" /> : <Eye size={16} />} 
                ซ่อนราคาในเอกสาร (แสดงเฉพาะรายการและจำนวนสินค้า)
              </label>
            </div>
          </div>
        </div>

        {/* Items Table Card */}
        <div className="glass-panel form-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>3. รายการสินค้าที่จะจัดส่ง</h2>
            <button type="button" className="btn btn-outline" onClick={addItem}>
              <Plus size={16} style={{ marginRight: '0.35rem' }} /> + เพิ่มรายการสินค้า
            </button>
          </div>

          <div className="table-responsive">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '4%', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ width: hidePrice ? '55%' : '35%' }}>สินค้า / รายละเอียด *</th>
                  <th style={{ width: hidePrice ? '25%' : '14%', textAlign: 'center' }}>จำนวนที่ส่ง *</th>
                  <th style={{ width: hidePrice ? '16%' : '12%', textAlign: 'center' }}>หน่วย</th>
                  {!hidePrice && (
                    <>
                      <th style={{ width: '15%', textAlign: 'right' }}>ราคา/หน่วย (บาท)</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>รวมเงิน (บาท)</th>
                    </>
                  )}
                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center', color: 'var(--text-light)', paddingTop: '1rem' }}>
                      {index + 1}
                    </td>
                    <td>
                      <SearchableSelect
                        options={products.map(p => ({
                          id: p.id,
                          label: p.name,
                          subLabel: `${p.product_code ? `รหัส: ${p.product_code} | ` : ''}ราคา: ${p.price} บ. / ${p.unit || 'ชิ้น'}`
                        }))}
                        value={item.product_id}
                        onChange={(val) => handleItemChange(index, 'product_id', val)}
                        placeholder="-- เลือกสินค้า --"
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="รายละเอียดเพิ่มเติม / สเปก / หมายเหตุสินค้า..."
                        style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <FormattedNumberInput
                        value={item.quantity}
                        onChange={(val) => handleItemChange(index, 'quantity', val)}
                        className="input-field"
                        style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}
                        min={1}
                      />
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                      {products.find(p => p.id === item.product_id)?.unit || 'ชิ้น'}
                    </td>
                    {!hidePrice && (
                      <>
                        <td>
                          <FormattedNumberInput
                            value={item.unit_price}
                            onChange={(val) => handleItemChange(index, 'unit_price', val)}
                            className="input-field"
                            style={{ textAlign: 'right' }}
                            allowDecimals={true}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {Number(item.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon text-error"
                          onClick={() => removeItem(index)}
                          title="ลบรายการนี้"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section: Notes & Totals */}
        <div className="form-grid-bottom" style={{ marginTop: '1.5rem' }}>
          <div className="glass-panel form-card">
            <h2 className="card-title">ข้อกำหนดและหมายเหตุ (Remarks)</h2>
            <textarea
              className="input-field"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {!hidePrice && (
            <div className="glass-panel form-card totals-card">
              <div className="total-row">
                <span>รวมเป็นเงิน:</span>
                <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>

              <div className="total-row" style={{ alignItems: 'center' }}>
                <span>ส่วนลด ({globalDiscountPercent}%):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    style={{ textAlign: 'right', padding: '0.2rem 0.5rem' }}
                    value={globalDiscountPercent}
                    onChange={(e) => setGlobalDiscountPercent(Number(e.target.value) || 0)}
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="total-row" style={{ alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                  />
                  <span>คำนวณ VAT 7%</span>
                </label>
                <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>

              <div className="grand-total-row">
                <span>ยอดเงินรวมทั้งสิ้น:</span>
                <span className="grand-total-val">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Link href={`/delivery-orders/${id}`} className="btn btn-outline">
            ยกเลิก
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .page-container {
          padding: 3rem 2rem 3rem 2rem;
          max-width: 1300px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
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

        .form-grid-top {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .form-grid-top {
            grid-template-columns: 1fr;
          }
        }

        .form-card {
          padding: 1.5rem;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-color);
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          padding-bottom: 0.5rem;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table th {
          padding: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-light);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.01);
        }

        .items-table td {
          padding: 0.75rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          vertical-align: top;
        }

        .form-grid-bottom {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 800px) {
          .form-grid-bottom {
            grid-template-columns: 1fr;
          }
        }

        .totals-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          color: var(--text-color);
        }

        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 1.15rem;
          font-weight: 700;
          border-top: 2px solid var(--primary-color);
          padding-top: 0.75rem;
          margin-top: 0.5rem;
          color: var(--primary-color);
        }

        .grand-total-val {
          color: var(--primary-color);
        }

        .hide-price-toggle {
          background: rgba(124, 58, 237, 0.05);
          border: 1px solid rgba(124, 58, 237, 0.2);
          padding: 0.75rem 1rem;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
