import React, { useState, useEffect } from 'react';
import { X, Upload, Download, Search, Check, AlertCircle, FileSpreadsheet, RefreshCw, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Icd10ManagerModal({ onClose, notify }) {
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch current codes from SQL Server
  const fetchCodes = async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/icd10?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch {
      setStatusMsg('Không thể kết nối CSDL SQL Server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  // Handle Excel file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStatusMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);

        // Normalize columns to standard fields
        const normalized = rawJson.map(row => {
          const maICD = row['Mã ICD-10'] || row['MaICD'] || row['Mã bệnh'] || row['ICD'] || row['Code'] || '';
          const tenBenh = row['Tên bệnh (Tiếng Việt)'] || row['TenBenh'] || row['Tên bệnh'] || row['Description'] || '';
          const tenTiengAnh = row['Tên quốc tế (English)'] || row['TenTiengAnh'] || row['English'] || '';
          const maChuong = row['Mã chương'] || row['MaChuong'] || row['Chapter'] || '';
          const tenChuong = row['Tên chương bệnh'] || row['TenChuong'] || '';
          const thuongGap = row['Bệnh thường gặp (1=Có, 0=Không)'] ?? row['ThuongGap'] ?? row['Common'] ?? 0;

          return {
            maICD: String(maICD).trim().toUpperCase(),
            tenBenh: String(tenBenh).trim(),
            tenTiengAnh: String(tenTiengAnh || '').trim(),
            maChuong: String(maChuong || '').trim(),
            tenChuong: String(tenChuong || '').trim(),
            thuongGap: Number(thuongGap) === 1 || thuongGap === true ? 1 : 0
          };
        }).filter(r => r.maICD && r.tenBenh);

        if (!normalized.length) {
          setStatusMsg('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng kiểm tra tiêu đề cột.');
          setPreviewRows(null);
          return;
        }

        setPreviewRows(normalized);
      } catch (err) {
        setStatusMsg('Lỗi khi đọc file Excel: ' + err.message);
        setPreviewRows(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload parsed rows to backend SQL Server
  const handleConfirmImport = async () => {
    if (!previewRows || !previewRows.length) return;
    setImporting(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/icd10/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(previewRows)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        notify(`Đã cập nhật thành công ${result.total} mã bệnh vào CSDL SQL Server (Thêm mới: ${result.inserted}, Cập nhật: ${result.updated})`);
        setPreviewRows(null);
        setFileName('');
        fetchCodes();
      } else {
        setStatusMsg(result.error || 'Lỗi cập nhật CSDL.');
      }
    } catch (err) {
      setStatusMsg('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" style={{ maxWidth: 880, width: '92%' }} role="dialog" aria-modal="true" aria-label="Quản lý ICD-10">
        <button className="close icon-button" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="modal-symbol" style={{ margin: 0, width: 40, height: 40 }}>
            <Database size={22} />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>Từ điển & Cập nhật ICD-10 (Bộ Y tế)</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Quản lý danh mục chẩn đoán bệnh tật quốc tế kết nối trực tiếp CSDL SQL Server <code>QuanLyBenhVien</code>
            </p>
          </div>
        </div>

        {/* Section 1: Excel Import & Template */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, margin: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <b style={{ display: 'block', fontSize: 14 }}>Nhập / Cập nhật Danh mục từ Excel</b>
              <small style={{ color: '#64748b' }}>Hỗ trợ file chuẩn Bộ Y tế (.xlsx, .xls, .csv). Hệ thống tự động thêm mới hoặc cập nhật mã đã có.</small>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/api/icd10/template" download className="secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 13 }}>
                <Download size={14} /> Tải file mẫu Excel
              </a>
              <label className="primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, borderRadius: 6 }}>
                <Upload size={14} /> Chọn file Excel tải lên
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {fileName && previewRows && (
            <div style={{ marginTop: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>
                  <FileSpreadsheet size={15} style={{ verticalAlign: 'middle', marginRight: 5, color: '#16745e' }} />
                  File đã chọn: <b>{fileName}</b> ({previewRows.length} mã bệnh sẵn sàng nạp)
                </span>
                <button className="primary" onClick={handleConfirmImport} disabled={importing} style={{ padding: '6px 14px', fontSize: 13 }}>
                  {importing ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} Xác nhận lưu vào CSDL
                </button>
              </div>

              {/* Preview table (5 rows) */}
              <div style={{ overflowX: 'auto', maxHeight: 160 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '5px 8px' }}>Mã ICD</th>
                      <th style={{ padding: '5px 8px' }}>Tên bệnh tiếng Việt</th>
                      <th style={{ padding: '5px 8px' }}>Tên quốc tế</th>
                      <th style={{ padding: '5px 8px' }}>Chương</th>
                      <th style={{ padding: '5px 8px' }}>Thường gặp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '5px 8px' }}><b>{r.maICD}</b></td>
                        <td style={{ padding: '5px 8px' }}>{r.tenBenh}</td>
                        <td style={{ padding: '5px 8px', color: '#64748b' }}>{r.tenTiengAnh || '—'}</td>
                        <td style={{ padding: '5px 8px' }}>{r.maChuong}</td>
                        <td style={{ padding: '5px 8px' }}>{r.thuongGap ? 'Có' : 'Không'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 5 && (
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>... và {previewRows.length - 5} mã bệnh khác.</small>
              )}
            </div>
          )}

          {statusMsg && (
            <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} /> {statusMsg}
            </div>
          )}
        </div>

        {/* Section 2: Live Database Search & View */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <label className="search" style={{ flex: 1, margin: 0 }}>
            <Search size={15} />
            <input
              placeholder="Tra cứu theo mã (I10, E11...) hoặc tên bệnh (tăng huyết áp, dạ dày...)"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                fetchCodes(e.target.value);
              }}
            />
          </label>
          <button className="icon-button" title="Tải lại từ CSDL" onClick={() => fetchCodes(query)} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ ICD</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>TÊN BỆNH THEO BỘ Y TẾ</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>TÊN TIẾNG ANH</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>CHƯƠNG BỆNH</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ƯU TIÊN</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.maICD} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 10px' }}>
                    <span className="badge teal" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.maICD}</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <b>{item.tenBenh}</b>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#64748b' }}>{item.tenTiengAnh || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>
                    {item.maChuong ? `Chương ${item.maChuong}` : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {item.thuongGap && <span className="badge amber" style={{ fontSize: 11 }}>Thường gặp</span>}
                  </td>
                </tr>
              ))}
              {!list.length && !loading && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                    Không tìm thấy mã bệnh phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Đang hiển thị {list.length} mã bệnh từ CSDL SQL Server <code>QuanLyBenhVien</code>
          </span>
          <button className="secondary" onClick={onClose}>Đóng</button>
        </div>
      </section>
    </div>
  );
}
