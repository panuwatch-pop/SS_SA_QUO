'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  ArrowLeft, Download, Mail, MessageCircle, Edit, CheckCircle2, Clock, 
  Truck, AlertCircle, PackageCheck, Receipt, DollarSign, Plus, Eye, Copy, Trash2 
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PurchaseOrderPDF } from '@/components/pdf/PurchaseOrderPDF';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();

  const [po, setPo] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [supplier, setSupplier] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Goods Receipt (GRN) Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    delivery_note_no: '',
    received_date: new Date().toISOString().split('T')[0],
    received_by: '',
    notes: '',
    company_target: 'Shared'
  });
  const [receivingItems, setReceivingItems] = useState<{ [itemId: string]: number }>({});
  const [savingReceipt, setSavingReceipt] = useState(false);

  // Supplier Bill Modal State
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    credit_terms_days: 30,
    subtotal: 0,
    vat_amount: 0,
    wht_amount: 0,
    net_amount: 0,
    notes: ''
  });
  const [savingBill, setSavingBill] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchPODetails();
    }
  }, [user, id]);

  const fetchPODetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch PO
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (poError) throw poError;
      setPo(poData);

      // 2. Fetch Items with Products
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*, products(*)')
        .eq('purchase_order_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Initialize receiving items quantities to remaining needed
      const initReceiving: { [id: string]: number } = {};
      (itemsData || []).forEach(item => {
        const remaining = Math.max(0, Number(item.quantity) - Number(item.received_quantity || 0));
        initReceiving[item.id] = remaining;
      });
      setReceivingItems(initReceiving);

      // 3. Fetch Supplier
      if (poData.supplier_id) {
        const { data: supData } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', poData.supplier_id)
          .single();
        setSupplier(supData);

        if (supData?.email) {
          setEmailTo(supData.email);
        }
      }

      // 4. Fetch Company Profile
      const { data: compData } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_name', poData.company_name)
        .single();
      setCompanyProfile(compData);

      // 5. Fetch Goods Receipts for this PO
      const { data: grData } = await supabase
        .from('goods_receipts')
        .select('*, goods_receipt_items(*, products(*))')
        .eq('purchase_order_id', id)
        .order('created_at', { ascending: false });
      setGoodsReceipts(grData || []);

      // 6. Fetch Supplier Bills for this PO
      const { data: billsData } = await supabase
        .from('supplier_bills')
        .select('*')
        .eq('purchase_order_id', id)
        .order('created_at', { ascending: false });
      setSupplierBills(billsData || []);

      // Setup prefilled email
      setEmailSubject(`[ใบสั่งซื้อสินค้า] ${poData.po_number} จาก ${poData.company_name}`);
      setEmailMessage(
        `เรียน ${supplier?.contact_name || supplier?.name || 'ฝ่ายขาย'}\n\n` +
        `ทาง ${poData.company_name} ขอส่งเอกสารใบสั่งซื้อสินค้าเลขที่ ${poData.po_number} ตามเอกสารแนบในอีเมลฉบับนี้\n\n` +
        `ยอดรวมทั้งสิ้น: ${Number(poData.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n` +
        `กำหนดส่งมอบ: ${poData.expected_delivery_date ? new Date(poData.expected_delivery_date).toLocaleDateString('th-TH') : 'ตามตกลง'}\n\n` +
        `รบกวนยืนยันการรับใบสั่งซื้อและแจ้งกำหนดการจัดส่งกลับมาด้วยครับ\n\n` +
        `ขอแสดงความนับถือ,\nฝ่ายจัดซื้อ ${poData.company_name}`
      );

      // Setup prefilled bill form
      setBillForm({
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        credit_terms_days: poData.credit_terms || 30,
        subtotal: poData.total_amount,
        vat_amount: poData.has_vat ? (poData.total_amount * 0.07) : 0,
        wht_amount: poData.has_wht ? (poData.total_amount * ((poData.wht_percent || 3) / 100)) : 0,
        net_amount: poData.total_amount,
        notes: `อ้างอิงใบสั่งซื้อ PO เลขที่ ${poData.po_number}`
      });

    } catch (error: any) {
      console.error('Error loading PO details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const isLineBrowser = /Line/i.test(navigator.userAgent);
      if (isLineBrowser) {
        alert('กรุณากดเปิดในเบราว์เซอร์อื่น (Safari/Chrome) เพื่อดาวน์โหลด PDF');
        return;
      }

      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <PurchaseOrderPDF
          po={po}
          items={items}
          supplier={supplier}
          companyProfile={companyProfile}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${po.po_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo) {
      alert('กรุณาระบุอีเมลผู้รับ');
      return;
    }

    setSendingEmail(true);
    try {
      // 1. Generate PDF Blob
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <PurchaseOrderPDF
          po={po}
          items={items}
          supplier={supplier}
          companyProfile={companyProfile}
        />
      ).toBlob();

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append('to', emailTo);
      formData.append('subject', emailSubject);
      formData.append('message', emailMessage);
      formData.append('company_name', po.company_name);
      formData.append('attachment', blob, `${po.po_number}.pdf`);

      // 3. Send Email API
      const res = await fetch('/api/send-email', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send email');

      alert('ส่งอีเมลใบสั่งซื้อไปยังซัพพลายเออร์สำเร็จ');
      setShowEmailModal(false);

      // Auto update status to 'ordered' if it was draft
      if (po.status === 'draft') {
        await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', po.id);
        fetchPODetails();
      }
    } catch (error: any) {
      console.error('Email error:', error);
      alert(`ไม่สามารถส่งอีเมลได้: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShareLine = () => {
    const text = 
      `[ใบสั่งซื้อสินค้า ${po.company_name}]\n` +
      `เลขที่: ${po.po_number}\n` +
      `ผู้ขาย: ${supplier?.name || '-'}\n` +
      `ยอดเงินรวม: ${Number(po.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n` +
      `กำหนดส่ง: ${po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('th-TH') : 'ตามตกลง'}\n` +
      `ดูรายละเอียด: ${window.location.href}`;

    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
  };

  // Submit Goods Receipt (GRN)
  const handleSaveGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one quantity is > 0
    const hasItems = Object.values(receivingItems).some(qty => qty > 0);
    if (!hasItems) {
      alert('กรุณาระบุจำนวนสินค้าที่ตรวจรับอย่างน้อย 1 รายการ');
      return;
    }

    setSavingReceipt(true);
    try {
      // 1. Generate GRN number e.g. GRN-2608001
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const grnPrefix = `GRN-${yy}${mm}`;
      const { data: grnSeq } = await supabase
        .from('goods_receipts')
        .select('grn_number')
        .like('grn_number', `${grnPrefix}%`)
        .order('grn_number', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (grnSeq && grnSeq.length > 0) {
        const lastNum = parseInt(grnSeq[0].grn_number.replace(grnPrefix, ''), 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const grnNumber = `${grnPrefix}${String(nextNum).padStart(3, '0')}`;

      // 2. Insert Goods Receipt
      const { data: grnData, error: grnError } = await supabase
        .from('goods_receipts')
        .insert([{
          grn_number: grnNumber,
          purchase_order_id: po.id,
          supplier_id: po.supplier_id,
          company_name: po.company_name,
          delivery_note_no: receiptForm.delivery_note_no || null,
          received_date: receiptForm.received_date,
          received_by: receiptForm.received_by || user?.email,
          notes: receiptForm.notes || null
        }])
        .select()
        .single();

      if (grnError) throw grnError;

      // 3. Process items and update stock
      for (const item of items) {
        const qtyReceived = Number(receivingItems[item.id]) || 0;
        if (qtyReceived > 0) {
          // 3a. Insert GRN item
          await supabase.from('goods_receipt_items').insert([{
            goods_receipt_id: grnData.id,
            purchase_order_item_id: item.id,
            product_id: item.product_id,
            quantity_received: qtyReceived,
            company_target: receiptForm.company_target
          }]);

          // 3b. Update received_quantity on PO item
          const newReceivedQty = Number(item.received_quantity || 0) + qtyReceived;
          await supabase
            .from('purchase_order_items')
            .update({ received_quantity: newReceivedQty })
            .eq('id', item.id);

          // 3c. Update Inventory (Upsert)
          const targetCompany = receiptForm.company_target; // 'SST', 'Shinwa Anzen', or 'Shared'
          const { data: existingInv } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_id', item.product_id)
            .eq('company', targetCompany)
            .maybeSingle();

          let newStockQty = qtyReceived;
          if (existingInv) {
            newStockQty = Number(existingInv.quantity_on_hand) + qtyReceived;
            await supabase
              .from('inventory')
              .update({
                quantity_on_hand: newStockQty,
                last_cost_price: item.unit_cost,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingInv.id);
          } else {
            await supabase
              .from('inventory')
              .insert([{
                product_id: item.product_id,
                company: targetCompany,
                quantity_on_hand: newStockQty,
                last_cost_price: item.unit_cost,
                reorder_level: 5
              }]);
          }

          // 3d. Record Stock Movement
          await supabase.from('stock_movements').insert([{
            product_id: item.product_id,
            company: targetCompany,
            movement_type: 'IN_PO',
            reference_type: 'GRN',
            reference_id: grnData.id,
            reference_number: grnNumber,
            quantity_change: qtyReceived,
            quantity_after: newStockQty,
            notes: `รับเข้าจาก PO ${po.po_number} (ใบส่งของ: ${receiptForm.delivery_note_no || '-'})`,
            created_by: user?.email
          }]);
        }
      }

      // 4. Update PO Overall Status
      // Re-fetch items to check if fully received
      const { data: updatedItems } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', po.id);

      const allReceived = (updatedItems || []).every(
        i => Number(i.received_quantity) >= Number(i.quantity)
      );
      const anyReceived = (updatedItems || []).some(
        i => Number(i.received_quantity) > 0
      );

      const newPoStatus = allReceived ? 'received' : anyReceived ? 'partially_received' : po.status;
      await supabase.from('purchase_orders').update({ status: newPoStatus }).eq('id', po.id);

      alert(`บันทึกการรับสินค้าเข้าคลังเรียบร้อยแล้ว (เลขที่ใบรับของ ${grnNumber})`);
      setShowReceiptModal(false);
      fetchPODetails();
    } catch (error: any) {
      console.error('Error receiving goods:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setSavingReceipt(false);
    }
  };

  // Submit Supplier Bill (AP)
  const handleSaveSupplierBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.bill_number.trim()) {
      alert('กรุณากรอกเลขที่ใบแจ้งหนี้ / ใบกำกับภาษีของ Supplier');
      return;
    }

    setSavingBill(true);
    try {
      // Calculate Due Date: bill_date + credit_terms_days
      const bDate = new Date(billForm.bill_date);
      const dueDateObj = new Date(bDate.getTime() + (Number(billForm.credit_terms_days) || 30) * 24 * 60 * 60 * 1000);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      const { error } = await supabase.from('supplier_bills').insert([{
        bill_number: billForm.bill_number,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        company_name: po.company_name,
        bill_date: billForm.bill_date,
        credit_terms_days: billForm.credit_terms_days,
        due_date: dueDateStr,
        subtotal: billForm.subtotal,
        vat_amount: billForm.vat_amount,
        wht_amount: billForm.wht_amount,
        net_amount: billForm.net_amount,
        status: 'unpaid',
        notes: billForm.notes
      }]);

      if (error) throw error;

      alert(`บันทึกบิลเจ้าหนี้เลขที่ ${billForm.bill_number} สำเร็จ (กำหนดจ่าย: ${dueDateObj.toLocaleDateString('th-TH')})`);
      setShowBillModal(false);
      fetchPODetails();
    } catch (error: any) {
      console.error('Error saving supplier bill:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setSavingBill(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="status-badge status-draft"><Clock size={12} /> ฉบับร่าง</span>;
      case 'ordered':
        return <span className="status-badge status-ordered"><Truck size={12} /> สั่งซื้อแล้ว</span>;
      case 'partially_received':
        return <span className="status-badge status-partial"><AlertCircle size={12} /> รับของบางส่วน</span>;
      case 'received':
        return <span className="status-badge status-received"><CheckCircle2 size={12} /> รับของครบแล้ว</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">ยกเลิก</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const handleDeletePO = async () => {
    if (confirm(`คุณต้องการลบใบสั่งซื้อ "${po.po_number}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase
          .from('purchase_orders')
          .delete()
          .eq('id', po.id);

        if (error) throw error;

        alert('ลบใบสั่งซื้อสำเร็จ');
        router.push('/purchase-orders');
      } catch (error: any) {
        console.error('Error deleting purchase order:', error);
        alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    }
  };

  if (authLoading || loading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!po) return <div className="loading-screen">ไม่พบข้อมูลใบสั่งซื้อ</div>;

  return (
    <div className="page-container animate-fade-in" data-company={po.company_name}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/purchase-orders" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1>ใบสั่งซื้อ {po.po_number}</h1>
              {getStatusBadge(po.status)}
            </div>
            <p className="subtitle">
              ผู้ขาย: <strong>{supplier?.name}</strong> | วันที่: {new Date(po.issue_date || po.created_at).toLocaleDateString('th-TH')}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleDownloadPDF}>
            <Download size={18} style={{ marginRight: '0.5rem' }} /> บันทึก PDF
          </button>

          <button className="btn btn-primary" onClick={() => setShowEmailModal(true)} style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}>
            <Mail size={18} style={{ marginRight: '0.5rem' }} /> ส่งอีเมล (Supplier)
          </button>

          <button className="btn btn-primary" onClick={handleShareLine} style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}>
            <MessageCircle size={18} style={{ marginRight: '0.5rem' }} /> ส่ง LINE
          </button>

          {po.status !== 'received' && po.status !== 'cancelled' && (
            <button className="btn btn-primary" onClick={() => setShowReceiptModal(true)} style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}>
              <PackageCheck size={18} style={{ marginRight: '0.5rem' }} /> ตรวจรับสินค้าเข้าคลัง
            </button>
          )}

          <button className="btn btn-outline" onClick={() => setShowBillModal(true)}>
            <Receipt size={18} style={{ marginRight: '0.5rem' }} /> บันทึกบิลเจ้าหนี้ (AP)
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="content-grid">
        {/* Left Side: PO Document Preview */}
        <div className="main-content">
          <div className="glass-panel document-preview">
            <div className="preview-header">
              <div>
                <h2>{po.company_name === 'SST' ? 'บริษัท เอสเอสที (ประเทศไทย) จำกัด' : 'บริษัท ชินวา อันเซ็น จำกัด'}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '2px' }}>
                  {po.company_name === 'SST' ? 'SST (Thailand) Co., Ltd.' : 'Shinwa Anzen Co., Ltd.'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}>ใบสั่งซื้อ (PURCHASE ORDER)</h1>
                <p>เลขที่: <strong>{po.po_number}</strong></p>
                <p>วันที่: {new Date(po.issue_date || po.created_at).toLocaleDateString('th-TH')}</p>
                <p>กำหนดส่ง: {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('th-TH') : 'ตามตกลง'}</p>
              </div>
            </div>

            <div className="preview-supplier">
              <h3>ข้อมูลผู้ขาย (Supplier)</h3>
              <p><strong>ชื่อ:</strong> {supplier?.name}</p>
              <p><strong>ที่อยู่:</strong> {supplier?.address || '-'}</p>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {supplier?.tax_id && <p><strong>เลขผู้เสียภาษี:</strong> {supplier.tax_id}</p>}
                {supplier?.contact_name && <p><strong>ผู้ติดต่อ:</strong> {supplier.contact_name}</p>}
                {supplier?.phone && <p><strong>โทร:</strong> {supplier.phone}</p>}
                {supplier?.credit_terms && <p><strong>เครดิตเทอม:</strong> {po.credit_terms || supplier.credit_terms} วัน</p>}
                <p><strong>สถานที่ส่งของ:</strong> {po.company_name === 'SST' ? 'บริษัท เอสเอสที (ประเทศไทย) จำกัด (สำนักงานใหญ่ คลองหลวง ปทุมธานี)' : 'บริษัท ชินวา อันเซ็น จำกัด (สำนักงานใหญ่ คลองหลวง ปทุมธานี)'}</p>
              </div>
            </div>

            <table className="preview-table">
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ width: '40%' }}>รายการสินค้า</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>สั่งซื้อ</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>รับแล้ว</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>ราคาต้นทุน</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>รวมเงิน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const isComplete = Number(item.received_quantity) >= Number(item.quantity);
                  return (
                    <tr key={index}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{item.products?.name}</div>
                        {item.products?.product_code && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            รหัส: {item.products.product_code}
                          </div>
                        )}
                        {item.description && (
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {Number(item.quantity).toLocaleString()} {item.products?.unit || ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: isComplete ? '#10B981' : Number(item.received_quantity) > 0 ? '#F59E0B' : 'var(--text-light)' 
                        }}>
                          {Number(item.received_quantity || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(item.unit_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        {Number(item.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Preview Summary */}
            <div className="preview-summary">
              <div className="preview-notes">
                <strong>หมายเหตุ/เงื่อนไข:</strong>
                <p style={{ whiteSpace: 'pre-wrap', marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                  {po.notes || '-'}
                </p>
                {supplier?.bank_account_no && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    <strong>โอนเงินเข้าบัญชี:</strong> {supplier.bank_name} {supplier.bank_account_no} ({supplier.bank_account_name || supplier.name})
                  </div>
                )}
              </div>

              <div className="preview-totals" style={{ width: '320px' }}>
                {(() => {
                  const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
                  const discountAmount = (subtotal * (po.global_discount_percent || 0)) / 100;
                  const afterDiscount = subtotal - discountAmount;
                  const vatAmount = po.has_vat ? afterDiscount * 0.07 : 0;
                  const grandTotal = afterDiscount + vatAmount;
                  const whtAmount = po.has_wht ? afterDiscount * ((po.wht_percent || 3) / 100) : 0;
                  const netPayable = grandTotal - whtAmount;

                  return (
                    <div style={{ width: '100%' }}>
                      <div className="total-line">
                        <span>รวมเป็นเงิน:</span>
                        <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                      </div>

                      {discountAmount > 0 && (
                        <div className="total-line" style={{ color: 'var(--error-color)' }}>
                          <span>ส่วนลด {po.global_discount_percent}%:</span>
                          <span>- {discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                      )}

                      <div className="total-line">
                        <span>VAT 7%:</span>
                        <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                      </div>

                      <div className="total-line" style={{ borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
                        <span>จำนวนเงินรวมทั้งสิ้น:</span>
                        <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                      </div>

                      {po.has_wht && (
                        <div className="total-line" style={{ color: 'var(--error-color)' }}>
                          <span>หักภาษี ณ ที่จ่าย ({po.wht_percent || 3}%):</span>
                          <span>- {whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                      )}

                      <div className="total-line" style={{ borderTop: '2px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span>ยอดชำระสุทธิ:</span>
                        <span className="grand-total">{Number(netPayable).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Actions, Status & History */}
        <div className="sidebar-actions">
          {/* Status & Management Panel */}
          <div className="glass-panel side-panel">
            <h3>จัดการใบสั่งซื้อ</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
              <Link href={`/purchase-orders/${id}/edit`} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center' }}>
                <Edit size={16} style={{ marginRight: '0.5rem' }} /> แก้ไขข้อมูลใบสั่งซื้อ
              </Link>
              <Link href={`/purchase-orders/new?cloneId=${id}`} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center' }}>
                <Copy size={16} style={{ marginRight: '0.5rem' }} /> คัดลอก (ทำซ้ำ Duplicate)
              </Link>
              <button 
                className="btn btn-outline" 
                onClick={handleDeletePO}
                style={{ display: 'flex', justifyContent: 'center', color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
              >
                <Trash2 size={16} style={{ marginRight: '0.5rem' }} /> ลบใบสั่งซื้อนี้
              </button>
            </div>

            <div className="status-updater">
              <label className="label">เปลี่ยนสถานะใบสั่งซื้อ</label>
              <select
                className="input-field"
                value={po.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const { error } = await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', po.id);
                  if (!error) {
                    setPo({ ...po, status: newStatus });
                    alert('เปลี่ยนสถานะเรียบร้อยแล้ว');
                  }
                }}
              >
                <option value="draft">ฉบับร่าง (Draft)</option>
                <option value="ordered">สั่งซื้อแล้ว (Ordered)</option>
                <option value="partially_received">รับของบางส่วน (Partially Received)</option>
                <option value="received">รับของครบแล้ว (Received)</option>
                <option value="cancelled">ยกเลิก (Cancelled)</option>
              </select>
            </div>

            <hr style={{ margin: '1rem 0', borderColor: 'rgba(0,0,0,0.08)' }} />

            <div className="info-box" style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: '1.6' }}>
              <p><strong>สร้างเมื่อ:</strong> {new Date(po.created_at).toLocaleString('th-TH')}</p>
              <p><strong>บริษัท:</strong> {po.company_name}</p>
            </div>
          </div>

          {/* Goods Receipts History */}
          <div className="glass-panel side-panel" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>ประวัติการรับสินค้า ({goodsReceipts.length})</h3>
              {po.status !== 'received' && (
                <button className="btn-icon" onClick={() => setShowReceiptModal(true)} title="เพิ่มการรับของ">
                  <Plus size={18} style={{ color: 'var(--primary-color)' }} />
                </button>
              )}
            </div>

            {goodsReceipts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>ยังไม่มีการรับสินค้าเข้าคลัง</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {goodsReceipts.map(gr => (
                  <div key={gr.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--primary-color)' }}>{gr.grn_number}</span>
                      <span>{new Date(gr.received_date).toLocaleDateString('th-TH')}</span>
                    </div>
                    {gr.delivery_note_no && (
                      <div style={{ color: 'var(--text-light)', marginTop: '2px' }}>
                        ใบส่งของ: {gr.delivery_note_no}
                      </div>
                    )}
                    <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#059669' }}>
                      รับเข้า {gr.goods_receipt_items?.reduce((sum: number, i: any) => sum + Number(i.quantity_received), 0)} ชิ้น
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Bills Attached */}
          <div className="glass-panel side-panel" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>บิลเจ้าหนี้ / AP ({supplierBills.length})</h3>
              <button className="btn-icon" onClick={() => setShowBillModal(true)} title="บันทึกบิล">
                <Plus size={18} style={{ color: 'var(--primary-color)' }} />
              </button>
            </div>

            {supplierBills.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>ยังไม่ได้บันทึกบิลจากผู้ขาย</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {supplierBills.map(bill => (
                  <div key={bill.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span>บิล: {bill.bill_number}</span>
                      <span style={{ color: bill.status === 'paid' ? '#059669' : '#d97706' }}>
                        {bill.status === 'paid' ? 'จ่ายแล้ว' : 'รอชำระ'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-light)', marginTop: '2px' }}>
                      ครบกำหนด: {new Date(bill.due_date).toLocaleDateString('th-TH')}
                    </div>
                    <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
                      ฿{Number(bill.net_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '550px' }}>
            <h2>ส่งใบสั่งซื้อทางอีเมล (Email to Supplier)</h2>
            <form onSubmit={handleSendEmail} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="label">ส่งถึง (To Email) *</label>
                <input
                  type="email"
                  className="input-field"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="sales@supplier.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">หัวข้ออีเมล (Subject) *</label>
                <input
                  type="text"
                  className="input-field"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">ข้อความ (Message)</label>
                <textarea
                  className="input-field"
                  rows={6}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                📎 <strong>แนบไฟล์:</strong> {po.po_number}.pdf (สร้างอัตโนมัติ)
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowEmailModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={sendingEmail}>
                  {sendingEmail ? 'กำลังส่งอีเมล...' : 'ส่งอีเมลทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goods Receipt (GRN) Modal */}
      {showReceiptModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '750px' }}>
            <h2>ตรวจรับสินค้าเข้าคลัง (Goods Receipt Note)</h2>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>
              อ้างอิงใบสั่งซื้อ: <strong>{po.po_number}</strong> | ผู้ขาย: {supplier?.name}
            </p>

            <form onSubmit={handleSaveGoodsReceipt}>
              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="label">เลขที่ใบส่งของ / ใบกำกับภาษีของผู้ขาย</label>
                  <input
                    type="text"
                    className="input-field"
                    value={receiptForm.delivery_note_no}
                    onChange={(e) => setReceiptForm({ ...receiptForm, delivery_note_no: e.target.value })}
                    placeholder="เช่น INV-12345, DO-9988"
                  />
                </div>

                <div className="form-group">
                  <label className="label">วันที่ตรวจรับสินค้า</label>
                  <input
                    type="date"
                    className="input-field"
                    value={receiptForm.received_date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, received_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="label">ผู้ตรวจรับสินค้า</label>
                  <input
                    type="text"
                    className="input-field"
                    value={receiptForm.received_by}
                    onChange={(e) => setReceiptForm({ ...receiptForm, received_by: e.target.value })}
                    placeholder={user?.email || 'ชื่อผู้รับของ'}
                  />
                </div>

                <div className="form-group">
                  <label className="label">รับเข้าสต็อกของบริษัท</label>
                  <select
                    className="input-field"
                    value={receiptForm.company_target}
                    onChange={(e) => setReceiptForm({ ...receiptForm, company_target: e.target.value })}
                  >
                    <option value="Shared">กองกลาง (ใช้ร่วมกันได้ทั้ง 2 บริษัท)</option>
                    <option value="SST">เฉพาะ SST</option>
                    <option value="Shinwa Anzen">เฉพาะ Shinwa Anzen</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label className="label">รายการสินค้าและจำนวนที่รับเข้าในรอบนี้:</label>
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th>สินค้า</th>
                        <th style={{ textAlign: 'center' }}>สั่งซื้อ</th>
                        <th style={{ textAlign: 'center' }}>รับแล้วก่อนหน้า</th>
                        <th style={{ textAlign: 'center' }}>คงเหลือค้างรับ</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>จำนวนรับรอบนี้</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const ordered = Number(item.quantity);
                        const prevReceived = Number(item.received_quantity || 0);
                        const remaining = Math.max(0, ordered - prevReceived);

                        return (
                          <tr key={item.id}>
                            <td>
                              <div style={{ fontWeight: '500' }}>{item.products?.name}</div>
                              {item.products?.product_code && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                  รหัส: {item.products.product_code}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>{ordered}</td>
                            <td style={{ textAlign: 'center' }}>{prevReceived}</td>
                            <td style={{ textAlign: 'center', color: remaining > 0 ? '#d97706' : '#059669', fontWeight: 'bold' }}>
                              {remaining}
                            </td>
                            <td>
                              <input
                                type="number"
                                className="input-field"
                                style={{ textAlign: 'center', padding: '0.4rem' }}
                                min={0}
                                max={remaining || 9999}
                                value={receivingItems[item.id] !== undefined ? receivingItems[item.id] : remaining}
                                onChange={(e) => setReceivingItems({
                                  ...receivingItems,
                                  [item.id]: Number(e.target.value)
                                })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">หมายเหตุการตรวจรับ</label>
                <input
                  type="text"
                  className="input-field"
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  placeholder="เช่น กล่องอยู่ในสภาพดี, สินค้าครบตามสเปก"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowReceiptModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={savingReceipt}>
                  {savingReceipt ? 'กำลังบันทึกและเพิ่มสต็อก...' : 'ยืนยันรับสินค้าเข้าคลัง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Supplier Bill (AP) Modal */}
      {showBillModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '600px' }}>
            <h2>บันทึกบิลเจ้าหนี้ / ค่าใช้จ่าย (Supplier Bill)</h2>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>
              อ้างอิง PO: <strong>{po.po_number}</strong> | ผู้ขาย: {supplier?.name}
            </p>

            <form onSubmit={handleSaveSupplierBill}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">เลขที่ใบแจ้งหนี้ / ใบกำกับภาษี *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={billForm.bill_number}
                    onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })}
                    placeholder="เช่น IV-202608001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">วันที่ในบิล (Bill Date) *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={billForm.bill_date}
                    onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="label">เครดิตเทอม (วัน)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={billForm.credit_terms_days}
                    onChange={(e) => setBillForm({ ...billForm, credit_terms_days: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="form-group">
                  <label className="label">ยอดเงินสุทธิที่ต้องจ่าย (Net Payable) *</label>
                  <input
                    type="number"
                    className="input-field"
                    value={billForm.net_amount}
                    onChange={(e) => setBillForm({ ...billForm, net_amount: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">บันทึกเพิ่มเติม</label>
                <input
                  type="text"
                  className="input-field"
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  placeholder="รายละเอียดบิล..."
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBillModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={savingBill}>
                  {savingBill ? 'กำลังบันทึก...' : 'บันทึกบิลเจ้าหนี้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        
        .header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        
        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; }
        .status-draft { background: rgba(100, 116, 139, 0.1); color: #475569; }
        .status-ordered { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
        .status-partial { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .status-received { background: rgba(16, 185, 129, 0.1); color: #059669; }
        .status-cancelled { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

        .content-grid { display: grid; grid-template-columns: 3fr 1fr; gap: 2rem; }
        .document-preview { padding: 2.5rem; background: #ffffff; color: #333333; }
        
        .preview-header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
        .preview-supplier { background: #f8fafc; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; }
        .preview-supplier h3 { font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--primary-color); }
        
        .preview-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        .preview-table th, .preview-table td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }
        .preview-table th { background: var(--primary-color); color: #ffffff; font-weight: 600; font-size: 0.9rem; }
        
        .preview-summary { display: flex; justify-content: space-between; gap: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; }
        .preview-notes { flex: 1; }
        .preview-totals { display: flex; flex-direction: column; gap: 0.5rem; }
        .total-line { display: flex; justify-content: space-between; font-size: 0.95rem; }
        .grand-total { font-weight: bold; font-size: 1.2rem; color: var(--primary-color); }
        
        .side-panel { padding: 1.25rem; }
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
        .modal-content { background: var(--bg-color); width: 100%; border-radius: 12px; padding: 2rem; max-height: 90vh; overflow-y: auto; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
        .table-responsive { overflow-x: auto; width: 100%; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.05); }

        @media (max-width: 992px) {
          .content-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .page-container { padding: 1rem; }
          .document-preview { padding: 1.25rem; }
          .preview-header { flex-direction: column; gap: 1rem; }
          .preview-summary { flex-direction: column; }
          .preview-totals { width: 100% !important; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
