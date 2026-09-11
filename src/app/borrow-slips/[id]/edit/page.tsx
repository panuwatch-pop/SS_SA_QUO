'use client';

import { useState, useEffect } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
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
      setPurpose(slipData.purpose || 'ทดลองใช้งาน (Demo)');
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
        setItems([{ product_id: '', product_name: '', description: '', serial_number: '', quantity: 1, unit_price: 0, total: 0, condition_notes: '' }]);
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
    setItems([...items, { product_id: '', product_name: '', description: '', serial_number: '', quantity: 1, unit_price: 0, total: 0, condition_notes: '' }]);
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
          purpose: purpose,
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
      <header className="page-header">
        <div className="header-left">
          <Link href={`/borrow-slips/${id}`} className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>แก้ไขใบยืมสินค้า: {borrowNumber}</h1>
            <p className="subtitle">ปรับปรุงข้อมูลรายการสินค้าและกำหนดเวลาส่งคืน</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href={`/borrow-slips/${id}`} className="btn btn-outline">
            ยกเลิก
          </Link>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </header>

      {/* Grid Form */}
      <div className="form-grid">
        <div className="glass-panel section-panel">
          <h2 className="section-title">ข้อมูลเอกสาร & ผู้ยืมสินค้า</h2>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="label">เลขที่ใบยืมสินค้า</label>
            <input 
              type="text" 
              className="input-field" 
              value={borrowNumber}
              onChange={(e) => setBorrowNumber(e.target.value)}
              style={{ fontWeight: 'bold' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="label">เลือกลูกค้าในระบบ (เพื่อดึงข้อมูล)</label>
            <SearchableSelect
              options={customers.map(c => ({
                id: c.id,
                label: c.name,
                subLabel: c.customer_code ? `รหัส: ${c.customer_code} ${c.phone ? '| โทร: ' + c.phone : ''}` : c.phone
              }))}
              value={selectedCustomerId}
              onChange={handleCustomerSelect}
              placeholder="-- เลือกลูกค้า --"
            />
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="label">ชื่อผู้ยืม / บริษัท / หน่วยงาน <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="text" 
              className="input-field" 
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="label">ผู้ติดต่อ / ผู้รับมอบ</label>
              <input 
                type="text" 
                className="input-field" 
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="label">เบอร์โทรศัพท์</label>
              <input 
                type="text" 
                className="input-field" 
                value={borrowerPhone}
                onChange={(e) => setBorrowerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="label">อีเมล</label>
            <input 
              type="email" 
              className="input-field" 
              value={borrowerEmail}
              onChange={(e) => setBorrowerEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="label">ที่อยู่ / สถานที่ส่งมอบ</label>
            <textarea 
              className="input-field" 
              rows={2}
              value={borrowerAddress}
              onChange={(e) => setBorrowerAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Loan Details Panel */}
        <div className="glass-panel section-panel">
          <h2 className="section-title">กำหนดเวลา & รายละเอียดการยืม</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="label">วันที่ยืม</label>
              <input 
                type="date" 
                className="input-field" 
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="label" style={{ color: '#b91c1c', fontWeight: 'bold' }}>กำหนดส่งคืน</label>
              <input 
                type="date" 
                className="input-field" 
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="label">สถานะเอกสาร</label>
              <select 
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">ฉบับร่าง</option>
                <option value="borrowed">อยู่ระหว่างยืม</option>
                <option value="partially_returned">คืนบางส่วน</option>
                <option value="returned">คืนครบแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">วันที่ส่งคืนจริง (ถ้ามี)</label>
              <input 
                type="date" 
                className="input-field" 
                value={actualReturnDate}
                onChange={(e) => setActualReturnDate(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="label">วัตถุประสงค์</label>
            <input 
              type="text" 
              className="input-field" 
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="label">โปรเจกต์</label>
              <input 
                type="text" 
                className="input-field" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="label">สถานที่นำไปใช้</label>
              <input 
                type="text" 
                className="input-field" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label">เงินมัดจำ (บาท)</label>
            <FormattedNumberInput
              className="input-field"
              value={depositAmount}
              onChange={(val) => setDepositAmount(val)}
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="glass-panel section-panel items-panel" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>รายการสินค้าที่ยืม</h2>
          <button className="btn btn-outline" onClick={addItem}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} /> เพิ่มรายการ
          </button>
        </div>

        <div className="table-responsive">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>ลำดับ</th>
                <th style={{ width: '32%' }}>สินค้า</th>
                <th style={{ width: '18%' }}>Serial Number</th>
                <th style={{ width: '10%' }}>จำนวนที่ยืม</th>
                <th style={{ width: '10%' }}>คืนแล้ว</th>
                <th style={{ width: '12%' }}>มูลค่าประเมิน/หน่วย</th>
                <th style={{ width: '14%' }}>รวมมูลค่า</th>
                <th style={{ width: '4%' }}></th>
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
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <input 
                        type="text"
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                        placeholder="รายละเอียด"
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                      <input 
                        type="text"
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', width: '45%' }}
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
                      placeholder="S/N"
                      value={item.serial_number || ''}
                      onChange={(e) => updateItem(index, 'serial_number', e.target.value)}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput 
                      className="input-field" 
                      value={item.quantity || 1}
                      onChange={(val) => updateItem(index, 'quantity', val)}
                      allowDecimals={false}
                      style={{ textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <FormattedNumberInput 
                      className="input-field" 
                      value={item.returned_quantity || 0}
                      onChange={(val) => updateItem(index, 'returned_quantity', val)}
                      allowDecimals={false}
                      style={{ textAlign: 'center' }}
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
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {items.length > 1 && (
                      <button 
                        className="btn-icon delete-btn" 
                        onClick={() => removeItem(index)}
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

        {/* Summary & Notes */}
        <div className="summary-section" style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div className="notes-card" style={{ flex: 1, minWidth: '320px' }}>
            <label className="label">ข้อกำหนด & เงื่อนไข</label>
            <textarea 
              className="input-field" 
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="totals-card" style={{ width: '300px', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span>จำนวนชิ้นรวม:</span>
              <span style={{ fontWeight: 'bold' }}>{totalQuantity} รายการ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span>มูลค่าประเมินรวม:</span>
              <span style={{ fontWeight: 'bold' }}>{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>
            {depositAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>เงินมัดจำ:</span>
                <span style={{ fontWeight: 'bold' }}>{depositAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
