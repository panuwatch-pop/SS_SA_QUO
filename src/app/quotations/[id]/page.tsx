'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { ArrowLeft, Download, Send, Printer, FileText, CheckCircle, XCircle, Search, MessageCircle, Mail, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { QuotationPDF } from '@/components/pdf/QuotationPDF';
import CatalogPDF from '@/components/pdf/CatalogPDF';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { company } = useCompany();

  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Catalog Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogDate, setCatalogDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [catalogProject, setCatalogProject] = useState('');
  const [isGeneratingCatalog, setIsGeneratingCatalog] = useState(false);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });

  useEffect(() => {
    if (user && id) {
      fetchQuotationDetails();
    }
  }, [user, id]);

  const fetchQuotationDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Quotation
      const { data: qData, error: qError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (qError) throw qError;
      setQuotation(qData);
      if (qData.project_name) setCatalogProject(qData.project_name);

      // 2. Fetch Customer
      if (qData.customer_id) {
        const { data: cData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', qData.customer_id)
          .single();
        if (cData) setCustomer(cData);
      }

      // 3. Fetch Company Profile
      if (qData.company_name) {
        const { data: compData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', qData.company_name)
          .single();
        if (compData) setCompanyProfile(compData);
      }

      // 4. Fetch Items
      const { data: iData, error: iError } = await supabase
        .from('quotation_items')
        .select(`
          *,
          products (*)
        `)
        .eq('quotation_id', id);

      if (iError) throw iError;
      setItems(iData);

    } catch (error: any) {
      console.error('Error loading quotation:', error);
      alert('ไม่พบข้อมูลใบเสนอราคา หรือเกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="badge badge-draft">ฉบับร่าง</span>;
      case 'sent': return <span className="badge badge-sent">ส่งให้ลูกค้าแล้ว</span>;
      case 'approved': return <span className="badge badge-success">ลูกค้ายืนยันแล้ว</span>;
      case 'rejected': return <span className="badge badge-error">ยกเลิก</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const isLineBrowser = /Line/i.test(navigator.userAgent);
      if (isLineBrowser) {
        alert('กรุณากดที่เมนูมุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์อื่น" (Open in other browser) เช่น Safari หรือ Chrome เพื่อดาวน์โหลดไฟล์ครับ');
        return;
      }
      // Small delay in case we add a loading state later
      await new Promise(resolve => setTimeout(resolve, 100));

      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <QuotationPDF 
          quotation={quotation} 
          items={items} 
          customer={customer} 
          companyProfile={companyProfile} 
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quotation.quotation_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };

  const openEmailModal = () => {
    setEmailData({
      to: customer?.email || '',
      subject: `ใบเสนอราคา ${quotation?.quotation_number} จากบริษัท ${quotation?.company_name === 'SST' ? 'SST' : 'Shinwa Anzen'}`,
      message: `เรียนคุณลูกค้า\n\nทางบริษัทขอแนบใบเสนอราคาหมายเลข ${quotation?.quotation_number} ยอดรวมสุทธิ ${quotation?.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท มาเพื่อพิจารณา\n\nหากมีข้อสงสัยเพิ่มเติม สามารถติดต่อกลับได้เลยครับ\n\nขอแสดงความนับถือ\nบริษัท ${quotation?.company_name === 'SST' ? 'SST (Thailand) Co.,Ltd.' : 'Shinwa Anzen Co.,Ltd.'}`
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      alert('กรุณาระบุอีเมลผู้รับ');
      return;
    }
    
    setEmailSending(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <QuotationPDF 
          quotation={quotation} 
          items={items} 
          customer={customer} 
          companyProfile={companyProfile} 
        />
      ).toBlob();

      const formData = new FormData();
      formData.append('to', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('message', emailData.message);
      formData.append('company_name', quotation?.company_name || 'SST');
      formData.append('attachment', new File([blob], `${quotation?.quotation_number}.pdf`, { type: 'application/pdf' }));

      const res = await fetch('/api/send-email', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการส่งอีเมล');
      }

      alert('ส่งอีเมลเรียบร้อยแล้ว!');
      setShowEmailModal(false);
      
      // Update status to sent if it's draft
      if (quotation.status === 'draft') {
        await supabase.from('quotations').update({ status: 'sent' }).eq('id', id);
        fetchQuotationDetails();
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      alert(error.message);
    } finally {
      setEmailSending(false);
    }
  };

  const handleShareLine = async () => {
    try {
      if (!quotation) return;
      const summaryText = `แจ้งเสนอราคา: ${quotation.quotation_number}\nลูกค้า: ${customer?.name || '-'}\n${quotation.project_name ? `โปรเจกต์: ${quotation.project_name}\n` : ''}ยอดรวมสุทธิ: ${quotation.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
      
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <QuotationPDF 
          quotation={quotation} 
          items={items} 
          customer={customer} 
          companyProfile={companyProfile} 
        />
      ).toBlob();

      // Check if Web Share API is available and can share files
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'quotation.pdf', { type: 'application/pdf' })] })) {
        const file = new File([blob], `${quotation.quotation_number}.pdf`, { type: 'application/pdf' });
        await navigator.share({
          title: `ใบเสนอราคา ${quotation.quotation_number}`,
          text: summaryText,
          files: [file]
        });
      } else {
        // Fallback for Desktop/unsupported browsers: Auto-download the PDF first
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quotation.quotation_number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        // Copy summary to clipboard and open LINE URL scheme
        await navigator.clipboard.writeText(summaryText);
        alert('ระบบได้ดาวน์โหลดไฟล์ PDF ไว้ที่เครื่องของคุณแล้ว พร้อมทั้งคัดลอกข้อความสรุปข้อมูล\n\nระบบกำลังเปิดหน้าเว็บ LINE ให้คุณกดวางข้อความและลากไฟล์ PDF แนบไปส่งได้เลยครับ');
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(summaryText)}`;
        window.open(lineUrl, '_blank');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        alert('เกิดข้อผิดพลาดในการแชร์: ' + error.message);
      }
    }
  };

  const handleDownloadCatalog = async () => {
    try {
      // Check for LINE in-app browser which blocks downloads
      const isLineBrowser = /Line/i.test(navigator.userAgent);
      if (isLineBrowser) {
        alert('กรุณากดที่เมนูมุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์อื่น" (Open in other browser) เช่น Safari หรือ Chrome เพื่อดาวน์โหลดไฟล์ครับ');
        return;
      }

      setIsGeneratingCatalog(true);
      // Allow React to paint the loading state before blocking the main thread
      await new Promise(resolve => setTimeout(resolve, 100));

      const { pdf } = await import('@react-pdf/renderer');
      
      // Get unique products from items
      const uniqueProducts = [];
      const productIds = new Set();
      for (const item of items) {
        if (item.products && !productIds.has(item.products.id)) {
          uniqueProducts.push(item.products);
          productIds.add(item.products.id);
        }
      }

      if (uniqueProducts.length === 0) {
        setIsGeneratingCatalog(false);
        alert('ไม่มีสินค้าในใบเสนอราคานี้');
        return;
      }

      const blob = await pdf(
        <CatalogPDF 
          products={uniqueProducts}
          date={catalogDate}
          projectName={catalogProject}
          companyName={quotation.company_name}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catalog_${quotation.quotation_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      setShowCatalogModal(false);
    } catch (error) {
      console.error('Error generating Catalog PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง Catalog');
    } finally {
      setIsGeneratingCatalog(false);
    }
  };

  if (authLoading || loading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;
  if (!quotation) return <div className="loading-screen">ไม่พบข้อมูล</div>;

  return (
    <div className="page-container animate-fade-in" data-company={quotation.company_name}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/quotations" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ใบเสนอราคา {quotation.quotation_number}</h1>
            <p className="subtitle">ออกโดยบริษัท {quotation.company_name === 'SST' ? 'SST (Thailand) Co.,Ltd.' : 'Shinwa Anzen Co.,Ltd.'}</p>
          </div>
          <div style={{ marginLeft: '1rem' }}>
            {getStatusBadge(quotation.status)}
          </div>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openEmailModal} style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}>
            <Mail size={18} style={{ marginRight: '0.5rem' }} /> ส่งอีเมล (Email)
          </button>
          
          <button className="btn btn-outline" onClick={handleDownloadPDF}>
            <Download size={18} style={{ marginRight: '0.5rem' }} /> บันทึก PDF
          </button>
          
          <button className="btn btn-primary" onClick={handleShareLine} style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}>
            <MessageCircle size={18} style={{ marginRight: '0.5rem' }} /> ส่งทาง LINE
          </button>
        </div>
      </header>

      <div className="content-grid">
        <div className="main-content">
          <div className="glass-panel document-preview">
            <div className="preview-header">
              <h2>บริษัท {quotation.company_name === 'SST' ? 'SST (Thailand) Co.,Ltd.' : 'Shinwa Anzen Co.,Ltd.'}</h2>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>ใบเสนอราคา</h1>
                <p>เลขที่: <strong>{quotation.quotation_number}</strong></p>
                <p>วันที่: {new Date(quotation.created_at).toLocaleDateString('th-TH')}</p>
                {quotation.project_name && <p style={{ marginTop: '0.25rem' }}>โปรเจกต์: <strong>{quotation.project_name}</strong></p>}
              </div>
            </div>

            <div className="preview-customer">
              <h3>ข้อมูลลูกค้า</h3>
              <p><strong>ชื่อ:</strong> {customer?.name}</p>
              <p><strong>ที่อยู่:</strong> {customer?.address || '-'}</p>
              {customer?.tax_id && <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id}</p>}
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                {customer?.contact_name && <p><strong>ผู้ติดต่อ:</strong> {customer.contact_name}</p>}
                {customer?.contact_phone && <p><strong>โทร:</strong> {customer.contact_phone}</p>}
                {customer?.credit_terms && <p><strong>เครดิต:</strong> {customer.credit_terms}</p>}
              </div>
            </div>

            <table className="preview-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>ลำดับ</th>
                  <th style={{ width: '45%' }}>รายการสินค้า</th>
                  <th style={{ width: '15%' }}>จำนวน</th>
                  <th style={{ width: '15%' }}>ราคา/หน่วย</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>
                      <div>{item.products?.name}</div>
                      {item.description && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{item.description}</div>}
                      {item.products?.product_code && <div style={{ fontSize: '0.8rem', color: 'gray' }}>{item.products.product_code}</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity} {item.products?.unit}</td>
                    <td style={{ textAlign: 'center' }}>{Number(item.unit_price).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                    <td style={{ textAlign: 'right' }}>{Number(item.total).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="preview-summary">
              <div className="preview-notes">
                <strong>หมายเหตุ/เงื่อนไข:</strong>
                <p>{quotation.notes || '-'}</p>
              </div>
              <div className="preview-totals" style={{ width: '300px' }}>
                {(() => {
                  const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
                  const discountAmount = (subtotal * (quotation.global_discount_percent || 0)) / 100;
                  const afterDiscount = subtotal - discountAmount;
                  const vatAmount = quotation.has_vat ? afterDiscount * 0.07 : 0;
                  const grandTotal = afterDiscount + vatAmount;
                  const whtAmount = quotation.has_wht ? afterDiscount * 0.03 : 0;
                  const netPayable = quotation.total_amount; // already stored in db
                  
                  return (
                    <div style={{ width: '100%' }}>
                      <div className="total-line">
                        <span>รวมเป็นเงิน:</span>
                        <span>{subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                      </div>
                      
                      {quotation.global_discount_percent > 0 && (
                        <>
                          <div className="total-line" style={{ color: 'var(--error-color)' }}>
                            <span>หักส่วนลด {quotation.global_discount_percent}%:</span>
                            <span>- {discountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                          </div>
                          <div className="total-line">
                            <span>หลังหักส่วนลด:</span>
                            <span>{(subtotal - discountAmount).toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                          </div>
                        </>
                      )}
                      
                      <div className="total-line">
                        <label>
                          <input type="checkbox" checked={quotation.has_vat} readOnly disabled /> VAT 7%
                        </label>
                        <span>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                      </div>
                      
                      <div className="total-line" style={{ borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span>จำนวนเงินรวม:</span>
                        <span style={{ fontWeight: 'bold' }}>{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                      </div>
                      
                      {quotation.has_wht && (
                        <div className="total-line" style={{ color: 'var(--error-color)' }}>
                          <label>
                            <input type="checkbox" checked={true} readOnly disabled /> หักภาษี ณ ที่จ่าย 3%
                          </label>
                          <span>- {whtAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                        </div>
                      )}
                      
                      <div className="total-line" style={{ borderTop: '2px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span>ยอดชำระสุทธิ:</span>
                        <span className="grand-total">{Number(netPayable).toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-actions">
          <div className="glass-panel side-panel">
            <h3>จัดการเอกสาร</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Link href={`/quotations/${id}/edit`} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center' }}>
                แก้ไขข้อมูล
              </Link>
              <Link href={`/quotations/new?cloneId=${id}`} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center' }}>
                คัดลอก (ทำซ้ำ)
              </Link>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowCatalogModal(true)}
                style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}
              >
                <Download size={18} style={{ marginRight: '0.5rem' }} /> สร้างแคตตาล็อกสินค้า
              </button>
            </div>

            <div className="status-updater">
              <label className="label">เปลี่ยนสถานะ</label>
              <select className="input-field" defaultValue={quotation.status} onChange={async (e) => {
                const newStatus = e.target.value;
                const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', quotation.id);
                if (!error) {
                  setQuotation({...quotation, status: newStatus});
                  alert('เปลี่ยนสถานะสำเร็จ');
                }
              }}>
                <option value="draft">ฉบับร่าง (Draft)</option>
                <option value="sent">ส่งให้ลูกค้าแล้ว (Sent)</option>
                <option value="approved">ลูกค้ายืนยันแล้ว (Approved)</option>
                <option value="rejected">ยกเลิก/ปฏิเสธ (Rejected)</option>
              </select>
            </div>

            <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(0,0,0,0.1)' }} />
            
            <div className="info-box">
              <p><strong>ผู้สร้างเอกสาร:</strong> ระบบ</p>
              <p><strong>แก้ไขล่าสุด:</strong> {new Date(quotation.created_at).toLocaleString('th-TH')}</p>
            </div>
          </div>
        </div>
      </div>

      {showCatalogModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
            <h2>สร้างแคตตาล็อกสินค้า</h2>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="label">วันที่ (Date)</label>
              <input 
                type="text" 
                className="input-field" 
                value={catalogDate}
                onChange={e => setCatalogDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">ชื่อโปรเจกต์ (Project)</label>
              <input 
                type="text" 
                className="input-field" 
                value={catalogProject}
                onChange={e => setCatalogProject(e.target.value)}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn" onClick={() => setShowCatalogModal(false)} disabled={isGeneratingCatalog}>ยกเลิก</button>
              <button type="button" className="btn btn-primary" onClick={handleDownloadCatalog} disabled={isGeneratingCatalog}>
                {isGeneratingCatalog ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .header-actions { display: flex; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        [data-company="Shinwa Anzen"] .btn-icon:hover { background: rgba(255,255,255,0.1); }
        
        .btn-outline {
          background: transparent;
          border: 1px solid var(--primary-color);
          color: var(--primary-color);
        }
        [data-company="Shinwa Anzen"] .btn-outline {
          border-color: var(--secondary-color);
          color: var(--secondary-color);
        }
        .btn-outline:hover {
          background: rgba(0,0,0,0.05);
        }
        [data-company="Shinwa Anzen"] .btn-outline:hover {
          background: rgba(255,255,255,0.1);
        }

        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
        .badge-draft { background: rgba(128, 128, 128, 0.2); color: #666; }
        [data-company="Shinwa Anzen"] .badge-draft { background: rgba(255, 255, 255, 0.2); color: #ccc; }
        .badge-sent { background: rgba(59, 130, 246, 0.2); color: #2563eb; }
        [data-company="Shinwa Anzen"] .badge-sent { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
        .badge-success { background: rgba(16, 185, 129, 0.2); color: #059669; }
        [data-company="Shinwa Anzen"] .badge-success { background: rgba(16, 185, 129, 0.3); color: #6ee7b7; }
        .badge-error { background: rgba(239, 68, 68, 0.2); color: #dc2626; }
        [data-company="Shinwa Anzen"] .badge-error { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }

        .content-grid { display: grid; grid-template-columns: 3fr 1fr; gap: 1.5rem; }
        
        .document-preview {
          padding: 3rem;
          background-color: #fff; /* Paper feel */
          color: #333;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        [data-company="Shinwa Anzen"] .document-preview {
          background-color: #f8f9fa; /* Keep it light for reading */
          color: #111;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        [data-company="Shinwa Anzen"] .preview-header {
          border-bottom-color: var(--secondary-color);
        }

        .preview-customer {
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .preview-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        .preview-table th { background: #f0f0f0; padding: 0.75rem; text-align: center; border-bottom: 2px solid #ccc; }
        .preview-table td { padding: 0.75rem; border-bottom: 1px solid #eee; }

        .preview-summary { display: flex; justify-content: space-between; gap: 2rem; }
        .preview-notes { flex: 1; padding: 1rem; background: #f9f9f9; border-radius: 4px; }
        .preview-totals { flex: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
        
        .total-line { display: flex; justify-content: space-between; width: 100%; max-width: 300px; padding: 0.5rem 0; }
        .grand-total { font-size: 1.25rem; font-weight: bold; color: var(--primary-color); }
        [data-company="Shinwa Anzen"] .grand-total { color: #002266; /* Enforce dark blue for paper view */ }

        .side-panel { padding: 1.5rem; }
        .side-panel h3 { margin-bottom: 1rem; color: var(--primary-color); }
        [data-company="Shinwa Anzen"] .side-panel h3 { color: var(--secondary-color); }
        
        .status-updater { margin-bottom: 1rem; }
        
        .info-box { font-size: 0.85rem; color: var(--text-light); line-height: 1.6; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(2px); }
        .modal-content { background: var(--bg-color); padding: 2rem; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; }
        
        @media (max-width: 900px) {
          .content-grid { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .document-preview { padding: 1.5rem; }
        }
      `}</style>
      
      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>ส่งอีเมลใบเสนอราคา</h2>
              <button className="btn-icon" onClick={() => setShowEmailModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ marginTop: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="label">อีเมลผู้รับ</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="label">หัวข้ออีเมล</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="label">ข้อความ</label>
                <textarea 
                  className="input-field" 
                  rows={6}
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                />
              </div>
              
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} /> ระบบจะแนบไฟล์ <strong>{quotation?.quotation_number}.pdf</strong> ไปด้วยอัตโนมัติ
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setShowEmailModal(false)} disabled={emailSending}>
                  ยกเลิก
                </button>
                <button className="btn btn-primary" onClick={handleSendEmail} disabled={emailSending} style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}>
                  {emailSending ? 'กำลังส่ง...' : (
                    <>
                      <Send size={18} style={{ marginRight: '0.5rem' }} /> ส่งอีเมล
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
