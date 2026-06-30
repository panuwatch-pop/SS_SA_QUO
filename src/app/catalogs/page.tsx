'use client';

import { useState, useEffect } from 'react';
import { supabase, fetchAllProducts } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { ArrowLeft, Download, FileText, Settings, Users, Package, LogOut, CheckSquare, Square, Search, BookOpen, LayoutGrid, List, X } from 'lucide-react';
import Link from 'next/link';
import CatalogPDF from '@/components/pdf/CatalogPDF';
import Image from 'next/image';

export default function CatalogsPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { company, setCompany } = useCompany();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [catalogDate, setCatalogDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [catalogProject, setCatalogProject] = useState('');

  useEffect(() => {
    if (user && company) {
      fetchProducts();
    }
  }, [user, company]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await fetchAllProducts(company);

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const toggleProduct = (id: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProductIds(newSelected);
  };

  const handleDownloadCatalog = async () => {
    if (selectedProductIds.size === 0) {
      alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    try {
      const { pdf } = await import('@react-pdf/renderer');
      
      const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

      const blob = await pdf(
        <CatalogPDF 
          products={selectedProducts}
          date={catalogDate}
          projectName={catalogProject}
          companyName={company}
        />
      ).toBlob();

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `Catalog_${company}_${new Date().getTime()}.pdf`,
            types: [{
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err.name !== 'AbortError') throw err;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Catalog_${company}_${new Date().getTime()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating Catalog PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง Catalog');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.product_code && p.product_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) return <div className="loading-screen">กำลังโหลด...</div>;
  if (!user) return null;

  return (
    <div className="page-container animate-fade-in" data-company={company}>
      <header className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="header-left">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>สร้างแคตตาล็อกสินค้า</h1>
            <p className="subtitle">เลือกสินค้าและสร้างไฟล์ PDF แคตตาล็อก</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>วันที่ (Date)</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ width: '150px', padding: '0.5rem' }}
              value={catalogDate}
              onChange={e => setCatalogDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>โปรเจกต์ (Project)</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ width: '200px', padding: '0.5rem' }}
              value={catalogProject}
              onChange={e => setCatalogProject(e.target.value)}
              placeholder="ชื่อโปรเจกต์"
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleDownloadCatalog}
            disabled={selectedProductIds.size === 0}
            style={{ height: 'fit-content', alignSelf: 'flex-end', marginBottom: '2px' }}
          >
            <Download size={20} style={{ marginRight: '0.5rem' }} /> โหลด PDF ({selectedProductIds.size})
          </button>
        </div>
      </header>

      <div className="glass-panel content-panel" style={{ flex: 1, minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '500px', marginBottom: 0 }}>
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รหัสสินค้า..." 
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="btn-icon" 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none' }}
                onClick={() => setSearchTerm('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn-icon"
              style={{ background: viewMode === 'grid' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-light)', borderRadius: '6px' }}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
          {loading ? (
            <div className="empty-state">กำลังโหลดข้อมูล...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">ไม่พบข้อมูลสินค้า</div>
          ) : viewMode === 'grid' ? (
            <div className="products-grid">
              {filteredProducts.map(product => {
                const isSelected = selectedProductIds.has(product.id);
                return (
                  <div 
                    key={product.id} 
                    className={`product-card glass-panel ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleProduct(product.id)}
                    style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--glass-border)' }}
                  >
                    <div className="product-image-container">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="product-image" />
                      ) : (
                        <div className="product-no-image">ไม่มีรูป</div>
                      )}
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', borderRadius: '4px', padding: '4px' }}>
                        {isSelected ? <CheckSquare size={20} color="var(--primary-color)" /> : <Square size={20} color="#ccc" />}
                      </div>
                    </div>
                    <div className="product-info">
                      <span style={{fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold'}}>{product.product_code || 'ไม่มีรหัส'}</span>
                      <h3>{product.name}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>เลือก</th>
                    <th style={{ width: '15%' }}>รหัสสินค้า</th>
                    <th style={{ width: '40%' }}>ชื่อสินค้า</th>
                    <th style={{ width: '20%' }}>หมวดหมู่</th>
                    <th style={{ width: '20%' }}>ราคา</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const isSelected = selectedProductIds.has(product.id);
                    return (
                      <tr 
                        key={product.id} 
                        onClick={() => toggleProduct(product.id)}
                        style={{ cursor: 'pointer', background: isSelected ? 'rgba(0, 51, 160, 0.05)' : '' }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          {isSelected ? <CheckSquare size={20} color="var(--primary-color)" /> : <Square size={20} color="#ccc" />}
                        </td>
                        <td>{product.product_code || '-'}</td>
                        <td>{product.name}</td>
                        <td>{product.category || '-'}</td>
                        <td style={{ textAlign: 'right' }}>฿{Number(product.price || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 1.2rem; color: var(--primary-color); }
        .page-container { padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .header-left { display: flex; gap: 1rem; align-items: center; }
        .btn-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; background: rgba(0,0,0,0.05); color: var(--text-color); transition: all 0.2s ease; }
        .btn-icon:hover { background: var(--primary-color); color: white; }
        
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .product-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--glass-shadow-hover);
        }
        .product-card.selected {
          background: rgba(0, 34, 102, 0.05);
        }
        .product-image-container {
          position: relative;
          width: 100%;
          height: 160px;
          background: rgba(0,0,0,0.03);
          border-bottom: 1px solid var(--glass-border);
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-light);
        }
        .product-info {
          padding: 1rem;
          flex: 1;
        }
        .product-info h3 {
          margin: 0.25rem 0 0.5rem 0;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}
