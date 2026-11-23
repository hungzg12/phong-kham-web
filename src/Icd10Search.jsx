import React, { useState, useEffect, useRef } from 'react';
import { Search, Database, Check, X, BookOpen } from 'lucide-react';

export default function Icd10Search({ valueCode = '', valueName = '', onChange, onOpenManager, disabled = false }) {
  const [query, setQuery] = useState(valueCode ? `[${valueCode}] ${valueName}` : valueName);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(valueCode ? `[${valueCode}] ${valueName}` : (valueName || ''));
  }, [valueCode, valueName]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchIcd = async (text) => {
    const q = text.replace(/^\[.*?\]\s*/, '').trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/icd10?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    searchIcd(val);
    if (!val.trim()) {
      onChange({ code: '', name: '' });
    }
  };

  const handleSelect = (item) => {
    onChange({ code: item.maICD, name: item.tenBenh });
    setQuery(`[${item.maICD}] ${item.tenBenh}`);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange({ code: '', name: '' });
    setResults([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: open ? 99999 : 'auto' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            disabled={disabled}
            placeholder="Gõ mã ICD (I10, E11...) hoặc tên bệnh (tăng huyết áp, dạ dày...)"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setOpen(true);
              if (query) searchIcd(query);
            }}
            style={{ width: '100%', paddingRight: query ? 30 : 10 }}
          />
          {query && !disabled && (
            <button
              type="button"
              className="icon-button"
              onClick={handleClear}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 3 }}
              title="Xóa lựa chọn"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="secondary"
          onClick={onOpenManager}
          title="Mở từ điển ICD-10 & Cập nhật từ Excel"
          style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: 13 }}
        >
          <BookOpen size={14} />
          <span>Từ điển Excel</span>
        </button>
      </div>

      {/* Autocomplete Dropdown - Luôn nằm trên cùng mọi form */}
      {open && (results.length > 0 || loading) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 999999,
            background: '#ffffff',
            border: '1px solid #0f766e',
            borderRadius: 8,
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.4), 0 8px 18px rgba(15, 23, 42, 0.25)',
            maxHeight: 260,
            overflowY: 'auto',
            marginTop: 4
          }}
        >
          {loading && <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>Đang tra cứu từ điển CSDL...</div>}
          {results.map(item => (
            <div
              key={item.maICD}
              onClick={() => handleSelect(item)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
            >
              <div>
                <span className="badge teal" style={{ marginRight: 8, fontFamily: 'monospace', fontWeight: 600 }}>
                  {item.maICD}
                </span>
                <b>{item.tenBenh}</b>
                {item.tenTiengAnh && (
                  <small style={{ display: 'block', color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    {item.tenTiengAnh}
                  </small>
                )}
              </div>
              {item.thuongGap && (
                <span className="badge amber" style={{ fontSize: 10, whiteSpace: 'nowrap', marginLeft: 8 }}>
                  Phổ biến
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
