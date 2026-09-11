'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  ArrowLeft, Download, Mail, MessageCircle, Edit, CheckCircle2, Clock, 
  AlertCircle, Copy, Trash2, XCircle, RefreshCw, Printer, Calendar, User, Package
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { BorrowSlipPDF } from '@/components/pdf/BorrowSlipPDF';

export default function BorrowSlipDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();

  const [slip, setSlip] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItemsInput, setReturnItemsInput] = useState<{ [key: string]: { qty: number; notes: string } }>({});
  const [returnNotes, setReturnNotes] = useState('');
  const [savingReturn, setSavingReturn] = useState(false);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchSlipDetails();
    }
  }, [user, id]);

  const fetchSlipDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Borrow Slip
      const { data: slipData, error: slipError } = await supabase
        .from('borrow_slips')
        .select('*')
        .eq('id', id)
        .single();

      if (slipError) throw slipError;
      setSlip(slipData);

      // 2. Fetch Items with Products
      const { data: itemsData, error: itemsError } = await supabase
        .from('borrow_slip_items')
        .select('*, products(*)')
        .eq('borrow_slip_id', id);

      if (itemsError) throw itemsError;
      const loadedItems = itemsData || [];
      setItems(loadedItems);

      // Initialize return modal inputs
      const initialReturnInput: { [key: string]: { qty: number; notes: string } } = {};
      loadedItems.forEach(it => {
        const remaining = Math.max(0, Number(it.quantity) - Number(it.returned_quantity || 0));
        initialReturnInput[it.id] = {
          qty: remaining, // default return all remaining
          notes: it.condition_notes || 'สภาพปกติ'
        };
      });
      setReturnItemsInput(initialReturnInput);

      // 3. Fetch Customer if linked
      if (slipData.customer_id) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', slipData.customer_id)
          .single();
        setCustomer(custData);
      }

      // 4. Fetch Company Profile
      const { data: compData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', slipData.company_name)
        .maybeSingle();
      setCompanyProfile(compData);

      // Setup default email text
      setEmailTo(slipData.borrower_email || customer?.email || '');
      setEmailSubject(`[ใบยืมสินค้า] ${slipData.borrow_number} จาก ${slipData.company_name}`);
      setEmailMessage(
        `เรียน ${slipData.contact_person || slipData.borrower_name}\n\n` +
        `ทางบริษัท ${slipData.company_name === 'SST' ? 'เอสเอสที (ประเทศไทย)' : 'ชินวา อันเซ็น'} ได้จัดทำใบยืมสินค้าเลขที่ ${slipData.borrow_number} เรียบร้อยแล้ว\n` +
        `วันที่ยืม: ${new Date(slipData.borrow_date || slipData.created_at).toLocaleDateString('th-TH')}\n` +
        `กำหนดส่งคืน: ${slipData.expected_return_date ? new Date(slipData.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}\n` +
        `วัตถุประสงค์: ${slipData.purpose || 'ยืมใช้งาน'}\n\n` +
        `กรุณาตรวจสอบรายการสินค้าและกำหนดเวลาส่งคืนตามเอกสารแนบ\n\n` +
        `ขอแสดงความนับถือ\nบริษัท ${slipData.company_name === 'SST' ? 'เอสเอสที (ประเทศไทย) จำกัด' : 'ชินวา อันเซ็น จำกัด'}`
      );

    } catch (error: any) {
      console.error('Error loading borrow slip details:', error);
      alert('ไม่พบข้อมูลใบยืมสินค้า หรือเกิดข้อผิดพลาด: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (expectedDate?: string, status?: string) => {
    if (!expectedDate || status === 'returned' || status === 'cancelled') return false;
    const exp = new Date(expectedDate);
    exp.setHours(23, 59, 59, 999);
    return exp < new Date();
  };

  const getStatusBadge = (status: string) => {
    if (isOverdue(slip?.expected_return_date, status)) {
      return (
        <span className="status-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>
          <AlertCircle size={14} /> เกินกำหนดคืน (Overdue)
        </span>
      );
    }

    switch (status) {
      case 'draft':
        return <span className="status-badge status-draft"><Clock size={14} /> ฉบับร่าง (Draft)</span>;
      case 'borrowed':
        return (
          <span className="status-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
            <Clock size={14} /> อยู่ระหว่างยืม (Borrowed)
          </span>
        );
      case 'partially_returned':
        return (
          <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
            <RefreshCw size={14} /> คืนบางส่วน (Partially Returned)
          </span>
        );
      case 'returned':
        return <span className="status-badge status-received"><CheckCircle2 size={14} /> คืนครบแล้ว (Returned)</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled"><XCircle size={14} /> ยกเลิก (Cancelled)</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'returned') {
        updateData.actual_return_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('borrow_slips')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      setSlip((prev: any) => ({ ...prev, ...updateData }));
      alert(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ${err.message}`);
    }
  };

  const handleSaveReturn = async () => {
    setSavingReturn(true);
    try {
      let totalBorrowQty = 0;
      let totalReturnedQty = 0;

      // Update each item in Supabase
      for (const item of items) {
        const input = returnItemsInput[item.id];
        const newReturned = Math.min(
          Number(item.quantity),
          Number(item.returned_quantity || 0) + (Number(input?.qty) || 0)
        );

        totalBorrowQty += Number(item.quantity);
        totalReturnedQty += newReturned;

        const itemStatus = newReturned >= Number(item.quantity) ? 'returned' : 'borrowed';

        const { error: itemErr } = await supabase
          .from('borrow_slip_items')
          .update({
            returned_quantity: newReturned,
            condition_notes: input?.notes || item.condition_notes,
            item_status: itemStatus
          })
          .eq('id', item.id);

        if (itemErr) throw itemErr;
      }

      // Determine slip status
      let newSlipStatus = 'borrowed';
      let actualReturnDate: string | null = null;
      if (totalReturnedQty >= totalBorrowQty) {
        newSlipStatus = 'returned';
        actualReturnDate = returnDate;
      } else if (totalReturnedQty > 0) {
        newSlipStatus = 'partially_returned';
      }

      // Append return log to notes if provided
      let updatedNotes = slip.notes || '';
      if (returnNotes.trim()) {
        const logEntry = `\n[บันทึกรับคืนวันที่ ${new Date(returnDate).toLocaleDateString('th-TH')}]: ${returnNotes.trim()}`;
        updatedNotes += logEntry;
      }

      const { error: slipErr } = await supabase
        .from('borrow_slips')
        .update({
          status: newSlipStatus,
          actual_return_date: actualReturnDate || slip.actual_return_date,
          notes: updatedNotes
        })
        .eq('id', id);

      if (slipErr) throw slipErr;

      alert('บันทึกการรับคืนสินค้าเรียบร้อยแล้ว');
      setShowReturnModal(false);
      fetchSlipDetails();
    } catch (err: any) {
      console.error('Error saving return:', err);
      alert(`เกิดข้อผิดพลาดในการบันทึกรับคืน: ${err.message}`);
    } finally {
      setSavingReturn(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <BorrowSlipPDF 
          slip={slip} 
          items={items} 
          companyProfile={companyProfile} 
        />
      ).toBlob();
      
      const { savePdfBlob } = await import('@/lib/fileSave');
      await savePdfBlob(blob, `${slip.borrow_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    }
  };

  const handleShareLine = () => {
    const text = 
      `📋 [ใบยืมสินค้า] ${slip.borrow_number}\n` +
      `ผู้ยืม: ${slip.borrower_name}\n` +
      `วันที่ยืม: ${new Date(slip.borrow_date || slip.created_at).toLocaleDateString('th-TH')}\n` +
      `กำหนดคืน: ${slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}\n` +
      `วัตถุประสงค์: ${slip.purpose || '-'}\n` +
      (slip.project_name ? `โครงการ: ${slip.project_name}\n` : '') +
      `สถานะ: ${slip.status === 'returned' ? 'คืนครบแล้ว' : 'อยู่ระหว่างยืม'}`;
    
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo) {
      alert('กรุณาระบุอีเมลผู้รับ');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          text: emailMessage,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #002266;">ใบยืมสินค้า ${slip.borrow_number}</h2>
            <p><strong>ผู้ยืม:</strong> ${slip.borrower_name}</p>
            <p><strong>วันที่ยืม:</strong> ${new Date(slip.borrow_date || slip.created_at).toLocaleDateString('th-TH')}</p>
            <p><strong>กำหนดส่งคืน:</strong> ${slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}</p>
            ${slip.project_name ? `<p><strong>โครงการ:</strong> ${slip.project_name}</p>` : ''}
            <hr style="border: 1px solid #eee; margin: 15px 0;" />
            <pre style="font-family: inherit; white-space: pre-wrap; font-size: 14px;">${emailMessage}</pre>
          </div>`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send email');
      }

      alert('ส่งอีเมลเรียบร้อยแล้ว');
      setShowEmailModal(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(`ไม่สามารถส่งอีเมลได้: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`คุณต้องการลบใบยืมสินค้า "${slip.borrow_number}" ใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`)) {
      try {
        const { error } = await supabase
          .from('borrow_slips')
          .delete()
          .eq('id', slip.id);

        if (error) throw error;
        alert('ลบใบยืมสินค้าสำเร็จ');
        router.push('/borrow-slips');
      } catch (error: any) {
        console.error('Error deleting borrow slip:', error);
        alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    }
  };

  if (authLoading || loading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!user || !slip) return null;

  const totalBorrowQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalReturnedQty = items.reduce((sum, item) => sum + (Number(item.returned_quantity) || 0), 0);
  const remainingQty = totalBorrowQty - totalReturnedQty;
  const totalEstimatedValue = items.reduce((sum, item) => sum + (Number(item.total) || (Number(item.quantity) * Number(item.unit_price)) || 0), 0);

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      {/* Top Header */}
      <header className="page-header">
        <div className="header-left">
          <Link href="/borrow-slips" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1>ใบยืมสินค้า: {slip.borrow_number}</h1>
              {getStatusBadge(slip.status)}
            </div>
            <p className="subtitle">
              ผู้ยืม: <strong>{slip.borrower_name}</strong> | กำหนดส่งคืน: {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            style={{ borderColor: '#0284c7', color: '#0284c7', background: '#f0f9ff' }}
            onClick={() => setShowReturnModal(true)}
          >
            <CheckCircle2 size={16} style={{ marginRight: '0.4rem' }} /> บันทึกรับคืนสินค้า
          </button>
          <button className="btn btn-outline" onClick={handleDownloadPDF}>
            <Download size={16} style={{ marginRight: '0.4rem' }} /> ดาวน์โหลด PDF
          </button>
          <button className="btn btn-outline" onClick={handleShareLine} style={{ borderColor: '#06c755', color: '#06c755' }}>
            <MessageCircle size={16} style={{ marginRight: '0.4rem' }} /> แชร์ LINE
          </button>
          <button className="btn btn-outline" onClick={() => setShowEmailModal(true)}>
            <Mail size={16} style={{ marginRight: '0.4rem' }} /> ส่งอีเมล
          </button>
          <Link href={`/borrow-slips/${id}/edit`} className="btn btn-primary">
            <Edit size={16} style={{ marginRight: '0.4rem' }} /> แก้ไขเอกสาร
          </Link>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="preview-container">
        
        {/* Document Paper Preview */}
        <div className="glass-panel document-preview" style={{ flex: 1 }}>
          <div className="document-paper">
            
            {/* Header: Company & Title */}
            <div className="preview-header">
              <div className="company-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img 
                  src={company === 'SST' ? '/sst-logo.jpg' : '/shinwa-logo.jpg'} 
                  alt={company} 
                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                />
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: '#002266', margin: 0, fontWeight: 'bold' }}>
                    {companyProfile?.full_name || (company === 'SST' ? 'บริษัท เอสเอสที (ประเทศไทย) จำกัด' : 'บริษัท ชินวา อันเซ็น จำกัด')}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px', fontWeight: 'bold' }}>
                    {company === 'SST' ? 'SST (Thailand) Co., Ltd.' : 'Shinwa Anzen Co., Ltd.'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.3 }}>
                    {companyProfile?.address || ''}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    {[
                      companyProfile?.tax_id ? `เลขผู้เสียภาษี: ${companyProfile.tax_id}` : null,
                      companyProfile?.phone ? `โทร: ${companyProfile.phone}` : null
                    ].filter(Boolean).join(' | ')}
                  </p>
                </div>
              </div>

              <div className="document-info" style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '1.6rem', color: '#002266', margin: 0, fontWeight: 'bold' }}>ใบยืมสินค้า</h1>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>GOODS LOAN / BORROW SLIP</p>
                <p style={{ margin: '2px 0', fontSize: '0.9rem' }}>เลขที่: <strong style={{ color: '#002266' }}>{slip.borrow_number}</strong></p>
                <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#475569' }}>
                  วันที่ยืม: <strong>{slip.borrow_date ? new Date(slip.borrow_date).toLocaleDateString('th-TH') : new Date(slip.created_at).toLocaleDateString('th-TH')}</strong>
                </p>
                <p style={{ margin: '2px 0', fontSize: '0.85rem', color: isOverdue(slip.expected_return_date, slip.status) ? '#dc2626' : '#475569' }}>
                  กำหนดส่งคืน: <strong style={{ color: isOverdue(slip.expected_return_date, slip.status) ? '#dc2626' : '#002266' }}>
                    {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'}
                  </strong>
                </p>
                {slip.actual_return_date && (
                  <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#16a34a' }}>
                    ส่งคืนจริง: <strong>{new Date(slip.actual_return_date).toLocaleDateString('th-TH')}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Status Summary Banner */}
            {slip.status === 'returned' ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: '#ecfdf5', border: '1.5px solid #a7f3d0',
                color: '#065f46', padding: '0.85rem 1.25rem', borderRadius: '8px',
                marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: 600
              }}>
                <CheckCircle2 size={20} color="#059669" />
                <span>สินค้าส่งคืนครบถ้วนแล้ว {slip.actual_return_date ? `(เมื่อวันที่ ${new Date(slip.actual_return_date).toLocaleDateString('th-TH')})` : ''}</span>
              </div>
            ) : isOverdue(slip.expected_return_date, slip.status) ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: '#fef2f2', border: '1.5px solid #fecaca',
                color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: '8px',
                marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: 600
              }}>
                <AlertCircle size={20} color="#dc2626" />
                <span>⚠️ เกินกำหนดส่งคืน! (กำหนดคืน: {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : '-'}) กรุณาติดตามการส่งคืน</span>
              </div>
            ) : slip.status === 'partially_returned' ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: '#fffbeb', border: '1.5px solid #fde68a',
                color: '#92400e', padding: '0.85rem 1.25rem', borderRadius: '8px',
                marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: 600
              }}>
                <RefreshCw size={20} color="#d97706" />
                <span>ส่งคืนแล้วบางส่วน ({totalReturnedQty} จาก {totalBorrowQty} ชิ้น) — ยังคงค้างคืนอีก {remainingQty} ชิ้น</span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: '#eff6ff', border: '1.5px solid #bfdbfe',
                color: '#1e40af', padding: '0.85rem 1.25rem', borderRadius: '8px',
                marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: 600
              }}>
                <Clock size={20} color="#2563eb" />
                <span>อยู่ระหว่างการยืมสินค้า (กำหนดส่งคืน: {slip.expected_return_date ? new Date(slip.expected_return_date).toLocaleDateString('th-TH') : 'ตามตกลง'})</span>
              </div>
            )}

            {/* Borrower & Loan Details Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#002266', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.4rem', marginBottom: '0.6rem', fontWeight: 700 }}>
                  ข้อมูลผู้ยืม (BORROWER INFORMATION)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <p style={{ margin: 0 }}><strong>ชื่อผู้ยืม / หน่วยงาน:</strong> {slip.borrower_name}</p>
                  {slip.borrower_address && <p style={{ margin: 0 }}><strong>ที่อยู่ / สถานที่:</strong> {slip.borrower_address}</p>}
                  <p style={{ margin: 0 }}><strong>ผู้ติดต่อ / ผู้รับมอบ:</strong> {slip.contact_person || '-'}</p>
                  <p style={{ margin: 0 }}><strong>เบอร์โทรศัพท์:</strong> {slip.borrower_phone || '-'}</p>
                  {slip.borrower_email && <p style={{ margin: 0 }}><strong>อีเมล:</strong> {slip.borrower_email}</p>}
                </div>
              </div>

              <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#002266', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.4rem', marginBottom: '0.6rem', fontWeight: 700 }}>
                  รายละเอียดการยืม (LOAN DETAILS)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <p style={{ margin: 0 }}>
                    <strong>วัตถุประสงค์:</strong> {' '}
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem' }}>
                      {slip.purpose || 'ยืมใช้งานชั่วคราว'}
                    </span>
                  </p>
                  {slip.project_name && <p style={{ margin: 0 }}><strong>โปรเจกต์:</strong> {slip.project_name}</p>}
                  {slip.location && <p style={{ margin: 0 }}><strong>สถานที่นำไปใช้:</strong> {slip.location}</p>}
                  <p style={{ margin: 0 }}>
                    <strong>สถานะส่งคืน:</strong> {' '}
                    <span style={{ fontWeight: 'bold', color: slip.status === 'returned' ? '#16a34a' : remainingQty > 0 ? '#ea580c' : 'inherit' }}>
                      {slip.status === 'returned' ? '✓ คืนครบถ้วนแล้ว' : `ยังค้างคืนอีก ${remainingQty} ชิ้น`}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <table className="preview-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }}>ลำดับ</th>
                  <th style={{ width: '36%', textAlign: 'left', paddingLeft: '1rem' }}>รายการสินค้า</th>
                  <th style={{ width: '18%' }}>Serial Number (S/N)</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>จำนวนที่ยืม</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>สถานะส่งคืน</th>
                  <th style={{ width: '14%', textAlign: 'right', paddingRight: '1rem' }}>มูลค่าประเมิน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const rem = Math.max(0, Number(item.quantity) - Number(item.returned_quantity || 0));
                  const ret = Number(item.returned_quantity || 0);
                  const isFullyReturned = rem === 0;

                  return (
                    <tr key={index} style={{ backgroundColor: isFullyReturned ? '#f0fdf4' : 'inherit' }}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ paddingLeft: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.products?.name || item.product_name || 'สินค้า'}</div>
                        {item.description && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{item.description}</div>
                        )}
                        {item.condition_notes && (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '3px' }}>
                            สภาพ: <em>{item.condition_notes}</em>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {item.serial_number ? (
                          <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            {item.serial_number}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {item.quantity} {item.products?.unit || 'ชิ้น'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isFullyReturned ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.75rem',
                            fontWeight: 'bold', padding: '0.25rem 0.55rem', borderRadius: '12px'
                          }}>
                            <CheckCircle2 size={13} /> คืนครบแล้ว
                          </span>
                        ) : ret > 0 ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.75rem',
                            fontWeight: 'bold', padding: '0.25rem 0.55rem', borderRadius: '12px'
                          }}>
                            คืนแล้ว {ret} / ค้าง {rem}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem',
                            fontWeight: 'bold', padding: '0.25rem 0.55rem', borderRadius: '12px'
                          }}>
                            ค้างส่งคืน {rem} ชิ้น
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: 500 }}>
                        {Number(item.total || (item.quantity * item.unit_price)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary & Signatures */}
            <div className="preview-summary" style={{ marginTop: '1.5rem' }}>
              <div className="preview-notes" style={{ flex: 1.2 }}>
                <strong style={{ color: '#002266' }}>เงื่อนไข & ข้อกำหนดการยืมสินค้า:</strong>
                <p style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  {slip.notes || '-'}
                </p>
              </div>

              <div className="preview-totals" style={{ width: '320px' }}>
                <div style={{ width: '100%' }}>
                  <div className="total-line">
                    <span>จำนวนชิ้นที่ยืมรวม:</span>
                    <span style={{ fontWeight: 'bold' }}>{totalBorrowQty} ชิ้น</span>
                  </div>
                  <div className="total-line" style={{ color: '#16a34a' }}>
                    <span>ส่งคืนแล้ว:</span>
                    <span style={{ fontWeight: 'bold' }}>{totalReturnedQty} ชิ้น</span>
                  </div>
                  <div className="total-line" style={{ color: remainingQty > 0 ? '#ea580c' : '#16a34a' }}>
                    <span>คงค้างส่งคืน:</span>
                    <span style={{ fontWeight: 'bold' }}>{remainingQty} ชิ้น</span>
                  </div>
                  {Number(slip.deposit_amount) > 0 && (
                    <div className="total-line" style={{ color: '#059669' }}>
                      <span>เงินมัดจำ:</span>
                      <span>{Number(slip.deposit_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                  )}
                  <div className="total-line" style={{ borderTop: '2px solid #002266', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>มูลค่าประเมินรวม:</span>
                    <span className="grand-total">{totalEstimatedValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Signature Blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.85rem', margin: '0 0 2.5rem 0', color: '#002266' }}>ผู้ยืมสินค้า (Borrower)</p>
                <p style={{ margin: '0', borderTop: '1px solid #94a3b8', paddingTop: '0.4rem', fontSize: '0.8rem' }}>
                  ( {slip.borrower_name} )
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>วันที่: ...... / ...... / ..........</p>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.85rem', margin: '0 0 2.5rem 0', color: '#002266' }}>ผู้ส่งมอบ / ผู้อนุมัติ</p>
                <p style={{ margin: '0', borderTop: '1px solid #94a3b8', paddingTop: '0.4rem', fontSize: '0.8rem' }}>
                  ( .................................................... )
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>วันที่: ...... / ...... / ..........</p>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.85rem', margin: '0 0 2.5rem 0', color: '#002266' }}>ผู้ตรวจสอบรับคืน</p>
                <p style={{ margin: '0', borderTop: '1px solid #94a3b8', paddingTop: '0.4rem', fontSize: '0.8rem' }}>
                  ( .................................................... )
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  วันที่รับคืน: {slip.actual_return_date ? new Date(slip.actual_return_date).toLocaleDateString('th-TH') : '...... / ...... / ..........'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Sidebar Actions & Status */}
        <div className="sidebar-actions" style={{ width: '280px' }}>
          
          {/* Status Updater Card */}
          <div className="glass-panel side-panel" style={{ marginBottom: '1rem' }}>
            <h3>เปลี่ยนสถานะเอกสาร</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
              คลิกเพื่อปรับสถานะได้ทันที:
            </p>
            <div className="status-button-grid">
              {[
                { id: 'borrowed', label: 'อยู่ระหว่างยืม', icon: Clock, color: '#0369a1', bg: '#e0f2fe' },
                { id: 'partially_returned', label: 'คืนบางส่วน', icon: RefreshCw, color: '#92400e', bg: '#fef3c7' },
                { id: 'returned', label: 'คืนครบแล้ว', icon: CheckCircle2, color: '#15803d', bg: '#dcfce7' },
                { id: 'draft', label: 'ฉบับร่าง', icon: Clock, color: '#475569', bg: '#f1f5f9' },
                { id: 'cancelled', label: 'ยกเลิก', icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
              ].map(st => {
                const Icon = st.icon;
                const isActive = slip.status === st.id;
                return (
                  <button
                    key={st.id}
                    className={`status-pill-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleUpdateStatus(st.id)}
                    style={{
                      borderColor: isActive ? st.color : '#e2e8f0',
                      backgroundColor: isActive ? st.bg : '#ffffff',
                      color: isActive ? st.color : '#334155',
                      fontWeight: isActive ? 700 : 500
                    }}
                  >
                    <Icon size={15} style={{ color: st.color }} />
                    <span>{st.label}</span>
                    {isActive && <CheckCircle2 size={14} style={{ marginLeft: 'auto', color: st.color }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-panel side-panel">
            <h3>จัดการเอกสาร</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ justifyContent: 'center' }}
                onClick={() => setShowReturnModal(true)}
              >
                <CheckCircle2 size={16} style={{ marginRight: '0.5rem' }} /> บันทึกรับคืนสินค้า
              </button>
              <button className="btn btn-outline" onClick={handleDownloadPDF} style={{ justifyContent: 'center' }}>
                <Download size={16} style={{ marginRight: '0.5rem' }} /> ดาวน์โหลด PDF
              </button>
              <Link href={`/borrow-slips/${id}/edit`} className="btn btn-outline" style={{ justifyContent: 'center' }}>
                <Edit size={16} style={{ marginRight: '0.5rem' }} /> แก้ไขใบยืมสินค้า
              </Link>
              <Link href={`/borrow-slips/new?cloneId=${id}`} className="btn btn-outline" style={{ justifyContent: 'center' }}>
                <Copy size={16} style={{ marginRight: '0.5rem' }} /> คัดลอก (ทำซ้ำใบใหม่)
              </Link>
              <button 
                className="btn btn-outline delete-btn" 
                onClick={handleDelete}
                style={{ justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444', marginTop: '0.5rem' }}
              >
                <Trash2 size={16} style={{ marginRight: '0.5rem' }} /> ลบใบยืมสินค้านี้
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Return Tracking Modal */}
      {showReturnModal && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div className="modal-content glass-panel" style={{
            background: '#ffffff', borderRadius: '12px', padding: '1.5rem',
            width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#002266' }}>
              📦 บันทึกการรับคืนสินค้า
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              เลขที่ใบยืม: <strong>{slip.borrow_number}</strong> | ผู้ยืม: <strong>{slip.borrower_name}</strong>
            </p>

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="label">วันที่รับคืนสินค้า <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="date"
                className="input-field"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ marginBottom: '0.5rem' }}>ระบุจำนวนที่รับคืนในครั้งนี้:</label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>สินค้า / S/N</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center', width: '80px' }}>ยืม</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center', width: '80px' }}>คืนแล้ว</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center', width: '100px' }}>รับคืนครั้งนี้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const rem = Math.max(0, Number(it.quantity) - Number(it.returned_quantity || 0));
                      const cur = returnItemsInput[it.id]?.qty ?? rem;
                      return (
                        <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem' }}>
                            <div style={{ fontWeight: 500 }}>{it.products?.name || it.product_name}</div>
                            {it.serial_number && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>S/N: {it.serial_number}</div>}
                            <input 
                              type="text"
                              className="input-field"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginTop: '4px' }}
                              placeholder="สภาพเมื่อส่งคืน เช่น ปกติ, มีรอย"
                              value={returnItemsInput[it.id]?.notes || ''}
                              onChange={(e) => {
                                setReturnItemsInput({
                                  ...returnItemsInput,
                                  [it.id]: {
                                    qty: cur,
                                    notes: e.target.value
                                  }
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>{it.quantity}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center', color: '#16a34a' }}>{it.returned_quantity || 0}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <input 
                              type="number"
                              min={0}
                              max={rem}
                              className="input-field"
                              style={{ width: '70px', textAlign: 'center', padding: '0.35rem' }}
                              value={cur}
                              onChange={(e) => {
                                const val = Math.min(rem, Math.max(0, parseInt(e.target.value, 10) || 0));
                                setReturnItemsInput({
                                  ...returnItemsInput,
                                  [it.id]: {
                                    qty: val,
                                    notes: returnItemsInput[it.id]?.notes || ''
                                  }
                                });
                              }}
                            />
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>ค้างคืน: {rem}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="label">บันทึกเพิ่มเติมการรับคืน (ถ้ามี)</label>
              <textarea 
                className="input-field"
                rows={2}
                placeholder="เช่น ตรวจสอบอุปกรณ์ครบถ้วนตามรายการ เปิดติดใช้งานได้ปกติ..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => setShowReturnModal(false)}
                disabled={savingReturn}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveReturn}
                disabled={savingReturn}
              >
                {savingReturn ? 'กำลังบันทึก...' : 'ยืนยันบันทึกรับคืน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div className="modal-content glass-panel" style={{
            background: '#ffffff', borderRadius: '12px', padding: '1.5rem',
            width: '100%', maxWidth: '520px'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#002266' }}>
              ✉️ ส่งใบยืมสินค้าทางอีเมล
            </h2>
            <form onSubmit={handleSendEmail}>
              <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                <label className="label">อีเมลผู้รับ</label>
                <input 
                  type="email" 
                  className="input-field" 
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                <label className="label">หัวข้ออีเมล</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label className="label">ข้อความ</label>
                <textarea 
                  className="input-field" 
                  rows={5}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? 'กำลังส่ง...' : 'ส่งอีเมล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 1.5rem 2rem;
          max-width: 1300px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .preview-container {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        @media (max-width: 1024px) {
          .preview-container {
            flex-direction: column;
          }
          .sidebar-actions {
            width: 100% !important;
          }
        }

        .document-preview {
          flex: 1;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
          padding: 2.5rem 3rem;
          color: #1e293b;
          font-family: 'Sarabun', sans-serif;
        }

        .document-paper {
          max-width: 860px;
          margin: 0 auto;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #002266;
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.75rem;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .preview-table th {
          background-color: #002266;
          color: #ffffff;
          padding: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .preview-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
        }

        .preview-table tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .preview-table tr:hover {
          background-color: #f1f5f9;
        }

        .preview-summary {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        @media (max-width: 768px) {
          .preview-summary {
            flex-direction: column;
          }
          .preview-totals {
            width: 100% !important;
          }
          .document-preview {
            padding: 1.5rem;
          }
        }

        .preview-notes {
          flex: 1.2;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .preview-totals {
          width: 320px;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .total-line {
          display: flex;
          justify-content: space-between;
          padding: 0.35rem 0;
          font-size: 0.9rem;
        }

        .grand-total {
          font-size: 1.25rem;
          font-weight: bold;
          color: #002266;
        }

        .side-panel {
          padding: 1.25rem;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .side-panel h3 {
          font-size: 0.95rem;
          font-weight: bold;
          margin-bottom: 0.75rem;
          color: #002266;
        }

        .status-button-grid {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .status-pill-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          width: 100%;
          font-family: inherit;
        }

        .status-pill-btn:hover {
          transform: translateX(2px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
