import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchableSelectProps {
  options: { id: string; label: string; subLabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = 'เลือก...', 
  className = '' 
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Custom Slider State
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(40);
  const [hasScroll, setHasScroll] = useState(false);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const scrollStartTop = useRef(0);

  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close when clicking outside
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

  // Update slider position & dimensions
  const updateSlider = useCallback(() => {
    if (!listRef.current || !trackRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const trackHeight = trackRef.current.clientHeight;

    if (scrollHeight > clientHeight) {
      setHasScroll(true);
      const calculatedHeight = Math.max(30, (clientHeight / scrollHeight) * trackHeight);
      setThumbHeight(calculatedHeight);
      
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - calculatedHeight;
      const currentThumbTop = (scrollTop / maxScrollTop) * maxThumbTop;
      setThumbTop(currentThumbTop);
    } else {
      setHasScroll(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(updateSlider, 50);
    }
  }, [isOpen, filteredOptions.length, updateSlider]);

  // Handle Dragging Slider Thumb
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    if (listRef.current) {
      scrollStartTop.current = listRef.current.scrollTop;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !listRef.current || !trackRef.current) return;
      const deltaY = moveEvent.clientY - dragStartY.current;
      const trackHeight = trackRef.current.clientHeight;
      const { scrollHeight, clientHeight } = listRef.current;
      
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      if (maxThumbTop <= 0) return;

      const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
      listRef.current.scrollTop = Math.min(maxScrollTop, Math.max(0, scrollStartTop.current + scrollDelta));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle Clicking on Slider Track
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!listRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const { scrollHeight, clientHeight } = listRef.current;
    
    const maxScrollTop = scrollHeight - clientHeight;
    const targetScroll = (clickY / trackHeight) * maxScrollTop;
    listRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Scroll step buttons (Up / Down)
  const scrollStep = (direction: 'up' | 'down') => {
    if (!listRef.current) return;
    const delta = direction === 'up' ? -80 : 80;
    listRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  };

  return (
    <div className={`searchable-select-wrapper ${className}`} ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input Display Button */}
      <div 
        className="input-field select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'selected-text' : 'placeholder-text'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`arrow-icon ${isOpen ? 'open' : ''}`} />
      </div>
      
      {/* Dropdown Container */}
      {isOpen && (
        <div className="searchable-dropdown animate-fade-in">
          {/* Search Box Header */}
          <div className="search-header">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="พิมพ์ค้นหาชื่อ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="search-input"
            />
          </div>

          {/* Body: Option List + Dedicated Visual Slide Bar */}
          <div className="dropdown-body">
            {/* Scrollable List */}
            <div 
              className="options-scroll-container" 
              ref={listRef}
              onScroll={updateSlider}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = value === opt.id;
                  return (
                    <div 
                      key={opt.id}
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`option-row ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="option-label">{opt.label}</div>
                      {opt.subLabel && <div className="option-sublabel">{opt.subLabel}</div>}
                    </div>
                  );
                })
              ) : (
                <div className="empty-option">ไม่พบข้อมูลที่ค้นหา</div>
              )}
            </div>

            {/* Always-Visible Slide Bar on the Right */}
            {filteredOptions.length > 0 && (
              <div className="slide-bar-container">
                <button 
                  type="button" 
                  className="slide-arrow-btn" 
                  onClick={() => scrollStep('up')}
                  title="เลื่อนขึ้น"
                >
                  <ChevronUp size={12} />
                </button>

                <div 
                  className="slide-track" 
                  ref={trackRef}
                  onClick={handleTrackClick}
                >
                  <div 
                    className="slide-thumb"
                    style={{
                      top: `${thumbTop}px`,
                      height: `${thumbHeight}px`,
                    }}
                    onMouseDown={handleThumbMouseDown}
                    title="ลากเพื่อเลื่อนดูรายชื่อ"
                  >
                    <div className="thumb-grip"></div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="slide-arrow-btn" 
                  onClick={() => scrollStep('down')}
                  title="เลื่อนลง"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .searchable-select-wrapper {
          position: relative;
          width: 100%;
        }

        .select-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          min-height: 42px;
          background-color: #ffffff;
          border: 1px solid var(--border-color, #cbd5e1);
          border-radius: 8px;
          padding: 0.5rem 0.85rem;
          user-select: none;
        }

        .selected-text {
          color: var(--text-color, #1e293b);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .placeholder-text {
          color: var(--text-light, #94a3b8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .arrow-icon {
          flex-shrink: 0;
          opacity: 0.6;
          transition: transform 0.2s ease;
        }

        .arrow-icon.open {
          transform: rotate(180deg);
        }

        /* Dropdown Box */
        .searchable-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 99999;
          background: #ffffff;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.22);
          border: 2px solid var(--primary-color, #2563eb);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Search Header */
        .search-header {
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .search-input {
          width: 100%;
          padding: 8px 10px 8px 34px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          outline: none;
          background: #ffffff;
          color: #1e293b;
          font-size: 14px;
        }

        .search-input:focus {
          border-color: var(--primary-color, #2563eb);
        }

        /* Dropdown Body */
        .dropdown-body {
          display: flex;
          height: 220px;
          background: #ffffff;
        }

        .options-scroll-container {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none; /* Hide default browser scrollbar to use our custom one */
          -ms-overflow-style: none;
        }

        .options-scroll-container::-webkit-scrollbar {
          display: none;
        }

        /* Option Item */
        .option-row {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.12s ease;
        }

        .option-row:hover {
          background: rgba(37, 99, 235, 0.08);
        }

        .option-row.selected {
          background: rgba(37, 99, 235, 0.12);
        }

        .option-label {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .option-row.selected .option-label {
          color: var(--primary-color, #2563eb);
          font-weight: 700;
        }

        .option-sublabel {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .empty-option {
          padding: 30px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        /* Dedicated Custom Slide Bar (Always 100% Visible & Draggable) */
        .slide-bar-container {
          width: 22px;
          background: #f1f5f9;
          border-left: 1.5px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3px 0;
          user-select: none;
        }

        .slide-arrow-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          transition: background 0.15s;
        }

        .slide-arrow-btn:hover {
          background: #e2e8f0;
          color: var(--primary-color, #2563eb);
        }

        .slide-track {
          flex: 1;
          width: 12px;
          background: #e2e8f0;
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          margin: 2px 0;
        }

        .slide-thumb {
          position: absolute;
          left: 0;
          width: 12px;
          background: var(--primary-color, #2563eb);
          border-radius: 6px;
          cursor: grab;
          transition: background 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        }

        .slide-thumb:active {
          cursor: grabbing;
          background: #1d4ed8;
        }

        .thumb-grip {
          width: 6px;
          height: 2px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 1px;
        }
      `}</style>
    </div>
  );
}
