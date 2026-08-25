'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  ArrowLeft, Search, Receipt, DollarSign, Calendar, Clock, AlertTriangle, 
  CheckCircle2, Plus, Mail, Trash2, Edit2, Check, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

interface SupplierBill {
  id: string;
  bill_number: string;
  purchase_order_id?: string;
  supplier_id: string;
  company_name: string;
  bill_date: string;
  credit_terms_days: number;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  wht_amount: number;
  net_amount: number;
  status: string; // 'unpaid', 'paid', 'overdue'
  paid_at?: string;
  payment_slip_url?: string;
  notes?: string;
  created_at: string;
  suppliers?: {
    name: string;
    code: string;
    phone: string;
    bank_name: string;
    bank_account_no: string;
    bank_account_name: string;
  };
}

export default function SupplierBillsPage() {
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();

  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTimeframe, setFilterTimeframe] = useState<'all' | 'due_7' | 'due_3' | 'overdue' | 'paid'>('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<SupplierBill | null>(null);
  const [formData, setFormData] = useState({
    bill_number: '',
    supplier_id: '',
    company_name: company,
    bill_date: new Date().toISOString().split('T')[0],
    credit_terms_days: 30,
    subtotal: 0,
    vat_amount: 0,
    wht_amount: 0,
    net_amount: 0,
    notes: ''
  });

  // Mark as Paid Modal State
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [payingBill, setPayingBill] = useState<SupplierBill | null>(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidNotes, setPaidNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Send Alert Email Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertDaysAhead, setAlertDaysAhead] = useState(7);
  const [targetEmail, setTargetEmail] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBillsAndSuppliers();
    }
  }, [user, company]);

  const fetchBillsAndSuppliers = async () => {
    setLoading(true);
    try {
      // 1. Fetch Bills
      const { data: billsData, error: billsError } = await supabase
        .from('supplier_bills')
        .select('*, suppliers(*)')
        .eq('company_name', company)
        .order('due_date', { ascending: true });

      if (billsError) throw billsError;
      setBills(billsData || []);

      // 2. Fetch Suppliers for dropdown
      const { data: supData } = await supabase
        .from('suppliers')
        .select('*')
        .or(`company.eq.${company},company.eq.Shared`)
        .order('name', { ascending: true });
      setSuppliers(supData || []);

    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBill(null);
    setFormData({
      bill_number: '',
      supplier_id: suppliers[0]?.id || '',
      company_name: company,
      bill_date: new Date().toISOString().split('T')[0],
      credit_terms_days: suppliers[0]?.credit_terms || 30,
      subtotal: 0,
      vat_amount: 0,
      wht_amount: 0,
      net_amount: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSupplierChange = (supId: string) => {
    const sup = suppliers.find(s => s.id === supId);
    setFormData({
      ...formData,
      supplier_id: supId,
      credit_terms_days: sup?.credit_terms || 30
    });
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bill_number.trim() || !formData.supplier_id) {
      alert('กรุณากรอกเลขที่บิลและเลือกซัพพลายเออร์');
      return;
    }

    try {
      // Calculate Due Date
      const bDate = new Date(formData.bill_date);
      const dueDateObj = new Date(bDate.getTime() + (Number(formData.credit_terms_days) || 30) * 24 * 60 * 60 * 1000);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      if (editingBill) {
        const { error } = await supabase
          .from('supplier_bills')
          .update({
            bill_number: formData.bill_number,
            supplier_id: formData.supplier_id,
            bill_date: formData.bill_date,
            credit_terms_days: formData.credit_terms_days,
            due_date: dueDateStr,
            subtotal: formData.subtotal,
            vat_amount: formData.vat_amount,
            wht_amount: formData.wht_amount,
            net_amount: formData.net_amount,
            notes: formData.notes
          })
          .eq('id', editingBill.id);
        if (error) throw error;
        alert('แก้ไขบิลเจ้าหนี้สำเร็จ');
      } else {
        const { error } = await supabase
          .from('supplier_bills')
          .insert([{
            ...formData,
            due_date: dueDateStr,
            status: 'unpaid'
          }]);
        if (error) throw error;
        alert('บันทึกบิลเจ้าหนี้สำเร็จ');
      }

      setIsModalOpen(false);
      fetchBillsAndSuppliers();
    } catch (error: any) {
      console.error('Save bill error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from('supplier_bills')
        .update({
          status: 'paid',
          paid_at: paidDate,
          notes: paidNotes ? `${payingBill.notes || ''} [ชำระเมื่อ: ${paidDate} - ${paidNotes}]` : payingBill.notes
        })
        .eq('id', payingBill.id);

      if (error) throw error;

      alert(`บันทึกการชำระเงินสำหรับบิล ${payingBill.bill_number} สำเร็จ`);
      setShowPaidModal(false);
      setPayingBill(null);
      fetchBillsAndSuppliers();
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDelete = async (id: string, billNum: string) => {
    if (confirm(`คุณต้องการลบบิลเลขที่ "${billNum}" ใช่หรือไม่?`)) {
      try {
        const { error } = await supabase.from('supplier_bills').delete().eq('id', id);
        if (error) throw error;
        alert('ลบบิลเรียบร้อยแล้ว');
        fetchBillsAndSuppliers();
      } catch (error: any) {
        console.error('Delete error:', error);
        alert(`ไม่สามารถลบได้: ${error.message}`);
      }
    }
  };

  const handleSendAccountingAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingAlert(true);
    try {
      const res = await fetch('/api/supplier-bills/send-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company,
          days_ahead: alertDaysAhead,
          target_email: targetEmail || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      alert(data.message || `ส่งอีเมลแจ้งเตือนยอดจ่ายเงินไปยังแผนกบัญชีสำเร็จ (${data.count} รายการ ยอดรวม ฿${Number(data.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
      setShowAlertModal(false);
    } catch (error: any) {
      console.error('Send alert error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setSendingAlert(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      (bill.bill_number && bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.suppliers?.name && bill.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.suppliers?.code && bill.suppliers.code.toLowerCase().includes(searchTerm.toLowerCase()));

    const d = new Date(bill.due_date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const isOverdue = diffDays < 0 && bill.status !== 'paid';

    let matchesTimeframe = true;
    if (filterTimeframe === 'paid') {
      matchesTimeframe = bill.status === 'paid';
    } else if (filterTimeframe === 'overdue') {
      matchesTimeframe = isOverdue;
    } else if (filterTimeframe === 'due_3') {
      matchesTimeframe = bill.status !== 'paid' && diffDays >= 0 && diffDays <= 3;
    } else if (filterTimeframe === 'due_7') {
      matchesTimeframe = bill.status !== 'paid' && diffDays >= 0 && diffDays <= 7;
    }

    return matchesSearch && matchesTimeframe;
  });

  // Calculate summary figures
  const unpaidBills = bills.filter(b => b.status !== 'paid');
  const totalUnpaidAmount = unpaidBills.reduce((sum, b) => sum + Number(b.net_amount || 0), 0);

  const overdueBills = unpaidBills.filter(b => {
    const d = new Date(b.due_date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });
  const totalOverdueAmount = overdueBills.reduce((sum, b) => sum + Number(b.net_amount || 0), 0);

  const due7DaysBills = unpaidBills.filter(b => {
    const d = new Date(b.due_date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diff >= 0 && diff <= 7;
  });
  const totalDue7DaysAmount = due7DaysBills.reduce((sum, b) => sum + Number(b.net_amount || 0), 0);

  if (authLoading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>บิลค่าใช้จ่ายและกำหนดชำระ (Supplier Bills & AP)</h1>
            <p className="subtitle">ติดตามกำหนดจ่ายเงินซัพพลายเออร์และแจ้งเตือนแผนกบัญชี ({company})</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => setShowAlertModal(true)}>
            <Mail size={18} style={{ marginRight: '0.5rem' }} /> ส่งอีเมลเตือนบัญชี
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> บันทึกบิลใหม่
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">ยอดหนี้ค้างชำระทั้งหมด ({unpaidBills.length} บิล)</span>
          <span className="stat-value text-primary">
            ฿{totalUnpaidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: overdueBills.length > 0 ? '4px solid #ef4444' : undefined }}>
          <span className="stat-label">เกินกำหนดชำระ ({overdueBills.length} บิล)</span>
          <span className="stat-value" style={{ color: overdueBills.length > 0 ? '#ef4444' : 'inherit' }}>
            ฿{totalOverdueAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">ครบกำหนดใน 7 วัน ({due7DaysBills.length} บิล)</span>
          <span className="stat-value text-warning">
            ฿{totalDue7DaysAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${filterTimeframe === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTimeframe('all')}
        >
          ทั้งหมด ({bills.length})
        </button>
        <button 
          className={`tab-btn ${filterTimeframe === 'due_7' ? 'active' : ''}`}
          onClick={() => setFilterTimeframe('due_7')}
        >
          ครบกำหนดใน 7 วัน ({due7DaysBills.length})
        </button>
        <button 
          className={`tab-btn ${filterTimeframe === 'due_3' ? 'active' : ''}`}
          onClick={() => setFilterTimeframe('due_3')}
        >
          ครบกำหนดใน 3 วัน
        </button>
        <button 
          className={`tab-btn ${filterTimeframe === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilterTimeframe('overdue')}
          style={{ color: overdueBills.length > 0 ? '#ef4444' : undefined }}
        >
          เกินกำหนด ({overdueBills.length})
        </button>
        <button 
          className={`tab-btn ${filterTimeframe === 'paid' ? 'active' : ''}`}
          onClick={() => setFilterTimeframe('paid')}
        >
          จ่ายแล้ว ({bills.filter(b => b.status === 'paid').length})
        </button>
      </div>

      {/* Filter Search */}
      <div className="glass-panel filter-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่บิล, ชื่อผู้ขาย, รหัสซัพพลายเออร์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field search-input"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="glass-panel table-container">
        {loading ? (
          <div className="loading-text">กำลังโหลดรายการบิล...</div>
        ) : filteredBills.length === 0 ? (
          <div className="empty-state">
            <Receipt size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>ไม่พบบิลค่าใช้จ่ายตามเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>เลขที่บิล</th>
                  <th style={{ width: '25%' }}>ซัพพลายเออร์ / บัญชีรับโอน</th>
                  <th style={{ width: '12%' }}>วันที่ในบิล</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>วันครบกำหนดชำระ</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>ยอดเงินสุทธิ (บาท)</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(bill => {
                  const d = new Date(bill.due_date);
                  d.setHours(0, 0, 0, 0);
                  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  const isPaid = bill.status === 'paid';
                  const isOverdue = !isPaid && diff < 0;
                  const isDueSoon = !isPaid && diff >= 0 && diff <= 3;

                  return (
                    <tr key={bill.id}>
                      <td>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{bill.bill_number}</div>
                        {bill.purchase_order_id && (
                          <Link href={`/purchase-orders/${bill.purchase_order_id}`} style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                            ดู PO ที่เกี่ยวข้อง
                          </Link>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{bill.suppliers?.name || 'ไม่ระบุ'}</div>
                        {bill.suppliers?.bank_account_no && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
                            {bill.suppliers.bank_name} {bill.suppliers.bank_account_no}
                          </div>
                        )}
                      </td>
                      <td>
                        {new Date(bill.bill_date).toLocaleDateString('th-TH')}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                          เครดิต {bill.credit_terms_days || 0} วัน
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : isPaid ? '#059669' : 'inherit' }}>
                          {new Date(bill.due_date).toLocaleDateString('th-TH')}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          {isPaid ? (
                            <span style={{ color: '#059669' }}>จ่ายแล้ว</span>
                          ) : isOverdue ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>เกินกำหนด {Math.abs(diff)} วัน</span>
                          ) : diff === 0 ? (
                            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>ครบกำหนดวันนี้</span>
                          ) : (
                            <span style={{ color: 'var(--text-light)' }}>อีก {diff} วัน</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ฿{Number(bill.net_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isPaid ? (
                          <span className="status-badge status-paid"><CheckCircle2 size={12} /> จ่ายแล้ว</span>
                        ) : isOverdue ? (
                          <span className="status-badge status-overdue"><AlertTriangle size={12} /> เกินกำหนด</span>
                        ) : (
                          <span className="status-badge status-unpaid"><Clock size={12} /> รอชำระ</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          {!isPaid && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderColor: '#059669', color: '#059669' }}
                              title="บันทึกว่าจ่ายเงินแล้ว"
                              onClick={() => {
                                setPayingBill(bill);
                                setShowPaidModal(true);
                              }}
                            >
                              <Check size={14} style={{ marginRight: '2px' }} /> จ่ายแล้ว
                            </button>
                          )}
                          <button className="btn-icon text-error" title="ลบ" onClick={() => handleDelete(bill.id, bill.bill_number)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Bill Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '600px' }}>
            <h2>{editingBill ? 'แก้ไขบิลเจ้าหนี้' : 'บันทึกบิลเจ้าหนี้ใหม่'}</h2>
            <form onSubmit={handleSaveBill} style={{ marginTop: '1rem' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">เลขที่ใบแจ้งหนี้ / ใบกำกับภาษี *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.bill_number}
                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                    placeholder="เช่น INV-9988"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">ซัพพลายเออร์ *</label>
                  <select
                    className="input-field"
                    value={formData.supplier_id}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    required
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || '-'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="label">วันที่ในบิล (Bill Date) *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.bill_date}
                    onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">เครดิตเทอม (วัน) *</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.credit_terms_days}
                    onChange={(e) => setFormData({ ...formData, credit_terms_days: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">ยอดเงินสุทธิที่ต้องจ่าย (Net Payable บาท) *</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.net_amount}
                  onChange={(e) => setFormData({ ...formData, net_amount: Number(e.target.value) })}
                  step="any"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="รายละเอียดบิล..."
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกบิล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark As Paid Modal */}
      {showPaidModal && payingBill && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px' }}>
            <h2>ยืนยันการชำระเงินบิลเจ้าหนี้</h2>
            <p className="subtitle" style={{ marginBottom: '1.25rem' }}>
              บิลเลขที่: <strong>{payingBill.bill_number}</strong> | ผู้ขาย: {payingBill.suppliers?.name}
            </p>

            <form onSubmit={handleMarkPaid}>
              <div className="form-group">
                <label className="label">ยอดเงินที่ชำระ:</label>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  ฿{Number(payingBill.net_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">วันที่โอนชำระเงิน *</label>
                <input
                  type="date"
                  className="input-field"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">เลขอ้างอิงสลิป / บันทึกการจ่าย</label>
                <input
                  type="text"
                  className="input-field"
                  value={paidNotes}
                  onChange={(e) => setPaidNotes(e.target.value)}
                  placeholder="เช่น โอนผ่าน KBANK สลิปเลขที่ #1234"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPaidModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={savingPayment} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                  {savingPayment ? 'กำลังบันทึก...' : 'ยืนยันว่าจ่ายเงินแล้ว'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Accounting Alert Modal */}
      {showAlertModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '550px' }}>
            <h2>ส่งอีเมลแจ้งเตือนยอดจ่ายเงินให้แผนกบัญชี</h2>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>
              ระบบจะรวบรวมบิลที่ใกล้ครบกำหนดชำระและบิลค้างจ่ายทั้งหมด จัดทำเป็นตารางสรุปส่งทางอีเมล
            </p>

            <form onSubmit={handleSendAccountingAlert}>
              <div className="form-group">
                <label className="label">ช่วงเวลาที่ครบกำหนดล่วงหน้า</label>
                <select
                  className="input-field"
                  value={alertDaysAhead}
                  onChange={(e) => setAlertDaysAhead(Number(e.target.value))}
                >
                  <option value={3}>ภายใน 3 วันข้างหน้า + บิลค้างชำระ</option>
                  <option value={7}>ภายใน 7 วันข้างหน้า + บิลค้างชำระ (แนะนำ)</option>
                  <option value={15}>ภายใน 15 วันข้างหน้า + บิลค้างชำระ</option>
                  <option value={30}>ภายใน 30 วันข้างหน้า (ทั้งเดือน)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">ส่งไปยังอีเมลแผนกบัญชี (เว้นว่างไว้เพื่อใช้อีเมลตั้งต้นของบริษัท)</label>
                <input
                  type="email"
                  className="input-field"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="accounting@sst-thailand.com"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAlertModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={sendingAlert}>
                  {sendingAlert ? 'กำลังส่งสรุปรายงาน...' : 'ส่งอีเมลแจ้งเตือนทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 3rem 2rem 2rem 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        .header-actions { display: flex; gap: 0.75rem; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; }
        .stat-label { font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem; }
        .stat-value { font-size: 1.5rem; font-weight: bold; }
        .text-primary { color: var(--primary-color); }
        .text-warning { color: #f59e0b; }
        
        .tabs-container { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 0.5rem; flex-wrap: wrap; }
        .tab-btn { background: none; border: none; padding: 0.6rem 1rem; font-size: 0.9rem; font-weight: 500; color: var(--text-light); cursor: pointer; border-radius: 8px; transition: all 0.2s; }
        .tab-btn:hover { background: rgba(0,0,0,0.04); color: var(--text-color); }
        .tab-btn.active { background: var(--primary-color); color: #ffffff; }

        .filter-panel { padding: 1rem; margin-bottom: 1.5rem; }
        .search-box { position: relative; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-light); }
        .search-input { padding-left: 2.75rem; }
        
        .table-container { padding: 1rem; overflow: hidden; }
        .table-responsive { overflow-x: auto; width: 100%; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .data-table th { font-weight: 600; color: var(--text-light); font-size: 0.85rem; text-transform: uppercase; }
        .data-table tbody tr:hover { background: rgba(0,0,0,0.02); }
        
        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; }
        .status-unpaid { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .status-overdue { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
        .status-paid { background: rgba(16, 185, 129, 0.1); color: #059669; }
        
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        .text-error { color: var(--error-color) !important; }
        .action-buttons { display: flex; gap: 0.5rem; align-items: center; }

        .modal-backdrop { 
          position: fixed; 
          top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(0,0,0,0.5); 
          display: flex; 
          justify-content: center; 
          align-items: flex-start; 
          padding: 40px 1rem; 
          z-index: 1000; 
          overflow-y: auto;
        }
        .modal-content { 
          background: var(--bg-color); 
          width: 100%; 
          border-radius: 12px; 
          padding: 2rem; 
          margin-top: 20px;
          max-height: 85vh; 
          overflow-y: auto; 
          box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
        .loading-text, .empty-state { text-align: center; padding: 3rem; color: var(--text-light); }

        @media (max-width: 768px) {
          .page-container { padding: 1.5rem 1rem; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .form-grid { grid-template-columns: 1fr; }
          .modal-backdrop { padding: 20px 0.75rem; }
        }
      `}</style>
    </div>
  );
}
