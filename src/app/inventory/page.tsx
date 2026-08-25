'use client';

import { useState, useEffect } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  ArrowLeft, Search, Package, AlertTriangle, ArrowDownRight, ArrowUpRight, 
  History, Edit3, Plus, RefreshCw, Layers, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  product_id: string;
  company: string;
  quantity_on_hand: number;
  reorder_level: number;
  last_cost_price: number;
  updated_at: string;
  products?: {
    id: string;
    product_code: string;
    name: string;
    unit: string;
    price: number;
    image_url: string;
    category: string;
  };
}

interface StockMovement {
  id: string;
  product_id: string;
  company: string;
  movement_type: string;
  reference_type: string;
  reference_number: string;
  quantity_change: number;
  quantity_after: number;
  notes: string;
  created_by: string;
  created_at: string;
  products?: {
    name: string;
    product_code: string;
    unit: string;
  };
}

export default function InventoryPage() {
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [movementsList, setMovementsList] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({
    company: 'Shared',
    type: 'ADJUST_ADD', // 'ADJUST_ADD', 'ADJUST_SUB', 'SET'
    quantity: 1,
    notes: ''
  });
  const [savingAdjust, setSavingAdjust] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInventoryData();
    }
  }, [user, company]);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Inventory with Products
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*, products(*)')
        .order('updated_at', { ascending: false });

      if (invError) throw invError;
      setInventoryList(invData || []);

      // 2. Fetch Movements with Products
      const { data: movData, error: movError } = await supabase
        .from('stock_movements')
        .select('*, products(name, product_code, unit)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (movError) throw movError;
      setMovementsList(movData || []);

    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedProduct(item);
    setAdjustForm({
      company: item.company || 'Shared',
      type: 'ADJUST_ADD',
      quantity: 1,
      notes: ''
    });
    setShowAdjustModal(true);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSavingAdjust(true);
    try {
      const currentQty = Number(selectedProduct.quantity_on_hand) || 0;
      const inputQty = Number(adjustForm.quantity) || 0;
      let newQty = currentQty;
      let changeQty = 0;

      if (adjustForm.type === 'ADJUST_ADD') {
        newQty = currentQty + inputQty;
        changeQty = inputQty;
      } else if (adjustForm.type === 'ADJUST_SUB') {
        newQty = Math.max(0, currentQty - inputQty);
        changeQty = -inputQty;
      } else if (adjustForm.type === 'SET') {
        newQty = inputQty;
        changeQty = inputQty - currentQty;
      }

      // 1. Update Inventory Table
      const { error: invError } = await supabase
        .from('inventory')
        .update({
          quantity_on_hand: newQty,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct.id);

      if (invError) throw invError;

      // 2. Insert Stock Movement
      await supabase.from('stock_movements').insert([{
        product_id: selectedProduct.product_id,
        company: adjustForm.company,
        movement_type: adjustForm.type,
        reference_type: 'MANUAL',
        quantity_change: changeQty,
        quantity_after: newQty,
        notes: adjustForm.notes || 'ปรับปรุงยอดสต็อกด้วยตนเอง',
        created_by: user?.email
      }]);

      alert(`ปรับปรุงยอดคงเหลือของ "${selectedProduct.products?.name}" เป็น ${newQty} เรียบร้อยแล้ว`);
      setShowAdjustModal(false);
      fetchInventoryData();
    } catch (error: any) {
      console.error('Adjust error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setSavingAdjust(false);
    }
  };

  const filteredInventory = inventoryList.filter(item => {
    const prod = item.products;
    const matchesSearch = 
      (prod?.name && prod.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (prod?.product_code && prod.product_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (prod?.category && prod.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCompany = 
      companyFilter === 'all' || 
      item.company === companyFilter;

    const matchesLowStock = 
      !onlyLowStock || 
      Number(item.quantity_on_hand) <= Number(item.reorder_level || 5);

    return matchesSearch && matchesCompany && matchesLowStock;
  });

  const lowStockCount = inventoryList.filter(
    i => Number(i.quantity_on_hand) <= Number(i.reorder_level || 5)
  ).length;

  const totalStockItems = inventoryList.reduce((sum, i) => sum + Number(i.quantity_on_hand || 0), 0);

  if (authLoading) return <div className="loading-screen">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>คลังสินค้าและยอดสต็อก (Inventory & Stock)</h1>
            <p className="subtitle">ตรวจสอบยอดคงเหลือและประวัติการเคลื่อนไหวสต็อก ({company})</p>
          </div>
        </div>

        <button className="btn btn-outline" onClick={fetchInventoryData}>
          <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> รีเฟรชข้อมูล
        </button>
      </header>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">รายการสินค้าที่มีในสต็อก</span>
          <span className="stat-value">{inventoryList.length} <span className="stat-unit">SKUs</span></span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">จำนวนสต็อกรวมทั้งหมด</span>
          <span className="stat-value text-primary">{totalStockItems.toLocaleString()} <span className="stat-unit">ชิ้น</span></span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: lowStockCount > 0 ? '4px solid #ef4444' : undefined }}>
          <span className="stat-label">สินค้าใกล้หมด (ต่ำกว่าเกณฑ์)</span>
          <span className="stat-value" style={{ color: lowStockCount > 0 ? '#ef4444' : 'inherit' }}>
            {lowStockCount} <span className="stat-unit">รายการ</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Layers size={18} style={{ marginRight: '0.5rem' }} /> ยอดสินค้าคงเหลือ (Stock on Hand)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          <History size={18} style={{ marginRight: '0.5rem' }} /> ประวัติการเคลื่อนไหวสต็อก (Movement Log)
        </button>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Filters */}
          <div className="glass-panel filter-panel">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า, รหัสสินค้า, หมวดหมู่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field search-input"
              />
            </div>

            <div className="filter-controls">
              <div className="filter-item">
                <label className="label" style={{ marginBottom: 0, fontSize: '0.85rem' }}>กลุ่มสต็อก:</label>
                <select
                  className="input-field select-small"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="all">ทั้งหมด (All)</option>
                  <option value="Shared">กองกลาง (Shared)</option>
                  <option value="SST">เฉพาะ SST</option>
                  <option value="Shinwa Anzen">เฉพาะ Shinwa Anzen</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={onlyLowStock}
                  onChange={(e) => setOnlyLowStock(e.target.checked)}
                />
                <span style={{ color: onlyLowStock ? '#ef4444' : 'inherit', fontWeight: onlyLowStock ? 'bold' : 'normal' }}>
                  เฉพาะสินค้าใกล้หมด
                </span>
              </label>
            </div>
          </div>

          {/* Stock Table */}
          <div className="glass-panel table-container">
            {loading ? (
              <div className="loading-text">กำลังโหลดข้อมูลสต็อก...</div>
            ) : filteredInventory.length === 0 ? (
              <div className="empty-state">
                <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>ยังไม่มีข้อมูลสต็อกสินค้า (สต็อกจะเพิ่มอัตโนมัติเมื่อตรวจรับสินค้าจาก PO หรือกดปรับยอด)</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>รหัสสินค้า</th>
                      <th style={{ width: '35%' }}>ชื่อสินค้า / หมวดหมู่</th>
                      <th style={{ width: '15%' }}>กลุ่มสต็อก</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>ต้นทุนล่าสุด</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>ยอดคงเหลือในคลัง</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => {
                      const isLow = Number(item.quantity_on_hand) <= Number(item.reorder_level || 5);

                      return (
                        <tr key={item.id}>
                          <td>
                            <span className="code-badge">{item.products?.product_code || '-'}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: '500' }}>{item.products?.name || 'ไม่ทราบชื่อ'}</div>
                            {item.products?.category && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                {item.products.category}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`company-tag tag-${item.company}`}>
                              {item.company === 'Shared' ? 'กองกลาง (Shared)' : item.company}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {Number(item.last_cost_price || 0) > 0 ? (
                              <span>฿{Number(item.last_cost_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <span style={{ color: 'var(--text-light)' }}>-</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold', 
                                color: isLow ? '#ef4444' : '#059669' 
                              }}>
                                {Number(item.quantity_on_hand).toLocaleString()}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                {item.products?.unit || 'ชิ้น'}
                              </span>
                              {isLow && (
                                <span title={`ต่ำกว่าเกณฑ์แจ้งเตือน (${item.reorder_level || 5})`}>
                                  <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons" style={{ justifyContent: 'center' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                onClick={() => handleOpenAdjust(item)}
                              >
                                <Edit3 size={14} style={{ marginRight: '4px' }} /> ปรับยอด
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
        </>
      ) : (
        /* Movements Log Tab */
        <div className="glass-panel table-container">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>วัน/เวลา</th>
                  <th style={{ width: '25%' }}>สินค้า</th>
                  <th style={{ width: '12%' }}>ประเภท</th>
                  <th style={{ width: '15%' }}>เลขอ้างอิง</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>จำนวนที่เปลี่ยน</th>
                  <th style={{ width: '18%' }}>หมายเหตุ / ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {movementsList.map(mov => {
                  const isPositive = Number(mov.quantity_change) > 0;

                  return (
                    <tr key={mov.id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(mov.created_at).toLocaleString('th-TH')}
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{mov.products?.name}</div>
                        {mov.products?.product_code && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                            รหัส: {mov.products.product_code}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="movement-badge">
                          {mov.movement_type === 'IN_PO' && 'รับเข้าจาก PO'}
                          {mov.movement_type === 'ADJUST_ADD' && 'ปรับเพิ่ม'}
                          {mov.movement_type === 'ADJUST_SUB' && 'ปรับลด'}
                          {mov.movement_type === 'SET' && 'นับสต็อกใหม่'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '500', color: 'var(--primary-color)' }}>
                          {mov.reference_number || '-'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: isPositive ? '#059669' : '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          {isPositive ? `+${Number(mov.quantity_change)}` : Number(mov.quantity_change)} {mov.products?.unit || ''}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{mov.notes || '-'}</div>
                        {mov.created_by && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>โดย {mov.created_by}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px' }}>
            <h2>ปรับปรุงยอดสต็อก (Adjust Stock)</h2>
            <p className="subtitle" style={{ marginBottom: '1.25rem' }}>
              สินค้า: <strong>{selectedProduct.products?.name}</strong> ({selectedProduct.products?.product_code || '-'})
            </p>

            <form onSubmit={handleSaveAdjust}>
              <div className="form-group">
                <label className="label">ยอดคงเหลือปัจจุบันในคลัง:</label>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {Number(selectedProduct.quantity_on_hand).toLocaleString()} {selectedProduct.products?.unit || 'ชิ้น'}
                </div>
              </div>

              <div className="form-group">
                <label className="label">รูปแบบการปรับยอด *</label>
                <select
                  className="input-field"
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                >
                  <option value="ADJUST_ADD">+ เพิ่มจำนวนเข้าคลัง</option>
                  <option value="ADJUST_SUB">- ลดจำนวนออกจากคลัง (ชำรุด/สูญหาย)</option>
                  <option value="SET">= นับสต็อกจริงแล้วกำหนดค่าใหม่ (Count Correction)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">
                  {adjustForm.type === 'SET' ? 'ระบุยอดคงเหลือที่ถูกต้อง' : 'จำนวนที่ต้องการปรับ'} *
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                  min={0}
                  step="any"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">เหตุผล / หมายเหตุการปรับยอด *</label>
                <input
                  type="text"
                  className="input-field"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="เช่น ตรวจนับสต็อกสิ้นเดือน, สินค้าชำรุด"
                  required
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdjustModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={savingAdjust}>
                  {savingAdjust ? 'กำลังบันทึก...' : 'บันทึกการปรับยอด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; }
        .stat-label { font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem; }
        .stat-value { font-size: 1.5rem; font-weight: bold; }
        .stat-unit { font-size: 0.9rem; font-weight: normal; color: var(--text-light); }
        .text-primary { color: var(--primary-color); }
        
        .tabs-container { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 0.5rem; }
        .tab-btn { background: none; border: none; padding: 0.75rem 1.25rem; font-size: 0.95rem; font-weight: 500; color: var(--text-light); cursor: pointer; border-radius: 8px; display: flex; align-items: center; transition: all 0.2s; }
        .tab-btn:hover { background: rgba(0,0,0,0.04); color: var(--text-color); }
        .tab-btn.active { background: var(--primary-color); color: #ffffff; }

        .filter-panel { padding: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .search-box { position: relative; flex: 1; min-width: 250px; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-light); }
        .search-input { padding-left: 2.75rem; }
        .filter-controls { display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap; }
        .filter-item { display: flex; align-items: center; gap: 0.5rem; }
        .select-small { padding: 0.5rem 0.75rem; font-size: 0.9rem; width: auto; }
        
        .table-container { padding: 1rem; overflow: hidden; }
        .table-responsive { overflow-x: auto; width: 100%; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 1rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .data-table th { font-weight: 600; color: var(--text-light); font-size: 0.85rem; text-transform: uppercase; }
        .data-table tbody tr:hover { background: rgba(0,0,0,0.02); }
        
        .code-badge { background: rgba(0, 51, 160, 0.08); color: var(--primary-color); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; }
        .company-tag { font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
        .tag-Shared { background: rgba(16, 185, 129, 0.1); color: #059669; }
        .tag-SST { background: rgba(0, 51, 160, 0.1); color: #0033a0; }
        .tag-Shinwa { background: rgba(212, 175, 55, 0.15); color: #b45309; }
        
        .movement-badge { background: rgba(100, 116, 139, 0.1); color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
        
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
        .modal-content { background: var(--bg-color); width: 100%; border-radius: 12px; padding: 2rem; max-height: 90vh; overflow-y: auto; }
        .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
        .loading-text, .empty-state { text-align: center; padding: 3rem; color: var(--text-light); }

        @media (max-width: 768px) {
          .page-container { padding: 1rem; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .filter-panel { flex-direction: column; align-items: stretch; }
          .tabs-container { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
