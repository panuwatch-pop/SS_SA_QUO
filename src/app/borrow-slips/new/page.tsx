'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Plus, Trash2, ArrowLeft, Save, FileText, Search, Clock, Calendar, CheckCircle2, AlertCircle, X } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
  product_id: string;
  product_name: string;
  description?: string;
  serial_number?: string;
  quantity: number;
  unit_price: number;
  total: number;
  condition_notes?: string;
}

function NewBorrowSlipContent() {
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromQuotationId = searchParams.get('quotationId');
  const cloneId = searchParams.get('cloneId');

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

  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default expected return date: +14 days
  const defaultReturnDate = new Date();
  defaultReturnDate.setDate(defaultReturnDate.getDate() + 14);
  const [expectedReturnDate, setExpectedReturnDate] = useState(defaultReturnDate.toISOString().split('T')[0]);

  const [purpose, setPurpose] = useState('ทดลองใช้งาน (Demo)');
  const [customPurpose, setCustomPurpose] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);

  const [notes, setNotes] = useState(
    '1. ผู้ยืมต้องดูแลรักษาสินค้าให้อยู่ในสภาพเรียบร้อยสมบูรณ์ หากเกิดความเสียหายหรือสูญหาย ผู้ยืมยินยอมชดใช้ตามราคาประเมินของสินค้า\n' +
    '2. กรุณาส่งคืนสินค้าตามกำหนดเวลาที่ระบุไว้ในเอกสารฉบับนี้\n' +
    '3. ผู้รับคืนจะทำการตรวจเช็คสภาพสินค้าก่อนลงนามรับคืนอย่างเป็นทางการ'
  );

  const [items, setItems] = useState<BorrowItem[]>([
    { product_id: '', product_name: '', description: '', serial_number: '', quantity: 1, unit_price: 0, total: 0, condition_notes: '' }
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

      // 2. Fetch Products
      const { data: prodData } = await fetchAllProducts(company);
      setProducts(prodData || []);

      // 3. Generate Borrow Slip Number
      const generatedNumber = await generateBorrowNumber();
      setBorrowNumber(generatedNumber);

      // 4. If pulled from Quotation
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
            if (foundCust) {
              setBorrowerName(foundCust.name);
              if (foundCust.phone) setBorrowerPhone(foundCust.phone);
              if (foundCust.email) setBorrowerEmail(foundCust.email);
              if (foundCust.address) setBorrowerAddress(foundCust.address);
              if (foundCust.contact_name) setContactPerson(foundCust.contact_name);
            }
          }
          if (qData.project_name) setProjectName(qData.project_name);

          if (qData.quotation_items && qData.quotation_items.length > 0) {
            const bItems = qData.quotation_items.map((qi: any) => ({
              product_id: qi.product_id,
              product_name: qi.products?.name || '',
              description: qi.description || '',
              serial_number: '',
              quantity: Number(qi.quantity) || 1,
              unit_price: Number(qi.unit_price) || 0,
              total: (Number(qi.quantity) || 1) * (Number(qi.unit_price) || 0),
              condition_notes: 'สินค้าใหม่/สมบูรณ์'
            }));
            setItems(bItems);
          }
        }
      }

      // 5. If duplicating from an existing Borrow Slip
      if (cloneId) {
        const { data: cloneSlip } = await supabase
          .from('borrow_slips')
          .select('*, borrow_slip_items(*, products(*))')
          .eq('id', cloneId)
          .single();

        if (cloneSlip) {
          if (cloneSlip.customer_id) setSelectedCustomerId(cloneSlip.customer_id);
          setBorrowerName(cloneSlip.borrower_name || '');
          setBorrowerPhone(cloneSlip.borrower_phone || '');
          setBorrowerEmail(cloneSlip.borrower_email || '');
          setBorrowerAddress(cloneSlip.borrower_address || '');
          setContactPerson(cloneSlip.contact_person || '');
          setPurpose(cloneSlip.purpose || 'ทดลองใช้งาน (Demo)');
          setProjectName(cloneSlip.project_name || '');
          setLocation(cloneSlip.location || '');
          setDepositAmount(Number(cloneSlip.deposit_amount) || 0);
          if (cloneSlip.notes) setNotes(cloneSlip.notes);

          if (cloneSlip.borrow_slip_items && cloneSlip.borrow_slip_items.length > 0) {
            const duplicatedItems = cloneSlip.borrow_slip_items.map((it: any) => ({
              product_id: it.product_id,
              product_name: it.products?.name || '',
              description: it.description || '',
              serial_number: it.serial_number || '',
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              total: Number(it.total) || 0,
              condition_notes: it.condition_notes || ''
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

  const generateBorrowNumber = async () => {
    const prefix = company === 'SST' ? 'LN-SST-' : 'LN-SW-';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const fullPrefix = `${prefix}${yy}${mm}`;

    try {
      const { data } = await supabase
        .from('borrow_slips')
        .select('borrow_number')
        .like('borrow_number', `${fullPrefix}%`)
        .order('borrow_number', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (data && data.length > 0) {
        const lastNumStr = data[0].borrow_number.replace(fullPrefix, '');
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      return `${fullPrefix}${String(nextNum).padStart(3, '0')}`;
    } catch {
      return `${fullPrefix}001`;
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

  // Calculations
  const totalValue = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSave = async (statusToSave: string = 'borrowed') => {
    if (!borrowerName.trim()) {
      alert('กรุณาระบุชื่อผู้ยืม / หน่วยงาน');
      return;
    }
    if (items.length === 0 || items.some(i => !i.product_id && !i.product_name)) {
      alert('กรุณาระบุรายการสินค้าที่ต้องการยืมให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const finalNumber = borrowNumber.trim() || await generateBorrowNumber();
      const finalPurpose = purpose === 'อื่นๆ' ? (customPurpose || 'อื่นๆ') : purpose;

      const { data: slipData, error: slipError } = await supabase
        .from('borrow_slips')
        .insert([{
          borrow_number: finalNumber,
          customer_id: selectedCustomerId || null,
          quotation_id: fromQuotationId || null,
          company_name: company,
          borrower_name: borrowerName.trim(),
          borrower_phone: borrowerPhone.trim(),
          borrower_email: borrowerEmail.trim(),
          borrower_address: borrowerAddress.trim(),
          contact_person: contactPerson.trim(),
          status: statusToSave,
          borrow_date: borrowDate,
          expected_return_date: expectedReturnDate || null,
          purpose: finalPurpose,
          project_name: projectName.trim(),
          location: location.trim(),
          deposit_amount: depositAmount || 0,
          total_amount: totalValue,
          notes: notes
        }])
        .select()
        .single();

      if (slipError) {
        if (slipError.code === '42P01') {
          throw new Error('ตาราง borrow_slips ยังไม่ถูกสร้างในฐานข้อมูล กรุณารันสคริปต์ SQL "supabase_borrow_slips_schema.sql" ใน Supabase');
        }
        throw slipError;
      }

      // Insert Items
      const slipItemsToInsert = items.map(item => ({
        borrow_slip_id: slipData.id,
        product_id: item.product_id || null,
        description: item.description || null,
        serial_number: item.serial_number || null,
        quantity: item.quantity,
        returned_quantity: 0,
        unit_price: item.unit_price,
        total: item.total,
        item_status: 'borrowed',
        condition_notes: item.condition_notes || null
      }));

      const { error: itemsError } = await supabase
        .from('borrow_slip_items')
        .insert(slipItemsToInsert);

      if (itemsError) throw itemsError;

      alert(`บันทึกใบยืมสินค้า ${finalNumber} เรียบร้อยแล้ว`);
      router.push(`/borrow-slips/${slipData.id}`);

    } catch (err: any) {
      console.error('Error saving borrow slip:', err);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message || err}`);
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
            <h1>สร้างใบยืมสินค้า (New Goods Loan)</h1>
            <p className="subtitle">
              {fromQuotationId ? '📦 ดึงข้อมูลจากใบเสนอราคา' : '📦 ออกใบยืมสินค้าเพื่อทดลองใช้หรือจัดแสดง'} • บริษัท {company}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-outline" 
            onClick={() => handleSave('draft')}
            disabled={loading}
            style={{ borderColor: '#64748b', color: '#475569' }}
          >
            บันทึกเป็นฉบับร่าง
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => handleSave('borrowed')}
            disabled={loading}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกใบยืมสินค้า'}
          </button>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setShowCloseModal(true)} 
            disabled={loading}
            style={{ borderColor: '#64748b', color: '#475569', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} style={{ marginRight: '0.35rem' }} /> ปิดหน้านี้
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

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">เลขที่ใบยืมสินค้า (Auto-generated)</label>
              <input 
                type="text" 
                className="input-field" 
                value={borrowNumber}
                onChange={(e) => setBorrowNumber(e.target.value)}
                placeholder="LN-SST-XXXXXX"
                style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}
              />
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

            <div className="form-group" style={{ marginBottom: '1rem' }}>
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
                ระบุรายการสินค้า พร้อม Serial Number (ถ้ามี) และราคาประเมินสำหรับกรณีชดใช้ความเสียหาย
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
                  <th style={{ width: '34%' }}>สินค้า / รายละเอียด *</th>
                  <th style={{ width: '18%' }}>Serial Number / รหัสเครื่อง</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>จำนวนยืม</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>มูลค่าประเมิน/หน่วย</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>รวมมูลค่า (บาท)</th>
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
                          placeholder="สภาพก่อนยืม (เช่น สมบูรณ์)"
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
              <span className="summary-val">{totalQuantity} รายการ</span>
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
              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>สถานะเริ่มต้น:</span>
              <span className="status-pill-init">🔵 อยู่ระหว่างการยืม</span>
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
            onClick={() => handleSave('borrowed')}
            disabled={loading} 
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} /> 
            {loading ? 'กำลังบันทึก...' : 'บันทึกใบยืมสินค้า'}
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
              คุณต้องการปิดหน้านี้และกลับไปยังหน้ารายการใบยืมสินค้าใช่หรือไม่?<br />
              <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>* กรุณาตรวจสอบว่าได้กดบันทึกข้อมูลล่าสุดแล้วก่อนปิด</span>
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
                onClick={() => {
                  setShowCloseModal(false);
                  router.push('/borrow-slips');
                }}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >
                ยืนยันปิดหน้านี้
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 2rem;
          max-width: 1280px;
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

        .form-layout {
          width: 100%;
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
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 1.25rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          padding-bottom: 0.5rem;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .items-panel {
          margin-top: 1.5rem;
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
          text-align: left;
        }

        .items-table td {
          padding: 0.75rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          vertical-align: top;
        }

        .form-grid-bottom {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
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
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: var(--text-color);
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
        }

        .deposit-row .summary-val {
          color: #059669;
        }

        .grand-total-row {
          border-top: 2px solid var(--primary-color);
          padding-top: 0.85rem;
          margin-top: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-pill-init {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #7dd3fc;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .text-error {
          color: #ef4444;
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 1rem;
        }

        .modal-card {
          background: #ffffff;
          border-radius: 12px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

export default function NewBorrowSlipPage() {
  return (
    <Suspense fallback={<div className="loading-screen">กำลังโหลด...</div>}>
      <NewBorrowSlipContent />
    </Suspense>
  );
}
