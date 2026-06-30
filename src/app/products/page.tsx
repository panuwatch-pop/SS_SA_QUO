'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit2, Trash2, Search, ArrowLeft, Image as ImageIcon, Download, Upload, LayoutGrid, List, X } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';
import Image from 'next/image';

interface Product {
  id: string;
  product_code: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  additional_images?: string[];
  category: string;
  company: string;
  unit: string;
  barcode: string;
}

import { useCompany } from '@/context/CompanyContext';

export default function ProductsPage() {
  const { company } = useCompany();
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    description: '',
    price: 0,
    image_url: '',
    additional_images: [] as string[],
    category: '',
    company: 'SST', // Default
    unit: '',
    barcode: ''
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import CSV state
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function doImportShinwaProducts() {
      if (localStorage.getItem('shinwa_products_imported_v3')) return;
      try {
        const res = await fetch('/shinwa_products_import.json');
        if (!res.ok) {
          alert(`Fetch failed with status: ${res.status}`);
          return;
        }
        const data = await res.json();
        if (data && data.length > 0) {
          const { error } = await supabase.from('products').insert(data);
          if (error) {
            alert(`Error importing products: ${error.message || JSON.stringify(error)}`);
          } else {
            localStorage.setItem('shinwa_products_imported_v3', 'true');
            alert(`นำเข้าสินค้า Shinwa อัตโนมัติเรียบร้อยแล้ว (${data.length} รายการ)`);
            fetchProducts();
          }
        } else {
          alert('Data is empty');
        }
      } catch (err: any) {
        alert(`Catch error: ${err.message}`);
      }
    }
    
    if (user) {
      doImportShinwaProducts();
      fetchProducts();
    }
  }, [user, company]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await fetchAllProducts(company);

    if (error) {
      console.error('Error fetching products:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_code: product.product_code || '',
        name: product.name,
        description: product.description || '',
        price: product.price,
        image_url: product.image_url || '',
        additional_images: product.additional_images || [],
        category: product.category || '',
        company: product.company || 'SST',
        unit: product.unit || '',
        barcode: product.barcode || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product_code: '',
        name: '',
        description: '',
        price: 0,
        image_url: '',
        additional_images: [],
        category: '',
        company: 'SST',
        unit: '',
        barcode: ''
      });
    }
    setIsModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      setUploadingImage(true);
      
      const files = Array.from(e.target.files);
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading:', uploadError);
          continue;
        }
        
        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }
      
      if (uploadedUrls.length > 0) {
        if (!formData.image_url) {
          // If no main image, set first to main, rest to additional
          setFormData({ 
            ...formData, 
            image_url: uploadedUrls[0],
            additional_images: [...formData.additional_images, ...uploadedUrls.slice(1)]
          });
        } else {
          // Add all to additional
          setFormData({ 
            ...formData, 
            additional_images: [...formData.additional_images, ...uploadedUrls]
          });
        }
      }
      
    } catch (error: any) {
      alert(`Error uploading image: ${error.message}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAdditionalImage = (index: number) => {
    const newAdditional = [...formData.additional_images];
    newAdditional.splice(index, 1);
    setFormData({ ...formData, additional_images: newAdditional });
  };
  
  const removeMainImage = () => {
    if (formData.additional_images.length > 0) {
      const newMain = formData.additional_images[0];
      const newAdditional = formData.additional_images.slice(1);
      setFormData({ ...formData, image_url: newMain, additional_images: newAdditional });
    } else {
      setFormData({ ...formData, image_url: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', editingProduct.id);

      if (error) alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      else fetchProducts();
    } else {
      const { error } = await supabase
        .from('products')
        .insert([formData]);

      if (error) alert('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
      else fetchProducts();
    }

    setLoading(false);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      else fetchProducts();
    }
  };

  const handleExportCSV = () => {
    const exportData = products.map(p => ({
      product_code: p.product_code || '',
      name: p.name || '',
      description: p.description || '',
      price: p.price || 0,
      category: p.category || '',
      unit: p.unit || '',
      barcode: p.barcode || '',
      company: p.company || 'SST',
      image_url: p.image_url || '',
      additional_images: p.additional_images ? p.additional_images.join(',') : ''
    }));

    const csv = Papa.unparse(exportData);
    
    // Create BOM for UTF-8
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            alert('ไม่พบข้อมูลในไฟล์ CSV');
            return;
          }

          if (rows[0] && !('name' in rows[0])) {
            alert('รูปแบบไฟล์ไม่ถูกต้อง: ต้องมีคอลัมน์ name (ชื่อสินค้า)');
            return;
          }

          const payloads = rows.map(row => ({
            product_code: row.product_code?.trim() || null,
            name: row.name?.trim(),
            description: row.description?.trim() || null,
            price: parseFloat(row.price) || 0,
            category: row.category?.trim() || null,
            unit: row.unit?.trim() || null,
            barcode: row.barcode?.trim() || null,
            company: row.company?.trim() || 'SST',
            image_url: row.image_url?.trim() || null,
            additional_images: row.additional_images ? row.additional_images.split(',').map((u: string) => u.trim()) : []
          }));

          const { data: existingProducts } = await supabase
            .from('products')
            .select('id, product_code');
            
          const existingCodeMap = new Map();
          if (existingProducts) {
            existingProducts.forEach(p => {
              if (p.product_code) existingCodeMap.set(p.product_code, p.id);
            });
          }

          const recordsToInsert = [];
          const recordsToUpdate = [];

          for (const item of payloads) {
            if (item.product_code && existingCodeMap.has(item.product_code)) {
              recordsToUpdate.push({ ...item, id: existingCodeMap.get(item.product_code) });
            } else {
              recordsToInsert.push(item);
            }
          }

          if (recordsToInsert.length > 0) {
            const { error: insertError } = await supabase.from('products').insert(recordsToInsert);
            if (insertError) throw insertError;
          }

          if (recordsToUpdate.length > 0) {
            const { error: updateError } = await supabase.from('products').upsert(recordsToUpdate);
            if (updateError) throw updateError;
          }

          alert(`นำเข้าข้อมูลสำเร็จ!\nเพิ่มใหม่: ${recordsToInsert.length} รายการ\nอัปเดต: ${recordsToUpdate.length} รายการ`);
          fetchProducts();
        } catch (error: any) {
          console.error('Import error:', error);
          alert('เกิดข้อผิดพลาดในการนำเข้า: ' + error.message);
        } finally {
          setImporting(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
        }
      },
      error: (error) => {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: ' + error.message);
        setImporting(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.product_code && p.product_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) return <div className="loading-screen">กำลังโหลด...</div>;
  if (!user) return null;

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>ระบบจัดการสินค้า</h1>
            <p className="subtitle">เพิ่ม แก้ไข และจัดการแคตตาล็อคสินค้า</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input 
            type="file" 
            accept=".csv" 
            style={{ display: 'none' }} 
            ref={csvInputRef} 
            onChange={handleImportCSV} 
          />
          <button className="btn btn-outline" onClick={() => csvInputRef.current?.click()} disabled={importing}>
            <Upload size={18} style={{ marginRight: '0.5rem' }} /> {importing ? 'กำลังนำเข้า...' : 'นำเข้า CSV'}
          </button>
          <button className="btn btn-outline" onClick={handleExportCSV}>
            <Download size={18} style={{ marginRight: '0.5rem' }} /> ส่งออก CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} style={{ marginRight: '0.5rem' }} /> เพิ่มสินค้าใหม่
          </button>
        </div>
      </header>

      <div className="glass-panel content-panel">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ marginBottom: 0, flex: 1, position: 'relative' }}>
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รายละเอียด..." 
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '40px' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="ล้างการค้นหา"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', background: 'rgba(128,128,128,0.1)', borderRadius: '8px', padding: '4px' }}>
            <button 
              className="btn-icon"
              style={{ background: viewMode === 'grid' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-light)', borderRadius: '6px', marginRight: '4px' }}
              onClick={() => setViewMode('grid')}
              title="แบบกริด (มีรูป)"
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              className="btn-icon"
              style={{ background: viewMode === 'list' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-light)', borderRadius: '6px' }}
              onClick={() => setViewMode('list')}
              title="แบบรายการ (ไม่มีรูป)"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="empty-state">กำลังโหลดข้อมูล...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">ไม่พบข้อมูลสินค้า</div>
        ) : viewMode === 'grid' ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card glass-panel">
                <div className="product-image-container">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-no-image">
                      <ImageIcon size={40} opacity={0.3} />
                    </div>
                  )}
                  <div className="product-actions">
                    <button className="btn-icon bg-white text-primary" onClick={() => handleOpenModal(product)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon bg-white text-error" onClick={() => handleDelete(product.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="product-info">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem'}}>
                    <span style={{fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold'}}>{product.product_code || 'ไม่มีรหัส'}</span>
                    <span style={{fontSize: '0.7rem', padding: '2px 6px', background: product.company === 'SST' ? '#0033a0' : '#d4af37', color: product.company === 'SST' ? '#fff' : '#002266', borderRadius: '4px'}}>{product.company || 'SST'}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="product-desc">{product.description || '-'}</p>
                  <p className="product-price">
                    ฿{product.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })} {product.unit && <span style={{fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 'normal'}}> / {product.unit}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>รหัสสินค้า</th>
                  <th>ชื่อสินค้า</th>
                  <th>ราคา</th>
                  <th>หน่วย</th>
                  <th className="actions-cell">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <span style={{fontWeight: 'bold'}}>{product.product_code || '-'}</span>
                    </td>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>฿{Number(product.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td>{product.unit || '-'}</td>
                    <td className="actions-cell">
                      <button className="btn-icon text-primary" onClick={() => handleOpenModal(product)}>
                        <Edit2 size={18} />
                      </button>
                      <button className="btn-icon text-error" onClick={() => handleDelete(product.id)}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>{editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              
              <div className="form-group image-upload-group">
                <label className="label">รูปภาพสินค้า (อัปโหลดได้หลายรูป)</label>
                
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {/* Main Image */}
                  {formData.image_url && (
                    <div className="image-preview-wrapper" style={{ minWidth: '100px', width: '100px', height: '100px', position: 'relative' }}>
                      <img src={formData.image_url} alt="Main Preview" className="image-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={removeMainImage} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.6rem', textAlign: 'center', padding: '2px' }}>รูปหลัก</div>
                    </div>
                  )}
                  
                  {/* Additional Images */}
                  {formData.additional_images.map((url, idx) => (
                    <div key={idx} className="image-preview-wrapper" style={{ minWidth: '100px', width: '100px', height: '100px', position: 'relative' }}>
                      <img src={url} alt={`Preview ${idx}`} className="image-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => removeAdditionalImage(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}

                  {/* Upload Button */}
                  <div className="image-preview-wrapper" onClick={() => fileInputRef.current?.click()} style={{ minWidth: '100px', width: '100px', height: '100px', border: '2px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ImageIcon size={24} style={{ color: 'var(--text-light)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px', textAlign: 'center' }}>{uploadingImage ? 'อัปโหลด...' : 'เพิ่มรูปภาพ'}</span>
                  </div>
                </div>

                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </div>

              <div className="form-row" style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="label">รหัสสินค้า</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.product_code}
                    onChange={e => setFormData({...formData, product_code: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="label">บริษัทเจ้าของสินค้า</label>
                  <select 
                    className="input-field"
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                  >
                    <option value="SST">SST</option>
                    <option value="Shinwa Anzen">Shinwa Anzen</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">ชื่อสินค้า *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-row" style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="label">ราคาสินค้า (บาท) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="input-field" 
                    required
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="label">หน่วยสินค้า</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    placeholder="เช่น ชิ้น, กล่อง, คู่"
                  />
                </div>
              </div>

              <div className="form-row" style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="label">หมวดหมู่สินค้า</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="label">เลขบาร์โค้ด</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.barcode}
                    onChange={e => setFormData({...formData, barcode: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">รายละเอียดเพิ่มเติม</label>
                <textarea 
                  className="input-field" 
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={handleCloseModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={loading || uploadingImage}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Reuse common styles from customers page or move to globals */
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .subtitle { color: var(--text-light); font-size: 0.9rem; margin-top: 0.25rem; }
        .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-color); display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(0,0,0,0.05); }
        [data-company="Shinwa Anzen"] .btn-icon:hover { background: rgba(255,255,255,0.1); }
        .text-primary { color: var(--primary-color); }
        .text-error { color: var(--error-color); }
        .bg-white { background-color: rgba(255,255,255,0.9); }
        .bg-white:hover { background-color: #fff; }
        [data-company="Shinwa Anzen"] .text-primary { color: var(--secondary-color); }
        
        .content-panel { padding: 1.5rem; }
        .search-bar { position: relative; margin-bottom: 1.5rem; max-width: 400px; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-light); }
        .search-bar .input-field { padding-left: 3rem; }
        .empty-state { text-align: center; padding: 3rem; color: var(--text-light); }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .product-card {
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .product-image-container {
          position: relative;
          aspect-ratio: 1;
          background: rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        [data-company="Shinwa Anzen"] .product-image-container {
          background: rgba(255,255,255,0.05);
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-no-image {
          color: var(--text-light);
        }
        .product-actions {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .product-card:hover .product-actions {
          opacity: 1;
        }
        .product-info {
          padding: 1rem;
        }
        .product-info h3 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }
        .product-desc {
          color: var(--text-light);
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-price {
          font-weight: bold;
          color: var(--primary-color);
          font-size: 1.1rem;
        }
        [data-company="Shinwa Anzen"] .product-price {
          color: var(--secondary-color);
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 1rem;
        }
        .modal-content {
          width: 100%; max-width: 500px; padding: 2rem;
          background: var(--bg-color); max-height: 90vh; overflow-y: auto;
        }
        .modal-content h2 { margin-bottom: 1.5rem; }
        .modal-form { display: flex; flex-direction: column; gap: 1rem; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        
        .image-upload-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .image-preview-wrapper {
          width: 150px;
          height: 150px;
          border-radius: 12px;
          border: 2px dashed rgba(0,0,0,0.2);
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        [data-company="Shinwa Anzen"] .image-preview-wrapper {
          border-color: rgba(255,255,255,0.2);
        }
        .image-preview-wrapper:hover {
          border-color: var(--primary-color);
          background: rgba(0,51,160,0.05);
        }
        [data-company="Shinwa Anzen"] .image-preview-wrapper:hover {
          border-color: var(--secondary-color);
          background: rgba(212,175,55,0.05);
        }
        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .image-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-light);
          font-size: 0.8rem;
          text-align: center;
          padding: 1rem;
        }
        
        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .product-actions { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
