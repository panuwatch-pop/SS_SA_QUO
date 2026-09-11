'use client';

import React from 'react';
import { X, Sparkles, Tag, Calendar, CheckCircle, Info } from 'lucide-react';
import { APP_VERSION, APP_NAME, APP_RELEASE_DATE, VERSION_HISTORY, VersionRelease } from '@/config/version';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionModal({ isOpen, onClose }: VersionModalProps) {
  if (!isOpen) return null;

  const getTypeBadge = (type: VersionRelease['type']) => {
    switch (type) {
      case 'major':
        return (
          <span style={{ 
            backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', 
            fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.55rem', borderRadius: '12px' 
          }}>
            🌟 Major Upgrade
          </span>
        );
      case 'minor':
        return (
          <span style={{ 
            backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', 
            fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.55rem', borderRadius: '12px' 
          }}>
            🚀 Minor Feature
          </span>
        );
      case 'patch':
        return (
          <span style={{ 
            backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', 
            fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.55rem', borderRadius: '12px' 
          }}>
            🔧 Patch / Fix
          </span>
        );
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
    }}>
      <div className="modal-content glass-panel" style={{
        background: '#ffffff', borderRadius: '14px', padding: '1.75rem',
        width: '100%', maxWidth: '640px', maxHeight: '88vh', overflowY: 'auto',
        position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
          }}
          title="ปิด"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: '#002266', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#ffffff'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#002266', margin: 0 }}>
              ประวัติการอัปเกรดระบบ (Version & Changelog)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
              {APP_NAME} — เวอร์ชันปัจจุบัน: <strong style={{ color: '#002266' }}>v{APP_VERSION}</strong>
            </p>
          </div>
        </div>

        {/* Version Explanation Banner */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '0.75rem 1rem', margin: '1rem 0 1.5rem 0', fontSize: '0.8rem', color: '#475569',
          display: 'flex', alignItems: 'flex-start', gap: '0.6rem'
        }}>
          <Info size={16} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>หลักเกณฑ์การระบุหมายเลขเวอร์ชัน (Semantic Versioning):</strong>
            <div style={{ marginTop: '3px', lineHeight: 1.4 }}>
              • <strong>Major (X.0.0):</strong> อัปเกรดใหญ่ เพิ่มระบบหลักใหม่ หรือเปลี่ยนโครงสร้างระบบ<br/>
              • <strong>Minor (1.X.0):</strong> อัปเกรดย่อย เพิ่มโมดูลหรือฟังก์ชันการทำงานใหม่ (เช่น ใบยืมสินค้า, DO)<br/>
              • <strong>Patch (1.2.X):</strong> แก้ไขบั๊ก ปรับปรุงการแสดงผล หรือปรับแต่งฟังก์ชันเดิม
            </div>
          </div>
        </div>

        {/* Timeline of Releases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {VERSION_HISTORY.map((item, idx) => (
            <div key={item.version} style={{
              border: idx === 0 ? '1.5px solid #002266' : '1px solid #e2e8f0',
              borderRadius: '10px', padding: '1rem 1.25rem',
              backgroundColor: idx === 0 ? '#f0f7ff' : '#ffffff',
              boxShadow: idx === 0 ? '0 4px 6px -1px rgba(0, 34, 102, 0.08)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#002266' }}>
                    v{item.version}
                  </span>
                  {getTypeBadge(item.type)}
                  {idx === 0 && (
                    <span style={{
                      backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.7rem',
                      fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '4px'
                    }}>
                      ล่าสุด (Current)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={14} />
                  {new Date(item.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', color: '#1e293b', margin: '0 0 0.35rem 0' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.6rem 0' }}>
                {item.description}
              </p>

              {item.changes && item.changes.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#334155' }}>
                  {item.changes.map((change, cIdx) => (
                    <li key={cIdx} style={{ marginBottom: '0.25rem' }}>
                      {change}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={onClose}
            className="btn btn-primary"
            style={{ minWidth: '120px' }}
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}
