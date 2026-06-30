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
        <div 
          className="searchable-dropdown glass-panel"
          style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            zIndex: 50, 
            marginTop: '4px',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '6px 8px 6px 28px',
                  borderRadius: '4px',
                  border: '1px solid rgba(128,128,128,0.3)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-color)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(128,128,128,0.1)',
                    background: value === opt.id ? 'rgba(0, 51, 160, 0.1)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(128,128,128,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = value === opt.id ? 'rgba(0, 51, 160, 0.1)' : 'transparent'}
                >
                  <span style={{ fontWeight: value === opt.id ? 'bold' : 'normal', color: 'var(--text-color)' }}>{opt.label}</span>
                  {opt.subLabel && <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{opt.subLabel}</span>}
                </div>
              ))
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                ไม่พบข้อมูล
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
