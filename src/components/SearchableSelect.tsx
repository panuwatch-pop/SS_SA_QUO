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
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
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
        // If we are on mobile, the modal is in a portal, so clicking outside the wrapper might falsely close it
        // BUT we have the mobile-overlay to handle closing on mobile, so we only need this for desktop
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
        background: 'var(--bg-color)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        transform: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      } : {}}
    >
      <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 10, borderTopLeftRadius: isMobile ? '12px' : '8px', borderTopRightRadius: isMobile ? '12px' : '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 10px 12px 36px', // Increased padding for better tap area
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-color)',
              fontSize: '16px' // Must be exactly 16px to prevent iOS zoom
            }}
          />
        </div>
      </div>
      <div className="searchable-dropdown-list" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                padding: '16px', // Increased padding for better tap area
                borderBottom: '1px solid rgba(128,128,128,0.1)',
                background: value === opt.id ? 'rgba(0, 51, 160, 0.1)' : 'transparent',
              }}
            >
              <span style={{ fontWeight: value === opt.id ? 'bold' : 'normal', color: 'var(--text-color)', fontSize: '16px' }}>{opt.label}</span>
              {opt.subLabel && <span style={{ fontSize: '14px', color: 'var(--text-light)', marginTop: '6px', display: 'block' }}>{opt.subLabel}</span>}
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '16px' }}>
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
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', minHeight: '42px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? 'inherit' : 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
      </div>
      
      {isOpen && (
        isMobile ? (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <div 
              className="mobile-overlay" 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)' }}
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
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          margin-top: 4px;
          max-height: 340px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--glass-bg, #ffffff);
          box-shadow: 0 8px 30px rgba(0,0,0,0.18);
          border: 1px solid var(--border-color, #cbd5e1);
          border-radius: 8px;
        }
        
        .searchable-dropdown-list {
          overflow-y: scroll;
          max-height: 270px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: var(--primary-color, #2563eb) #f1f5f9;
        }

        /* Prominent Custom Scrollbar / Slider */
        .searchable-dropdown-list::-webkit-scrollbar {
          width: 8px;
          display: block;
        }

        .searchable-dropdown-list::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
          margin: 4px 0;
        }

        .searchable-dropdown-list::-webkit-scrollbar-thumb {
          background: var(--primary-color, #2563eb);
          border-radius: 4px;
        }

        .searchable-dropdown-list::-webkit-scrollbar-thumb:hover {
          background: #1d4ed8;
        }

        .searchable-option {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid rgba(128,128,128,0.1);
          display: flex;
          flex-direction: column;
          transition: background 0.15s ease;
        }
        
        .searchable-option:hover {
          background: rgba(37, 99, 235, 0.08) !important;
        }

        /* Mobile & Tablet Modal Mode */
        .mobile-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 9999;
        }
        
        .mobile-modal {
          position: fixed !important;
          top: 20px !important;
          left: 5vw !important;
          transform: none !important;
          width: 90vw !important;
          max-width: 500px;
          max-height: calc(100vh - 40px) !important;
          z-index: 10000 !important;
          border-radius: 12px;
          margin-top: 0 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          background: var(--bg-color) !important;
        }
        
        .mobile-modal .searchable-dropdown-list {
          max-height: calc(70vh - 60px);
        }
        
        .mobile-modal .searchable-option {
          padding: 16px; /* Larger touch targets for mobile */
        }
      `}</style>
    </div>
  );
}
