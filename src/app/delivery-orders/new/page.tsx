'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save, Truck, EyeOff, Eye, Search } from 'lucide-react';
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
  phone?: string;
  contact_name?: string;
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

function NewDeliveryOrderContent() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSelectedCustomerId = searchParams.get('customerId');
  const fromQuotationId = searchParams.get('quotationId');
  const cloneId = searchParams.get('cloneId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [doNumber, setDoNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectedCustomerId || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [customerPoNo, setCustomerPoNo] = useState('');
  const [projectName, setProjectName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [transportBy, setTransportBy] = useState('รถบริษัท');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [hidePrice, setHidePrice] = useState(false);

  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [includeVat, setIncludeVat] = useState(true);
  const [notes, setNotes] = useState('1. ได้รับสินค้าตามรายการข้างต้นถูกต้องครบถ้วนและอยู่ในสภาพเรียบร้อยสมบูรณ์\n2. กรุณาลงลายมือชื่อและประทับตราสำคัญ (ถ้ามี) เพื่อเป็นหลักฐานในการรับมอบสินค้า');

  const [items, setItems] = useState<DOItem[]>([
    { product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }
  ]);

  useEffect(() => {
    if (user && company) {
      loadInitialData();
    }
  }, [user, company]);

  const loadInitialData = async () => {
    setFetchingData(true);
    try {
      // 1. Fetch Customers
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .or(`company.eq.${company},company.eq.Shared`)
        .order('name', { ascending: true });
      setCustomers(custData || []);

      // 2. Fetch Products strictly for current company
      const { data: prodData } = await fetchAllProducts(company);
      setProducts(prodData || []);

      // 3. Generate DO Number
      const generatedDO = await generateDONumber();
      setDoNumber(generatedDO);

      // 4. Pre-fill customer address if customer was pre-selected
      if (preSelectedCustomerId && custData) {
        const found = custData.find((c: any) => c.id === preSelectedCustomerId);
        if (found) {
          setSelectedCustomerId(found.id);
          if (found.address) setDeliveryAddress(found.address);
        }
      }

      // 5. If pulled from Quotation
      if (fromQuotationId) {
        const { data: qData } = await supabase
          .from('quotations')
          .select('*, quotation_items(*, products(*))')
          .eq('id', fromQuotationId)
          .single();

        if (qData) {
          if (qData.customer_id) {
            setSelectedCustomerId(qData.customer_id);
            const foundCust = (custData || []).find((c: any) => c.id === qData.customer_id);
            if (foundCust && foundCust.address) {
              setDeliveryAddress(foundCust.address);
            }
          }
          if (qData.project_name) setProjectName(qData.project_name);
          if (qData.global_discount_percent !== undefined) setGlobalDiscountPercent(qData.global_discount_percent);
          if (qData.has_vat !== undefined) setIncludeVat(qData.has_vat);

          if (qData.quotation_items && qData.quotation_items.length > 0) {
            const doItems = qData.quotation_items.map((qi: any) => ({
              product_id: qi.product_id,
              product_name: qi.products?.name || '',
              description: qi.description || '',
              quantity: Number(qi.quantity) || 1,
              unit_price: Number(qi.unit_price) || 0,
              discount: Number(qi.discount) || 0,
              total: Number(qi.total) || 0
            }));
            setItems(doItems);
          }
        }
      }

      // 6. If duplicating from an existing DO (cloneId)
      if (cloneId) {
        const { data: cloneDO } = await supabase
          .from('delivery_orders')
          .select('*, delivery_order_items(*, products(*))')
          .eq('id', cloneId)
          .single();

        if (cloneDO) {
          if (cloneDO.customer_id) setSelectedCustomerId(cloneDO.customer_id);
          if (cloneDO.customer_po_no) setCustomerPoNo(cloneDO.customer_po_no);
          if (cloneDO.project_name) setProjectName(cloneDO.project_name);
          if (cloneDO.delivery_address) setDeliveryAddress(cloneDO.delivery_address);
          if (cloneDO.transport_by) setTransportBy(cloneDO.transport_by);
          if (cloneDO.driver_name) setDriverName(cloneDO.driver_name);
          if (cloneDO.driver_phone) setDriverPhone(cloneDO.driver_phone);
          if (cloneDO.hide_price !== undefined) setHidePrice(cloneDO.hide_price);
          if (cloneDO.global_discount_percent !== undefined) setGlobalDiscountPercent(cloneDO.global_discount_percent);
          if (cloneDO.has_vat !== undefined) setIncludeVat(cloneDO.has_vat);
          if (cloneDO.notes) setNotes(cloneDO.notes);

          if (cloneDO.delivery_order_items && cloneDO.delivery_order_items.length > 0) {
            const duplicatedItems = cloneDO.delivery_order_items.map((it: any) => ({
              product_id: it.product_id,
              product_name: it.products?.name || '',
              description: it.description || '',
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              discount: Number(it.discount) || 0,
              total: Number(it.total) || 0
            }));
            setItems(duplicatedItems);
          }
        }
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const generateDONumber = async () => {
    const prefix = company === 'SST' ? 'DO-SST-' : 'DO-SW-';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const fullPrefix = `${prefix}${yy}${mm}`;

    try {
      const { data } = await supabase
        .from('delivery_orders')
        .select('do_number')
        .like('do_number', `${fullPrefix}%`)
        .order('do_number', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (data && data.length > 0) {
        const lastNumStr = data[0].do_number.replace(fullPrefix, '');
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      return `${fullPrefix}${String(nextNum).padStart(3, '0')}`;
    } catch {
      return `${fullPrefix}001`;
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c.id === customerId);
    if (cust && cust.address && !deliveryAddress) {
      setDeliveryAddress(cust.address);
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
      // 1. Insert into delivery_orders
      const { data: newDO, error: doError } = await supabase
        .from('delivery_orders')
        .insert([{
          do_number: doNumber,
          quotation_id: fromQuotationId || null,
          customer_id: selectedCustomerId,
          company_name: company,
          status: 'draft',
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
          notes: notes
        }])
        .select()
        .single();

      if (doError) throw doError;

      // 2. Insert items
      const doItems = items.map(item => ({
        delivery_order_id: newDO.id,
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

      alert(`ออกใบส่งของชั่วคราว ${doNumber} เรียบร้อยแล้ว!`);
      router.push(`/delivery-orders/${newDO.id}`);

    } catch (error: any) {
      console.error('Error creating delivery order:', error);
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
          <Link href="/delivery-orders" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ออกใบส่งของชั่วคราว (New Delivery Order)</h1>
            <p className="subtitle">
              {fromQuotationId ? '🚚 ดึงข้อมูลจากใบเสนอราคา (สามารถปรับเพิ่ม/ลดจำนวนสินค้าที่จะส่งได้)' : '🚚 สร้างใบส่งของชั่วคราวใหม่'} • บริษัท {company}
            </p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          <Save size={18} style={{ marginRight: '0.5rem' }} /> 
          {loading ? 'กำลังบันทึก...' : 'บันทึกใบส่งของ'}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="form-layout">
        {/* Top Info Cards */}
        <div className="form-grid-top">
          {/* Card 1: Customer & Delivery Destination */}
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
                onChange={handleCustomerChange}
                placeholder="-- เลือกลูกค้า --"
              />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="label">สถานที่จัดส่งสินค้า (Delivery Address)</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="ระบุสถานที่ส่งของ / แผนก / ชื่อผู้รับหน้างาน..."
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
                  placeholder="เช่น PO-CUST-2026-088"
                  value={customerPoNo}
                  onChange={(e) => setCustomerPoNo(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">ชื่อโครงการ / หน้างาน</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="เช่น อาคาร A ชั้น 5"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Document & Transport Info */}
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
                placeholder="เช่น รถบริษัท, Flash Express, Kerry, Grab, ลูกค้ามารับเอง"
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
                  placeholder="เช่น สมชาย (1กข-9999)"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">เบอร์โทรคนขับ / ผู้ส่ง</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="081-234-5678"
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: '26px', display: 'block', marginTop: '2px' }}>
                * เหมาะสำหรับพิมพ์ให้คนขับรถ หรือส่งมอบหน้างานเพื่อตรวจนับสินค้าโดยไม่เปิดเผยราคา
              </span>
            </div>
          </div>
        </div>

        {/* Items Table Card */}
        <div className="glass-panel form-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>3. รายการสินค้าที่จะจัดส่ง (Items to Deliver)</h2>
              {fromQuotationId && (
                <p style={{ fontSize: '0.82rem', color: '#059669', margin: '4px 0 0 0' }}>
                  💡 ปรับแก้จำนวนตามที่ต้องการส่งจริงในรอบนี้ได้ หากส่งบางส่วนสามารถแก้จำนวนลงได้
                </p>
              )}
            </div>
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
          <Link href="/delivery-orders" className="btn btn-outline">
            ยกเลิก
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกใบส่งของชั่วคราว'}
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

export default function NewDeliveryOrderPage() {
  return (
    <Suspense fallback={<div className="loading-screen">กำลังโหลด...</div>}>
      <NewDeliveryOrderContent />
    </Suspense>
  );
}
