import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, ShieldCheck, Clock, Building2, PackageCheck } from 'lucide-react';

export default function SqlInventoryView() {
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resB, resS] = await Promise.all([
        fetch('/api/pharmacy/batches'),
        fetch('/api/pharmacy/stats')
      ]);
      if (!resB.ok || !resS.ok) throw new Error('Không thể tải dữ liệu từ CSDL SQL Server.');
      const dataB = await resB.json();
      const dataS = await resS.json();
      setBatches(dataB);
      setStats(dataS);
    } catch (err) {
      setError(err.message || 'Lỗi kết nối SQL Server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getBadgeClass = (status) => {
    if (status.includes('ĐÃ HẾT HẠN')) return 'badge danger';
    if (status.includes('<= 30 NGÀY')) return 'badge danger';
    if (status.includes('<= 90 NGÀY')) return 'badge amber';
    return 'badge teal';
  };

  return (
    <div style={{ padding: '0 22px 22px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#003366', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageCheck size={20} />
            Dữ liệu trực tiếp từ SQL Server: vw_QuanLyLoThuoc_ChiTiet & vw_ThongKeThuoc_TheoHangSanXuat
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#666' }}>
            Quản trị tồn kho theo lô sản xuất thực tế, tự động phân cấp hạn dùng FEFO và kiểm soát theo Hãng dược phẩm.
          </p>
        </div>
        <button className="secondary" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới từ CSDL
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Stats by Manufacturer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map((s, idx) => (
          <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={14} />
              {s.hangSanXuat} ({s.nuocSanXuat})
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
              {(s.tongSoLuongTonKho || 0).toLocaleString('vi-VN')} đơn vị
            </div>
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>Trị giá: {(s.tongGiaTriTonKho || 0).toLocaleString('vi-VN')} đ</span>
              {s.soLoCanDate > 0 && (
                <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ {s.soLoCanDate} lô cận date</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Batches Table */}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>THUỐC / HOẠT CHẤT</th>
              <th>HÃNG SẢN XUẤT</th>
              <th>KHO LƯU TRỮ</th>
              <th>VỊ TRÍ KỆ</th>
              <th>SỐ LÔ SX</th>
              <th>HẠN DÙNG (FEFO)</th>
              <th>SỐ NGÀY CÒN</th>
              <th>TỒN KHO</th>
              <th>ĐƠN GIÁ NHẬP</th>
              <th>TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b, idx) => (
              <tr key={idx} style={{ background: b.trangThaiKhoa ? '#fef2f2' : undefined }}>
                <td>
                  <b>{b.tenHang}</b>
                  <br />
                  <small style={{ color: '#64748b' }}>{b.hoatChat}</small>
                </td>
                <td>
                  {b.hangSanXuat}
                  <br />
                  <small style={{ color: '#64748b' }}>{b.nuocSanXuat}</small>
                </td>
                <td>{b.tenKho}</td>
                <td><code>{b.viTriDayKe || 'Chưa xếp'}</code></td>
                <td><b>{b.soLoNhaSanXuat}</b></td>
                <td>{b.hanSuDung ? b.hanSuDung.split('-').reverse().join('/') : '—'}</td>
                <td style={{ fontWeight: 600, color: b.soNgayConHan <= 30 ? '#dc2626' : b.soNgayConHan <= 90 ? '#d97706' : '#16a34a' }}>
                  {b.soNgayConHan} ngày
                </td>
                <td>
                  <span className="lot-balance">{(b.soLuongTon || 0).toLocaleString('vi-VN')}</span> {b.donViCoSo}
                </td>
                <td>{(b.donGiaNhap || 0).toLocaleString('vi-VN')} đ</td>
                <td>
                  <span className={getBadgeClass(b.trangThaiHanDung)}>
                    {b.trangThaiHanDung}
                  </span>
                  {b.trangThaiKhoa && (
                    <span className="badge danger" style={{ marginLeft: 4 }}>ĐÃ KHÓA</span>
                  )}
                </td>
              </tr>
            ))}
            {!batches.length && !loading && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  Chưa có dữ liệu lô thuốc từ CSDL SQL Server.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
