'use client';

import { useState, useEffect } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save, AlertCircle, X } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  customer_code: string;
  address: string;
  phone?: string;
  contact_name?: string;
  email?: string;
}

interface Product {
  id: string;
  product_code: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
}

interface BorrowItem {
  id?: string;
  product_id: string;
  product_name: string;
  description?: string;
  serial_number?: string;
  quantity: number;
  returned_quantity?: number;
  unit_price: number;
  total: number;
  condition_notes?: string;
}

export default function EditBorrowSlipPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Form State
  const [borrowNumber, setBorrowNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [borrowerAddress, setBorrowerAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const [borrowDate, setBorrowDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [actualReturnDate, setActualReturnDate] = useState('');
  const [purpose, setPurpose] = useState('ทดลองใช้งาน (Demo)');
  const [customPurpose, setCustomPurpose] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [status, setStatus] = useState('borrowed');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<BorrowItem[]>([]);

  useEffect(() => {
    if (user && id && company) {
      loadInitialData();
    }
  }, [user, id, company]);

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

      // 2. Fetch Products
      const { data: prodData } = await fetchAllProducts(company);
      setProducts(prodData || []);

      // 3. Fetch Borrow Slip
      const { data: slipData, error: slipError } = await supabase
        .from('borrow_slips')
        .select('*, borrow_slip_items(*, products(*))')
        .eq('id', id)
        .single();

      if (slipError) throw slipError;

      setBorrowNumber(slipData.borrow_number);
      if (slipData.customer_id) setSelectedCustomerId(slipData.customer_id);
      setBorrowerName(slipData.borrower_name || '');
      setBorrowerPhone(slipData.borrower_phone || '');
      setBorrowerEmail(slipData.borrower_email || '');
      setBorrowerAddress(slipData.borrower_address || '');
      setContactPerson(slipData.contact_person || '');
      setBorrowDate(slipData.borrow_date || '');
      setExpectedReturnDate(slipData.expected_return_date || '');
      setActualReturnDate(slipData.actual_return_date || '');
      
      const standardPurposes = [
        'ทดลองใช้งาน (Demo)',
        'นำไปจัดแสดง (Event / Exhibition)',
        'สำรองใช้งานระหว่างซ่อม',
        'ยืมใช้งานชั่วคราว'
      ];
      const slipPurpose = slipData.purpose || 'ทดลองใช้งาน (Demo)';
      if (standardPurposes.includes(slipPurpose)) {
        setPurpose(slipPurpose);
        setCustomPurpose('');
      } else {
        setPurpose('อื่นๆ');
        setCustomPurpose(slipPurpose);
      }

      setProjectName(slipData.project_name || '');
      setLocation(slipData.location || '');
      setDepositAmount(Number(slipData.deposit_amount) || 0);
      setStatus(slipData.status || 'borrowed');
      setNotes(slipData.notes || '');

      if (slipData.borrow_slip_items && slipData.borrow_slip_items.length > 0) {
        const loadedItems = slipData.borrow_slip_items.map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: it.products?.name || '',
          description: it.description || '',
          serial_number: it.serial_number || '',
          quantity: Number(it.quantity) || 1,
          returned_quantity: Number(it.returned_quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          total: Number(it.total) || 0,
          condition_notes: it.condition_notes || ''
        }));
        setItems(loadedItems);
      } else {
        setItems([{ product_id: '', product_name: '', description: '', serial_number: '', quantity: 1, returned_quantity: 0, unit_price: 0, total: 0, condition_notes: '' }]);
      }

    } catch (err: any) {
      console.error('Error loading slip for edit:', err);
      alert('ไม่พบข้อมูลใบยืมสินค้า: ' + err.message);
    } finally {
      setFetchingData(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setBorrowerName(cust.name);
      if (cust.phone) setBorrowerPhone(cust.phone);
      if (cust.email) setBorrowerEmail(cust.email);
      if (cust.address) setBorrowerAddress(cust.address);
      if (cust.contact_name) setContactPerson(cust.contact_name);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', description: '', serial_number: '', quantity: 1, returned_quantity: 0, unit_price: 0, total: 0, condition_notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof BorrowItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = product.price;
        newItems[index].description = product.description || '';
        newItems[index].total = product.price * newItems[index].quantity;
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      const q = Number(field === 'quantity' ? value : newItems[index].quantity) || 0;
      const p = Number(field === 'unit_price' ? value : newItems[index].unit_price) || 0;
      newItems[index].total = q * p;
    }

    setItems(newItems);
  };

  const totalValue = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalReturned = items.reduce((sum, item) => sum + (Number(item.returned_quantity) || 0), 0);

  const handleSave = async () => {
    if (!borrowerName.trim()) {
      alert('กรุณาระบุชื่อผู้ยืม / หน่วยงาน');
      return;
    }
    if (items.length === 0 || items.some(i => !i.product_id && !i.product_name)) {
      alert('กรุณาระบุรายการสินค้าให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const finalPurpose = purpose === 'อื่นๆ' ? (customPurpose || 'อื่นๆ') : purpose;

      // 1. Update Borrow Slip
      const { error: slipError } = await supabase
        .from('borrow_slips')
        .update({
          borrow_number: borrowNumber.trim(),
          customer_id: selectedCustomerId || null,
          borrower_name: borrowerName.trim(),
          borrower_phone: borrowerPhone.trim(),
          borrower_email: borrowerEmail.trim(),
          borrower_address: borrowerAddress.trim(),
          contact_person: contactPerson.trim(),
          borrow_date: borrowDate,
          expected_return_date: expectedReturnDate || null,
          actual_return_date: actualReturnDate || null,
          purpose: finalPurpose,
          project_name: projectName.trim(),
          location: location.trim(),
          deposit_amount: depositAmount || 0,
          total_amount: totalValue,
          status: status,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (slipError) throw slipError;

      // 2. Delete existing items and re-insert
      const { error: delError } = await supabase
        .from('borrow_slip_items')
        .delete()
        .eq('borrow_slip_id', id);

      if (delError) throw delError;

      const itemsToInsert = items.map(item => ({
        borrow_slip_id: id,
        product_id: item.product_id || null,
        description: item.description || null,
        serial_number: item.serial_number || null,
        quantity: item.quantity,
        returned_quantity: item.returned_quantity || 0,
        unit_price: item.unit_price,
        total: item.total,
        item_status: (item.returned_quantity || 0) >= item.quantity ? 'returned' : 'borrowed',
        condition_notes: item.condition_notes || null
      }));

      const { error: insError } = await supabase
        .from('borrow_slip_items')
        .insert(itemsToInsert);

      if (insError) throw insError;

      alert('บันทึกการแก้ไขเรียบร้อยแล้ว');
      router.push(`/borrow-slips/${id}`);

    } catch (err: any) {
      console.error('Error updating borrow slip:', err);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetchingData) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!user) return null;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      {/* Header matching Quotations & DO */}
      <header className="page-header">
        <div className="header-left">
          <button 
            type="button" 
            className="btn-icon" 
            onClick={() => setShowCloseModal(true)}
            title="ปิดหน้านี้ / ย้อนกลับ"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>แก้ไขใบยืมสินค้า: {borrowNumber}</h1>
            <p className="subtitle">
              ปรับปรุงข้อมูลรายการสินค้า กำหนดเวลาส่งคืน และสถานะ • บริษัท {company}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-outline" 
            onClick={() => setShowCloseModal(true)}
            disabled={loading}
            style={{ borderColor: '#64748b', color: '#475569', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} style={{ marginRight: '0.35rem' }} /> ยกเลิก / ปิดหน้านี้
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </header>

      {/* Main Form Layout */}
      <div className="form-layout">
        {/* Top 2 Cards: Customer & Loan Terms */}
        <div className="form-grid-top">
          
          {/* Card 1: Customer & Borrower Info */}
          <div className="glass-panel form-card">
            <h2 className="card-title">1. ข้อมูลผู้ยืมและสถานที่ส่งมอบ</h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">เลือกลูกค้าในระบบ (เพื่อดึงข้อมูลอัตโนมัติ)</label>
              <SearchableSelect
                options={customers.map(c => ({
                  id: c.id,
                  label: c.name,
                  subLabel: c.customer_code ? `รหัส: ${c.customer_code} ${c.phone ? '| โทร: ' + c.phone : ''}` : c.phone
                }))}
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                placeholder="-- ค้นหาหรือเลือกลูกค้าในระบบ --"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">ชื่อผู้ยืม / บริษัท / หน่วยงาน <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="text" 
                className="input-field" 
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="เช่น บจก. เอบีซี หรือ นายสมศักดิ์ ขยันยิ่ง"
                required
              />
            </div>

            <div className="form-row-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">ผู้ติดต่อ / ผู้รับมอบ</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="ชื่อ-นามสกุล ผู้ติดต่อ"
                />
              </div>
              <div className="form-group">
                <label className="label">เบอร์โทรศัพท์</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">อีเมล</label>
              <input 
                type="email" 
                className="input-field" 
                value={borrowerEmail}
                onChange={(e) => setBorrowerEmail(e.target.value)}
                placeholder="borrower@example.com"
              />
            </div>

            <div className="form-group">
              <label className="label">ที่อยู่ / สถานที่ส่งมอบสินค้า</label>
              <textarea 
                className="input-field" 
                rows={2}
                value={borrowerAddress}
                onChange={(e) => setBorrowerAddress(e.target.value)}
                placeholder="ที่อยู่หรือสถานที่สำหรับส่งมอบ/ใช้งาน"
              />
            </div>
          </div>

          {/* Card 2: Loan Conditions & Schedule */}
          <div className="glass-panel form-card">
            <h2 className="card-title">2. กำหนดเวลาและเงื่อนไขการยืม</h2>

            <div className="form-row-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">เลขที่ใบยืมสินค้า</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={borrowNumber}
                  onChange={(e) => setBorrowNumber(e.target.value)}
                  style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}
                />
              </div>
              <div className="form-group">
                <label className="label">สถานะเอกสาร</label>
                <select 
                  className="input-field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="draft">📝 ฉบับร่าง (Draft)</option>
                  <option value="borrowed">🔵 อยู่ระหว่างการยืม (Borrowed)</option>
                  <option value="partially_returned">🟡 คืนบางส่วน (Partially Returned)</option>
                  <option value="returned">🟢 คืนครบแล้ว (Returned)</option>
                  <option value="cancelled">❌ ยกเลิก (Cancelled)</option>
                </select>
              </div>
            </div>

            <div className="form-row-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">วันที่ยืมสินค้า <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  กำหนดส่งคืน (Due Date) <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  style={{ borderColor: '#fca5a5' }}
                  required
                />
              </div>
            </div>

            <div className="form-row-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">วัตถุประสงค์ในการยืม</label>
                <select 
                  className="input-field"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="ทดลองใช้งาน (Demo)">🔍 ทดลองใช้งานก่อนตัดสินใจซื้อ (Demo)</option>
                  <option value="นำไปจัดแสดง (Event / Exhibition)">🎪 นำไปจัดแสดงสินค้า (Event / Exhibition)</option>
                  <option value="สำรองใช้งานระหว่างซ่อม">🛠️ สำรองใช้งานระหว่างส่งซ่อม/เคลม</option>
                  <option value="ยืมใช้งานชั่วคราว">⏱️ ยืมใช้งานในไซต์งานชั่วคราว</option>
                  <option value="อื่นๆ">✏️ อื่นๆ (ระบุเอง)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">วันที่ส่งคืนจริง (ถ้ามี)</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                />
              </div>
            </div>

            {purpose === 'อื่นๆ' && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="label">ระบุวัตถุประสงค์</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="ระบุเหตุผลในการยืมสินค้า..."
                />
              </div>
            )}

            <div className="form-row-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">ชื่อโครงการ / โครงการ</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="เช่น โรงงานบางพลี เฟส 2"
                />
              </div>
              <div className="form-group">
                <label className="label">สถานที่นำไปใช้งาน</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น แผนกความปลอดภัย โรงงาน 1"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">เงินมัดจำสินค้า (บาท) - ถ้ามี</label>
              <FormattedNumberInput
                className="input-field"
                value={depositAmount}
                onChange={(val) => setDepositAmount(val)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="glass-panel form-card items-panel" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>3. รายการสินค้าที่ยืม (Loan Items)</h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                ระบุรายการสินค้า พร้อม Serial Number (ถ้ามี) จำนวนยืม จำนวนคืนแล้ว และราคาประเมิน
              </p>
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
                  <th style={{ width: '30%' }}>สินค้า / รายละเอียด *</th>
                  <th style={{ width: '16%' }}>Serial Number / รหัสเครื่อง</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>จำนวนยืม</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>คืนแล้ว</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>มูลค่าประเมิน/หน่วย</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>รวมมูลค่า (บาท)</th>
                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center', color: 'var(--text-light)', paddingTop: '0.85rem' }}>
                      {index + 1}
                    </td>
                    <td>
                      <SearchableSelect
                        options={products.map(p => ({
                          id: p.id,
                          label: p.name,
                          subLabel: p.product_code ? `รหัส: ${p.product_code} | ราคา: ฿${p.price}` : `ราคา: ฿${p.price}`
                        }))}
                        value={item.product_id}
                        onChange={(value) => updateItem(index, 'product_id', value)}
                        placeholder="-- เลือกสินค้าในระบบ --"
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                          placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                        <input 
                          type="text" 
                          className="input-field" 
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', width: '45%' }}
                          placeholder="สภาพสินค้า"
                          value={item.condition_notes || ''}
                          onChange={(e) => updateItem(index, 'condition_notes', e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="เช่น SN-2026-001"
                        value={item.serial_number || ''}
                        onChange={(e) => updateItem(index, 'serial_number', e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
                      />
                    </td>
                    <td>
                      <FormattedNumberInput 
                        className="input-field" 
                        value={item.quantity || 1}
                        onChange={(val) => updateItem(index, 'quantity', val)}
                        allowDecimals={false}
                        style={{ textAlign: 'center', fontWeight: 'bold' }}
                      />
                    </td>
                    <td>
                      <FormattedNumberInput 
                        className="input-field" 
                        value={item.returned_quantity || 0}
                        onChange={(val) => updateItem(index, 'returned_quantity', val)}
                        allowDecimals={false}
                        style={{ textAlign: 'center', fontWeight: 'bold', color: (item.returned_quantity || 0) >= item.quantity ? '#16a34a' : '#2563eb' }}
                      />
                    </td>
                    <td>
                      <FormattedNumberInput 
                        className="input-field" 
                        value={item.unit_price || 0}
                        onChange={(val) => updateItem(index, 'unit_price', val)}
                        allowDecimals={true}
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', paddingTop: '0.85rem' }}>
                      {item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center', paddingTop: '0.75rem' }}>
                      {items.length > 1 && (
                        <button 
                          type="button" 
                          className="btn-icon text-error" 
                          onClick={() => removeItem(index)}
                          title="ลบรายการนี้"
                        >
                          <Trash2 size={16} />
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
            <h2 className="card-title">ข้อกำหนด & เงื่อนไขการยืมสินค้า (Terms & Conditions)</h2>
            <textarea 
              className="input-field" 
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', lineHeight: '1.5' }}
            />
          </div>

          <div className="glass-panel form-card totals-card">
            <div className="total-row">
              <span className="summary-label">จำนวนชิ้นที่ยืมรวม:</span>
              <span className="summary-val">{totalQuantity} ชิ้น</span>
            </div>
            <div className="total-row">
              <span className="summary-label">จำนวนชิ้นที่คืนแล้ว:</span>
              <span className="summary-val" style={{ color: '#16a34a' }}>{totalReturned} ชิ้น</span>
            </div>
            <div className="total-row">
              <span className="summary-label">มูลค่าประเมินรวมทั้งสิ้น:</span>
              <span className="summary-val">{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>
            {depositAmount > 0 && (
              <div className="total-row deposit-row">
                <span>เงินมัดจำ (Deposit):</span>
                <span className="summary-val">{depositAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}
            <div className="grand-total-row">
              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>สถานะปัจจุบัน:</span>
              <span className="status-pill-init">
                {status === 'draft' && '📝 ฉบับร่าง'}
                {status === 'borrowed' && '🔵 อยู่ระหว่างยืม'}
                {status === 'partially_returned' && '🟡 คืนบางส่วน'}
                {status === 'returned' && '🟢 คืนครบแล้ว'}
                {status === 'cancelled' && '❌ ยกเลิก'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setShowCloseModal(true)}
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading} 
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal before closing */}
      {showCloseModal && (
        <div className="modal-backdrop">
          <div className="glass-panel modal-card animate-scale-up" style={{ maxWidth: '440px', textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>ยืนยันการปิดหน้านี้</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              คุณต้องการปิดหน้านี้และกลับไปยังรายละเอียดใบยืมสินค้าใช่หรือไม่?<br />
              <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>* หากมีการแก้ไขและไม่ได้กดบันทึก ข้อมูลที่แก้ไขจะหายไป</span>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                type="button"
                className="btn btn-outline" 
                onClick={() => setShowCloseModal(false)}
              >
                ยกเลิก / ทำงานต่อ
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => router.push(`/borrow-slips/${id}`)}
              >
                ละทิ้งและปิดหน้านี้
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-layout {
          display: flex;
          flex-direction: column;
        }

        .form-grid-top {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-card {
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: #ffffff;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--primary-color, #0f172a);
          margin-bottom: 1.25rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px dashed #e2e8f0;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.4rem;
        }

        .input-field {
          padding: 0.6rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.9rem;
          transition: all 0.2s;
          background: #ffffff;
          width: 100%;
        }

        .input-field:focus {
          outline: none;
          border-color: var(--primary-color, #2563eb);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .items-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .items-table th {
          background: #f8fafc;
          padding: 0.75rem 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }

        .items-table td {
          padding: 0.6rem 0.5rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }

        .form-grid-bottom {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1.5rem;
        }

        .totals-card {
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.92rem;
        }

        .summary-label {
          color: #64748b;
        }

        .summary-val {
          font-weight: 700;
          color: #1e293b;
        }

        .deposit-row {
          color: #059669;
          font-weight: 600;
        }

        .grand-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.85rem;
          border-top: 2px solid #e2e8f0;
          font-size: 1.05rem;
        }

        .status-pill-init {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 1rem;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          width: 100%;
        }

        @media (max-width: 900px) {
          .form-grid-top, .form-grid-bottom {
            grid-template-columns: 1fr;
          }
          .form-row-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

