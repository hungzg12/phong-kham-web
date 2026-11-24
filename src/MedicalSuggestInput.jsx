import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getClinicalSuggestions, removeVietnameseAccents } from './clinicalPhrases';
import { Sparkles } from 'lucide-react';
import './medical-suggest.css';

/**
 * Tách và in đậm các chữ cái/từ khóa khớp trong dòng gợi ý
 */
export function HighlightMatch({ text, query }) {
  if (!query || !query.trim()) {
    return <span>{text}</span>;
  }

  const cleanQuery = removeVietnameseAccents(query.trim());
  const words = cleanQuery.split(/\s+/).filter(Boolean);

  if (!words.length) {
    return <span>{text}</span>;
  }

  // Tạo mảng đánh dấu các vị trí ký tự trùng khớp
  const cleanText = removeVietnameseAccents(text);
  const matchedMask = new Array(text.length).fill(false);

  for (const word of words) {
    let startIdx = 0;
    while (startIdx < cleanText.length) {
      const foundIdx = cleanText.indexOf(word, startIdx);
      if (foundIdx === -1) break;
      for (let i = foundIdx; i < foundIdx + word.length; i++) {
        matchedMask[i] = true;
      }
      startIdx = foundIdx + 1;
    }
  }

  // Gom các đoạn text và đoạn match thành các span
  const segments = [];
  let currentSegment = '';
  let isCurrentMatch = matchedMask[0] || false;

  for (let i = 0; i < text.length; i++) {
    if (matchedMask[i] === isCurrentMatch) {
      currentSegment += text[i];
    } else {
      segments.push({ text: currentSegment, isMatch: isCurrentMatch });
      currentSegment = text[i];
      isCurrentMatch = matchedMask[i];
    }
  }
  if (currentSegment) {
    segments.push({ text: currentSegment, isMatch: isCurrentMatch });
  }

  return (
    <span>
      {segments.map((seg, idx) =>
        seg.isMatch ? (
          <strong key={idx} className="suggest-matched-char">
            {seg.text}
          </strong>
        ) : (
          <span key={idx}>{seg.text}</span>
        )
      )}
    </span>
  );
}

/**
 * Component ô nhập liệu có cơ chế tự động gợi ý dropdown 5 dòng theo từng ký tự gõ,
 * hỗ trợ in đậm chữ cái khớp và chọn bằng chuột hoặc bàn phím.
 */
export default function MedicalSuggestInput({
  type = 'reason',
  value: controlledValue,
  defaultValue = '',
  onChange,
  multiline = false,
  placeholder = '',
  disabled = false,
  rows = 3,
  className = '',
  style = {},
  name,
  required = false,
  maxLength
}) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const currentValue = isControlled ? (controlledValue || '') : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  // Cập nhật gợi ý mỗi khi value hoặc type thay đổi
  useEffect(() => {
    const list = getClinicalSuggestions(type, currentValue, 5);
    setSuggestions(list);
    setHighlightIdx(-1);
  }, [type, currentValue]);

  // Tự động tính toán vị trí hiển thị dropdown (theo tọa độ tuyệt đối Viewport bằng React Portal)
  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || typeof window === 'undefined') return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const isUp = spaceBelow < 230 && spaceAbove > 200;
    setDropUp(isUp);
    setDropdownPos({
      dropUp: isUp,
      left: rect.left,
      width: rect.width,
      top: isUp ? undefined : rect.bottom + 4,
      bottom: isUp ? (window.innerHeight - rect.top + 4) : undefined,
    });
  }, []);

  useEffect(() => {
    if (isOpen && suggestions.length > 0) {
      updatePosition();
      // Bắt cả sự kiện scroll ở các container con (overflow: auto) bằng capture: true
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    } else {
      setDropdownPos(null);
    }
  }, [isOpen, suggestions, updatePosition]);

  // Đóng dropdown khi click ra ngoài cả wrapper lẫn dropdown Portal
  useEffect(() => {
    function handleClickOutside(e) {
      const inWrapper = wrapperRef.current && wrapperRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inWrapper && !inDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(suggestion) {
    if (!isControlled) {
      setInternalValue(suggestion);
    }
    onChange?.(suggestion);
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    if (!isOpen || !suggestions.length) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && highlightIdx >= 0 && highlightIdx < suggestions.length) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const inputProps = {
    name,
    required,
    maxLength,
    value: currentValue,
    onChange: e => {
      const val = e.target.value;
      if (!isControlled) {
        setInternalValue(val);
      }
      onChange?.(val);
      if (!isOpen) setIsOpen(true);
    },
    onFocus: () => setIsOpen(true),
    onKeyDown: handleKeyDown,
    placeholder: placeholder || 'Nhập hoặc chọn gợi ý chuẩn y khoa...',
    disabled: disabled,
    className: `his-suggest-field ${className}`,
    style: { ...style }
  };

  const isDropdownActive = isOpen && suggestions.length > 0 && !disabled && dropdownPos;

  return (
    <div
      className={`his-suggest-wrapper ${isDropdownActive ? 'is-open' : ''}`}
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      {multiline ? (
        <textarea rows={rows} {...inputProps} />
      ) : (
        <input type="text" {...inputProps} />
      )}

      {isDropdownActive && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`his-suggest-dropdown ${dropdownPos.dropUp ? 'drop-up' : ''}`}
          role="listbox"
          style={{
            position: 'fixed',
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
            bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
            zIndex: 99999999,
          }}
        >
          <div className="his-suggest-dropdown-header">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={12} color="#0f766e" />
              Gợi ý chuẩn hóa (chọn bằng click hoặc phím ↑/↓ Enter)
            </span>
            <small>{suggestions.length} dòng</small>
          </div>
          <ul className="his-suggest-list">
            {suggestions.map((item, idx) => (
              <li
                key={idx}
                role="option"
                aria-selected={idx === highlightIdx}
                className={`his-suggest-item ${idx === highlightIdx ? 'active' : ''}`}
                onMouseDown={e => {
                  e.preventDefault(); // Tránh blur trước khi click hoàn tất
                  handleSelect(item);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
              >
                <span className="his-suggest-stt">{idx + 1}</span>
                <span className="his-suggest-text">
                  <HighlightMatch text={item} query={currentValue} />
                </span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
