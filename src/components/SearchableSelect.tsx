import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  options: { id: string; label: string; subLabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'เลือก...', className = '' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        <>
          {/* Overlay for mobile/tablet to close on tap outside */}
          <div 
            className="mobile-overlay" 
            onClick={() => setIsOpen(false)}
            style={{ display: 'none' }}
          ></div>

          <div 
            className="searchable-dropdown glass-panel"
          >
            <div style={{ padding: '12px', borderBottom: '1px solid rgba(128,128,128,0.2)', flexShrink: 0 }}>
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
                    padding: '8px 10px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid rgba(128,128,128,0.3)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-color)',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
            <div className="searchable-dropdown-list">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => (
                  <div 
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="searchable-option"
                    style={{
                      background: value === opt.id ? 'rgba(0, 51, 160, 0.1)' : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: value === opt.id ? 'bold' : 'normal', color: 'var(--text-color)', fontSize: '1rem' }}>{opt.label}</span>
                    {opt.subLabel && <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>{opt.subLabel}</span>}
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '1rem' }}>
                  ไม่พบข้อมูล
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .searchable-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          margin-top: 4px;
          max-height: 300px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--glass-bg, #ffffff);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .searchable-dropdown-list {
          overflow-y: auto;
          max-height: 250px;
          -webkit-overflow-scrolling: touch;
        }

        .searchable-option {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid rgba(128,128,128,0.1);
          display: flex;
          flex-direction: column;
          transition: background 0.2s;
        }
        
        .searchable-option:hover {
          background: rgba(128,128,128,0.1) !important;
        }

        /* Mobile & Tablet Modal Mode */
        @media (max-width: 1024px) {
          .mobile-overlay {
            display: block !important;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4);
            z-index: 999;
            backdrop-filter: blur(2px);
          }
          
          .searchable-dropdown {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 90vw !important;
            max-width: 500px;
            max-height: 70vh !important;
            z-index: 1000 !important;
            border-radius: 12px;
          }
          
          .searchable-dropdown-list {
            max-height: calc(70vh - 60px);
          }
          
          .searchable-option {
            padding: 16px; /* Larger touch targets for mobile */
          }
        }
      `}</style>
    </div>
  );
}
