import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  options: { id: string; label: string; subLabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

import { createPortal } from 'react-dom';

export default function SearchableSelect({ options, value, onChange, placeholder = 'เลือก...', className = '' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (!isMobile) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  const touchStartY = useRef(0);

  const dropdownContent = (
    <div 
      className={`searchable-dropdown glass-panel ${isMobile ? 'mobile-modal' : ''}`}
      style={isMobile ? {
        position: 'fixed',
        top: '10vh',
        left: '5vw',
        width: '90vw',
        maxWidth: '500px',
        maxHeight: '80vh',
        zIndex: 10000,
        borderRadius: '12px',
        background: '#ffffff',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        transform: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      } : {}}
    >
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: '#ffffff', zIndex: 10, borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            placeholder="พิมพ์ค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 10px 10px 36px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              outline: 'none',
              background: '#f8fafc',
              color: 'var(--text-color)',
              fontSize: '15px'
            }}
          />
        </div>
      </div>
      <div className="searchable-dropdown-list">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(opt => (
            <div 
              key={opt.id}
              onClick={(e) => {
                e.preventDefault();
                onChange(opt.id);
                setIsOpen(false);
                setSearchTerm('');
              }}
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                const touchEndY = e.changedTouches[0].clientY;
                if (Math.abs(touchEndY - touchStartY.current) < 10) {
                  e.preventDefault();
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearchTerm('');
                }
              }}
              className="searchable-option"
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                background: value === opt.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              }}
            >
              <span style={{ fontWeight: value === opt.id ? 'bold' : '500', color: value === opt.id ? 'var(--primary-color)' : 'var(--text-color)', fontSize: '14.5px' }}>
                {opt.label}
              </span>
              {opt.subLabel && <span style={{ fontSize: '12.5px', color: 'var(--text-light)', marginTop: '2px', display: 'block' }}>{opt.subLabel}</span>}
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '14px' }}>
            ไม่พบข้อมูล
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`searchable-select-wrapper ${className}`} ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="input-field"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: '42px', backgroundColor: '#ffffff' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? 'inherit' : 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selectedOption ? '500' : 'normal' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
      </div>
      
      {isOpen && (
        isMobile ? (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <div 
              className="mobile-overlay" 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }}
            ></div>
            {dropdownContent}
          </div>
        ) : (
          dropdownContent
        )
      )}

      <style jsx>{`
        .searchable-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 99999;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          border: 1.5px solid var(--primary-color, #2563eb);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .searchable-dropdown-list {
          max-height: 240px;
          overflow-y: scroll !important;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: auto;
          scrollbar-color: var(--primary-color, #2563eb) #e2e8f0;
        }

        /* Prominent Custom Scrollbar Track and Thumb (Slide Bar ด้านข้าง) */
        .searchable-dropdown-list::-webkit-scrollbar {
          width: 10px !important;
          display: block !important;
        }

        .searchable-dropdown-list::-webkit-scrollbar-track {
          background: #e2e8f0 !important;
          border-radius: 4px;
          margin: 2px 0;
        }

        .searchable-dropdown-list::-webkit-scrollbar-thumb {
          background: var(--primary-color, #2563eb) !important;
          border-radius: 4px;
          border: 2px solid #e2e8f0;
        }

        .searchable-dropdown-list::-webkit-scrollbar-thumb:hover {
          background: #1d4ed8 !important;
        }

        .searchable-option {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          transition: background 0.12s ease;
        }
        
        .searchable-option:hover {
          background: rgba(37, 99, 235, 0.08) !important;
        }

        /* Mobile Modal Mode */
        .mobile-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
        }
        
        .mobile-modal {
          position: fixed !important;
          top: 40px !important;
          left: 5vw !important;
          width: 90vw !important;
          max-width: 500px;
          max-height: calc(100vh - 80px) !important;
          z-index: 10000 !important;
          border-radius: 12px;
          background: #ffffff !important;
        }
        
        .mobile-modal .searchable-dropdown-list {
          max-height: calc(70vh - 80px);
        }
      `}</style>
    </div>
  );
}
