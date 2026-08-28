'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  ArrowLeft, Download, Mail, MessageCircle, Edit, CheckCircle2, Clock, 
  Truck, AlertCircle, Eye, Copy, Trash2, XCircle, Send 
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DeliveryOrderPDF } from '@/components/pdf/DeliveryOrderPDF';

export default function DeliveryOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchDODetails();
    }
  }, [user, id]);

  const fetchDODetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Delivery Order
      const { data: doData, error: doError } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (doError) throw doError;
      setOrder(doData);

      // 2. Fetch Items with Products
      const { data: itemsData, error: itemsError } = await supabase
        .from('delivery_order_items')
        .select('*, products(*)')
        .eq('delivery_order_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // 3. Fetch Customer
      if (doData.customer_id) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', doData.customer_id)
          .single();
        setCustomer(custData);

        if (custData?.email) {
          setEmailTo(custData.email);
        }
      }

      // 4. Fetch Company Profile
      const { data: compData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', doData.company_name)
        .maybeSingle();
      setCompanyProfile(compData);

      // Setup default email text
      setEmailSubject(`[ใบส่งของชั่วคราว] ${doData.do_number} จาก ${doData.company_name}`);
      setEmailMessage(
        `เรียน ${customer?.contact_name || customer?.name || 'ลูกค้าผู้มีอุปการคุณ'}\n\n` +
        `ทางบริษัท ${doData.company_name === 'SST' ? 'เอสเอสที (ประเทศไทย)' : 'ชินวา อันเซ็น'} ได้จัดส่งสินค้าตามใบส่งของชั่วคราวเลขที่ ${doData.do_number} เรียบร้อยแล้ว\n` +
        (doData.project_name ? `โครงการ: ${doData.project_name}\n` : '') +
        (doData.transport_by ? `ขนส่งโดย: ${doData.transport_by}\n` : '') +
        (doData.driver_name ? `พนักงานขับรถ/ทะเบียน: ${doData.driver_name}\n` : '') +
        `\nจึงเรียนมาเพื่อโปรดทราบและดำเนินการตรวจรับสินค้า\n\nขอแสดงความนับถือ\nบริษัท ${doData.company_name === 'SST' ? 'เอสเอสที (ประเทศไทย) จำกัด' : 'ชินวา อันเซ็น จำกัด'}`
      );

    } catch (error: any) {
      console.error('Error loading DO details:', error);
      alert('ไม่พบข้อมูลใบส่งของชั่วคราว หรือเกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="status-badge status-draft"><Clock size={14} /> ฉบับร่าง (Draft)</span>;
      case 'delivering':
        return <span className="status-badge status-ordered"><Truck size={14} /> กำลังจัดส่ง (Delivering)</span>;
      case 'delivered':
        return <span className="status-badge status-received"><CheckCircle2 size={14} /> ส่งมอบสำเร็จ (Delivered)</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled"><XCircle size={14} /> ยกเลิก (Cancelled)</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const handleDelete = async () => {
    if (confirm(`คุณต้องการลบใบส่งของชั่วคราว "${order.do_number}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase
          .from('delivery_orders')
          .delete()
          .eq('id', order.id);

        if (error) throw error;
        alert('ลบใบส่งของชั่วคราวสำเร็จ');
        router.push('/delivery-orders');
      } catch (error: any) {
        console.error('Error deleting delivery order:', error);
        alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <DeliveryOrderPDF 
          order={order} 
          items={items} 
          customer={customer} 
          companyProfile={companyProfile} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${order.do_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    }
  };

  const handleShareLine = () => {
    const text = 
      `📦 [ใบส่งของชั่วคราว] ${order.do_number}\n` +
      `ลูกค้า: ${customer?.name || '-'}\n` +
      (order.project_name ? `โครงการ: ${order.project_name}\n` : '') +
      (order.transport_by ? `ขนส่งโดย: ${order.transport_by}\n` : '') +
      (order.driver_name ? `คนขับ/ทะเบียน: ${order.driver_name}\n` : '') +
      (order.hide_price ? '' : `ยอดรวม: ${Number(order.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n`) +
      `วันที่ส่ง: ${new Date(order.issue_date || order.created_at).toLocaleDateString('th-TH')}`;
    
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
            <h2 style="color: #002266;">ใบส่งของชั่วคราว ${order.do_number}</h2>
            <p><strong>ลูกค้า:</strong> ${customer?.name || '-'}</p>
            ${order.project_name ? `<p><strong>โครงการ:</strong> ${order.project_name}</p>` : ''}
            ${order.transport_by ? `<p><strong>ขนส่งโดย:</strong> ${order.transport_by}</p>` : ''}
            ${order.driver_name ? `<p><strong>พนักงานขับรถ/ทะเบียน:</strong> ${order.driver_name}</p>` : ''}
            <hr style="border: 1px solid #eee; margin: 15px 0;" />
            <pre style="font-family: inherit; white-space: pre-wrap; font-size: 14px;">${emailMessage}</pre>
          </div>`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send email');
      }

      alert('ส่งอีเมลใบส่งของชั่วคราวเรียบร้อยแล้ว!');
      setShowEmailModal(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(`ส่งอีเมลไม่สำเร็จ: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  if (authLoading || loading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!order) return <div className="loading-screen">ไม่พบข้อมูลใบส่งของชั่วคราว</div>;

  return (
    <div className="page-container animate-fade-in" data-company={order.company_name}>
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <Link href="/delivery-orders" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1>ใบส่งของชั่วคราว {order.do_number}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="subtitle">
              ลูกค้า: <strong>{customer?.name}</strong> | วันที่ส่ง: {new Date(order.issue_date || order.created_at).toLocaleDateString('th-TH')}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleDownloadPDF}>
            <Download size={18} style={{ marginRight: '0.5rem' }} /> บันทึก PDF
          </button>

          <button className="btn btn-primary" onClick={() => setShowEmailModal(true)} style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}>
            <Mail size={18} style={{ marginRight: '0.5rem' }} /> ส่งอีเมล
          </button>

          <button className="btn btn-primary" onClick={handleShareLine} style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}>
            <MessageCircle size={18} style={{ marginRight: '0.5rem' }} /> ส่ง LINE
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Left Side: On-screen Document Preview */}
        <div className="main-content">
          <div className="glass-panel document-preview">
            <div className="preview-header">
              <div>
                <h2>{companyProfile?.full_name || (order.company_name === 'SST' ? 'บริษัท เอสเอสที (ประเทศไทย) จำกัด' : 'บริษัท ชินวา อันเซ็น จำกัด')}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '2px' }}>
                  {companyProfile?.address ? `${companyProfile.address} | เลขผู้เสียภาษี: ${companyProfile.tax_id || '-'} | โทร: ${companyProfile.phone || '-'}` : (order.company_name === 'SST' ? 'SST (Thailand) Co., Ltd.' : 'Shinwa Anzen Co., Ltd.')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '1.3rem', color: 'var(--primary-color)' }}>ใบส่งของชั่วคราว (DELIVERY ORDER)</h1>
                <p>เลขที่: <strong>{order.do_number}</strong></p>
                <p>วันที่: {new Date(order.issue_date || order.created_at).toLocaleDateString('th-TH')}</p>
                {order.customer_po_no && <p>PO ลูกค้า: <strong>{order.customer_po_no}</strong></p>}
              </div>
            </div>

            <div className="preview-customer-grid">
              <div className="preview-box">
                <h3>ข้อมูลลูกค้า (Customer)</h3>
                <p><strong>ชื่อ:</strong> {customer?.name}</p>
                <p><strong>ที่อยู่:</strong> {customer?.address || '-'}</p>
                {customer?.tax_id && <p><strong>เลขผู้เสียภาษี:</strong> {customer.tax_id}</p>}
                {customer?.contact_name && <p><strong>ผู้ติดต่อ:</strong> {customer.contact_name} ({customer.phone || '-'})</p>}
              </div>

              <div className="preview-box">
                <h3>รายละเอียดการจัดส่ง (Delivery Details)</h3>
                <p><strong>สถานที่ส่งของ:</strong> {order.delivery_address || customer?.address || '-'}</p>
                <p><strong>จัดส่งโดย:</strong> {order.transport_by || 'รถบริษัท'}</p>
                {(order.driver_name || order.driver_phone) && (
                  <p><strong>พนักงาน / ทะเบียน:</strong> {order.driver_name} {order.driver_phone ? `(${order.driver_phone})` : ''}</p>
                )}
                {order.project_name && <p><strong>โครงการ:</strong> {order.project_name}</p>}
              </div>
            </div>

            {/* Table */}
            <table className="preview-table">
              <thead>
                <tr>
                  <th style={{ width: '6%', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ width: order.hide_price ? '64%' : '44%' }}>รายการสินค้า</th>
                  <th style={{ width: order.hide_price ? '15%' : '12%', textAlign: 'center' }}>จำนวนที่ส่ง</th>
                  <th style={{ width: order.hide_price ? '15%' : '12%', textAlign: 'center' }}>หน่วย</th>
                  {!order.hide_price && (
                    <>
                      <th style={{ width: '13%', textAlign: 'right' }}>ราคา/หน่วย</th>
                      <th style={{ width: '13%', textAlign: 'right' }}>รวมเงิน</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{item.products?.name}</div>
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
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                      {Number(item.quantity || 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                      {item.products?.unit || 'ชิ้น'}
                    </td>
                    {!order.hide_price && (
                      <>
                        <td style={{ textAlign: 'right' }}>
                          {Number(item.unit_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {Number(item.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom Summary */}
            <div className="preview-bottom">
              <div className="preview-notes" style={{ flex: 1 }}>
                <h4>ข้อกำหนดและหมายเหตุ:</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{order.notes || '-'}</p>
              </div>

              {!order.hide_price && (
                <div className="preview-totals" style={{ width: '280px' }}>
                  {(() => {
                    const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
                    const discountAmount = (subtotal * (order.global_discount_percent || 0)) / 100;
                    const afterDiscount = subtotal - discountAmount;
                    const vatAmount = order.has_vat ? afterDiscount * 0.07 : 0;
                    const grandTotal = afterDiscount + vatAmount;

                    return (
                      <div style={{ width: '100%' }}>
                        <div className="total-line">
                          <span>รวมเป็นเงิน:</span>
                          <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="total-line" style={{ color: 'var(--error-color)' }}>
                            <span>ส่วนลด {order.global_discount_percent}%:</span>
                            <span>- {discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                          </div>
                        )}
                        {order.has_vat && (
                          <div className="total-line">
                            <span>VAT 7%:</span>
                            <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                          </div>
                        )}
                        <div className="total-line" style={{ borderTop: '2px solid var(--primary-color)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                          <span>ยอดรวมทั้งสิ้น:</span>
                          <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Actions & Status Management */}
        <div className="sidebar-actions">
          <div className="glass-panel side-panel">
            <h3>จัดการใบส่งของชั่วคราว</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
              <Link href={`/delivery-orders/${id}/edit`} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center' }}>
                <Edit size={16} style={{ marginRight: '0.5rem' }} /> แก้ไขข้อมูลใบส่งของ
              </Link>
              <Link href={`/delivery-orders/new?cloneId=${id}`} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center' }}>
                <Copy size={16} style={{ marginRight: '0.5rem' }} /> คัดลอก (ทำซ้ำ Duplicate)
              </Link>
              <button 
                className="btn btn-outline" 
                onClick={handleDelete}
                style={{ display: 'flex', justifyContent: 'center', color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
              >
                <Trash2 size={16} style={{ marginRight: '0.5rem' }} /> ลบใบส่งของนี้
              </button>
            </div>

            <div className="status-updater">
              <label className="label">เปลี่ยนสถานะการส่งมอบ</label>
              <select
                className="input-field"
                value={order.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const { error } = await supabase.from('delivery_orders').update({ status: newStatus }).eq('id', order.id);
                  if (!error) {
                    setOrder({ ...order, status: newStatus });
                    alert('เปลี่ยนสถานะเรียบร้อยแล้ว');
                  }
                }}
              >
                <option value="draft">ฉบับร่าง (Draft)</option>
                <option value="delivering">กำลังจัดส่ง (Delivering)</option>
                <option value="delivered">ส่งมอบสำเร็จ/เซ็นรับแล้ว (Delivered)</option>
                <option value="cancelled">ยกเลิก (Cancelled)</option>
              </select>
            </div>

            <hr style={{ margin: '1rem 0', borderColor: 'rgba(0,0,0,0.08)' }} />

            <div className="info-box" style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: '1.6' }}>
              <p><strong>สร้างเมื่อ:</strong> {new Date(order.created_at).toLocaleString('th-TH')}</p>
              <p><strong>บริษัท:</strong> {order.company_name}</p>
              {order.quotation_id && <p><strong>อ้างอิงใบเสนอราคา:</strong> มี</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-backdrop">
          <div className="glass-panel modal-card animate-scale-up">
            <h2>ส่งอีเมลใบส่งของชั่วคราว</h2>
            <form onSubmit={handleSendEmail}>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">อีเมลผู้รับ (Customer Email) *</label>
                <input
                  type="email"
                  className="input-field"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="label">หัวข้ออีเมล (Subject) *</label>
                <input
                  type="text"
                  className="input-field"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="label">ข้อความ (Message)</label>
                <textarea
                  className="input-field"
                  rows={6}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEmailModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={sendingEmail}>
                  <Send size={16} style={{ marginRight: '0.4rem' }} />
                  {sendingEmail ? 'กำลังส่ง...' : 'ส่งอีเมล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .subtitle {
          color: var(--text-light);
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1.5rem;
        }

        @media (max-width: 992px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        .document-preview {
          padding: 2.5rem;
          background: #ffffff;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }

        .preview-customer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 700px) {
          .preview-customer-grid {
            grid-template-columns: 1fr;
          }
        }

        .preview-box {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .preview-box h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 0.25rem;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
        }

        .preview-table th {
          background: var(--primary-color);
          color: #ffffff;
          padding: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: left;
        }

        .preview-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.9rem;
        }

        .preview-bottom {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          margin-top: 1rem;
        }

        .preview-notes h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
        }

        .preview-notes p {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.5;
        }

        .preview-totals {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .total-line {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
          font-size: 0.9rem;
        }

        .side-panel {
          padding: 1.25rem;
        }

        .side-panel h3 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
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

        .status-draft { background: rgba(100, 116, 139, 0.1); color: #64748b; }
        .status-ordered { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
        .status-received { background: rgba(16, 185, 129, 0.1); color: #059669; }
        .status-cancelled { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 50px 1rem;
          z-index: 999;
          overflow-y: auto;
        }

        .modal-card {
          width: 100%;
          max-width: 550px;
          padding: 1.75rem;
          background: #ffffff;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
