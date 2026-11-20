import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Package, Pill, AlertCircle, X, Check, ArrowRight, RefreshCw, Building2 } from 'lucide-react';
import { useWorkspace, getWorkspace, transact, addLot, planFEFO, id, audit } from './workspace';
import { today } from './business-data';
import { actorRoles } from './roles';
import { AllocationPreview } from './AllocationPreview';
import { hisApi } from './api';

export default function Inventory({ role = 'admin', notify }) {
  const [inventory] = useWorkspace('inventory');
  const [stock] = useWorkspace('stock');
  const [db] = useWorkspace('business');
  const [ledger] = useWorkspace('ledger');

  const [warehouse, setWarehouse] = useState('all');
  const [manufacturer, setManufacturer] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [tab, setTab] = useState('lots');
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');

  // Live SQL Server pharmacy batches
  const [sqlBatches, setSqlBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSqlBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacy/batches');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSqlBatches(data);
        }
      }
    } catch {
      // Offline fallback to workspace
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSqlBatches();
  }, []);

  const actor = actorRoles[role];
  const warehouses = db.warehouses.filter(w => w.status === 'Đang hoạt động');

  // Normalize lots: merge live SQL Server batches with any newly added workspace lots so data never desyncs
  const activeLots = [
    ...sqlBatches.map(b => ({
      id: b.maLoHang + '_' + (b.tenKho || '') + '_' + b.soLoNhaSanXuat,
      medicineId: b.maHang || b.maLoHang,
      name: b.tenHang,
      activeIngredient: b.hoatChat,
      manufacturer: b.hangSanXuat,
      country: b.nuocSanXuat,
      warehouseName: b.tenKho || 'Kho Dược',
      warehouseId: b.tenKho,
      shelfLocation: b.viTriDayKe,
      lot: b.soLoNhaSanXuat,
      expiry: b.hanSuDung,
      daysLeft: b.soNgayConHan,
      qty: b.soLuongTon ?? 0,
      availQty: b.soLuongKhaDung ?? 0,
      unit: b.donViCoSo || 'Viên',
      unitPrice: b.donGiaNhap || 0,
      isLocked: !!b.trangThaiKhoa,
      statusLabel: b.trangThaiHanDung
    })),
    ...inventory.filter(l => !sqlBatches.some(b => b.soLoNhaSanXuat === l.lot && (b.maHang === l.medicineId || b.maLoHang === l.medicineId))).map(l => {
      const s = stock.find(item => item.id === l.medicineId);
      const w = db.warehouses.find(item => item.id === l.warehouseId);
      const expiryDate = new Date(l.expiry);
      const todayDate = new Date(today);
      const diffDays = Math.ceil((expiryDate - todayDate) / (1000 * 60 * 60 * 24));
      return {
        id: l.id,
        medicineId: l.medicineId,
        name: s?.name || l.medicineId,
        activeIngredient: '',
        manufacturer: 'Việt Nam',
        country: '',
        warehouseName: w?.name || l.warehouseId,
        warehouseId: l.warehouseId,
        shelfLocation: '',
        lot: l.lot,
        expiry: l.expiry,
        daysLeft: isNaN(diffDays) ? undefined : diffDays,
        qty: l.qty,
        availQty: l.qty,
        unit: s?.unit || 'Đơn vị',
        unitPrice: 0,
        isLocked: l.expiry < today,
        statusLabel: l.expiry < today ? 'ĐÃ HẾT HẠN' : diffDays <= 90 ? 'CẬN DATE' : 'CÒN HẠN SỬ DỤNG'
      };
    })
  ];

  // Unique list of warehouses and manufacturers for filtering
  const availableWarehouses = Array.from(new Set(activeLots.map(l => l.warehouseName).filter(Boolean)));
  const availableManufacturers = Array.from(new Set(activeLots.map(l => l.manufacturer).filter(Boolean)));

  const filteredLots = activeLots.filter(l => {
    const matchWarehouse = warehouse === 'all' || l.warehouseName === warehouse || l.warehouseId === warehouse;
    const matchMfr = manufacturer === 'all' || l.manufacturer === manufacturer;
    const query = search.trim().toLowerCase();
    const matchSearch = !query ||
      `${l.name} ${l.activeIngredient || ''} ${l.lot} ${l.manufacturer || ''} ${l.warehouseName || ''}`.toLowerCase().includes(query);

    let matchFilter = true;
    if (filter === 'Còn hạn') {
      matchFilter = l.daysLeft !== undefined ? l.daysLeft > 90 : l.expiry >= today;
    } else if (filter === 'Cận date') {
      matchFilter = l.daysLeft !== undefined ? (l.daysLeft >= 0 && l.daysLeft <= 90) : (l.expiry >= today);
    } else if (filter === 'Hết hạn') {
      matchFilter = l.daysLeft !== undefined ? l.daysLeft < 0 : l.expiry < today;
    } else if (filter === 'Tồn thấp') {
      matchFilter = l.qty < 100;
    }

    return matchWarehouse && matchMfr && matchSearch && matchFilter;
  });

  const selectedLots = activeLots.filter(l => warehouse === 'all' || l.warehouseName === warehouse || l.warehouseId === warehouse);
  const totalUnits = selectedLots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const expiredOrWarningLots = selectedLots.filter(l => (l.daysLeft !== undefined ? l.daysLeft <= 90 : l.expiry < today) || l.isLocked);

  function open(type) {
    setModal(type);
    setDraft(null);
    setError('');
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    const f = Object.fromEntries(new FormData(e.target));
    try {
      if (modal === 'product' && stock.some(s => s.id === f.id)) throw new Error('Mã mặt hàng đã tồn tại.');
      if (modal === 'transfer') {
        if (f.source === f.destination) throw new Error('Kho đích phải khác kho nguồn.');
        planFEFO(getWorkspace().inventory, [{ medicine: f.medicine, quantity: Number(f.quantity) }], f.source);
      }
      if (modal !== 'transfer' && f.expiry < today) throw new Error('Không nhập lô đã hết hạn vào tồn khả dụng.');
      setDraft(f);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirm() {
    try {
      if (modal === 'lot') {
        await hisApi.importPharmacyLot({
          medicineId: draft.medicine,
          warehouseId: draft.warehouse || 'KHO_NGOAI_TRU',
          lot: draft.lot,
          expiry: draft.expiry,
          qty: Number(draft.qty),
          unitPrice: 1500,
          manufacturer: 'Việt Nam'
        });
      } else if (modal === 'product') {
        await hisApi.createPharmacyProduct({
          id: draft.id,
          name: draft.name,
          type: draft.type,
          unit: draft.unit,
          price: 10000
        });
      } else if (modal === 'transfer') {
        await hisApi.transferPharmacyStock({
          medicineId: draft.medicine,
          sourceWarehouse: draft.source,
          targetWarehouse: draft.destination,
          quantity: Number(draft.quantity)
        });
      }

      transact(d => {
        const event = id(modal === 'transfer' ? 'DC' : 'NK');
        if (modal === 'transfer') {
          const allocations = planFEFO(d.inventory, [{ medicine: draft.medicine, quantity: Number(draft.quantity) }], draft.source);
          for (const a of allocations) {
            const matchLot = d.inventory.find(l => l.id === a.lotId);
            if (matchLot) matchLot.qty -= a.quantity;
            d.ledger.unshift({ id: id('NK'), date: today, time: new Date().toISOString(), medicineId: a.medicineId, warehouseId: a.warehouseId, lot: a.lot, delta: -a.quantity, event });
            addLot(d, { medicineId: a.medicineId, warehouseId: draft.destination, lot: a.lot, expiry: a.expiry, qty: a.quantity }, event);
          }
        } else {
          let medicine = draft.medicine;
          if (modal === 'product') {
            if (!d.stock.some(s => s.id === draft.id)) {
              medicine = draft.id;
              d.stock.push({ id: medicine, name: draft.name, type: draft.type, unit: draft.unit, qty: 0 });
            }
          }
          if (Number(draft.qty) > 0) {
            addLot(d, { medicineId: medicine, warehouseId: draft.warehouse, lot: draft.lot, expiry: draft.expiry, qty: Number(draft.qty) }, event);
          }
        }
        audit(d, (modal === 'transfer' ? 'Điều chuyển kho ' : 'Nhập lô ') + event, actor.person);
      });

      setModal(null);
      notify(modal === 'transfer' ? 'Đã điều chuyển kho thành công (SQL Server)' : modal === 'product' ? 'Đã thêm mặt hàng mới (SQL Server)' : 'Đã nhập lô vào kho thành công (SQL Server)');
      await fetchSqlBatches();
    } catch (err) {
      setError(err.message || 'Lỗi xử lý giao dịch kho SQL Server.');
    }
  }

  function exportLots() {
    const headers = ['Mã hàng', 'Tên mặt hàng', 'Hoạt chất', 'Hãng sản xuất', 'Nước sản xuất', 'Kho lưu trữ', 'Vị trí kệ', 'Số lô SX', 'Hạn dùng', 'Số ngày còn', 'Số lượng tồn', 'Đơn vị tính', 'Trạng thái'];
    const rows = filteredLots.map(l => [
      l.medicineId,
      l.name,
      l.activeIngredient || '',
      l.manufacturer || '',
      l.country || '',
      l.warehouseName || '',
      l.shelfLocation || '',
      l.lot,
      l.expiry,
      l.daysLeft !== undefined ? l.daysLeft : '',
      l.qty,
      l.unit,
      l.daysLeft !== undefined && l.daysLeft < 0 ? 'Đã hết hạn' : l.daysLeft !== undefined && l.daysLeft <= 90 ? 'Cận date' : 'Khả dụng'
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ton-kho-lo-${today}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const warehouseOptions = availableWarehouses.length > 0
    ? availableWarehouses.map(name => <option key={name} value={name}>{name}</option>)
    : warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>);

  return (
    <>
      <div className="business-summary">
        <div>
          <span><Package size={18} />Số lô trong phạm vi</span>
          <b>{selectedLots.length}</b>
        </div>
        <div>
          <span><Pill size={18} />Tổng đơn vị tồn</span>
          <b>{totalUnits.toLocaleString('vi-VN')}</b>
        </div>
        <div>
          <span><AlertCircle size={18} />Lô hết hạn & cận date</span>
          <b style={{ color: expiredOrWarningLots.length > 0 ? '#b91c1c' : undefined }}>
            {expiredOrWarningLots.length}
          </b>
        </div>
      </div>

      <section className="panel inventory-panel">
        <div className="panel-heading">
          <div>
            <h2>Tồn kho theo kho & lô</h2>
            <p>Quản lý tồn kho theo lô sản xuất, tự động phân bổ hạn dùng theo nguyên tắc FEFO.</p>
          </div>
          <div className="row-actions">
            <button className="secondary" onClick={() => open('transfer')}>Điều chuyển</button>
            <button className="secondary" onClick={() => open('product')}><Plus size={14} />Thêm mặt hàng</button>
            <button className="primary" onClick={() => open('lot')}><Plus size={15} />Nhập lô</button>
          </div>
        </div>

        <div className="stock-toolbar">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Tìm mặt hàng hoặc lô"
              placeholder="Tên thuốc, hoạt chất, số lô, hãng SX..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <select aria-label="Lọc kho" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
            <option value="all">Tất cả kho</option>
            {warehouseOptions}
          </select>
          {availableManufacturers.length > 0 && (
            <select aria-label="Lọc hãng sản xuất" value={manufacturer} onChange={e => setManufacturer(e.target.value)}>
              <option value="all">Tất cả hãng sản xuất</option>
              {availableManufacturers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <select aria-label="Lọc hạn dùng và tồn" value={filter} onChange={e => setFilter(e.target.value)}>
            {['Tất cả', 'Còn hạn', 'Cận date', 'Hết hạn', 'Tồn thấp'].map(x => <option key={x}>{x}</option>)}
          </select>
          <button className="secondary" onClick={exportLots}>
            <Download size={15} />Xuất tồn kho
          </button>
          <button className="icon-button" title="Làm mới dữ liệu" onClick={fetchSqlBatches} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="business-tabs inventory-tabs" style={{ marginLeft: 22, marginRight: 22 }}>
          <button className={tab === 'lots' ? 'selected' : ''} onClick={() => setTab('lots')}>
            Danh sách lô
          </button>
          <button className={tab === 'ledger' ? 'selected' : ''} onClick={() => setTab('ledger')}>
            Lịch sử xuất nhập
          </button>
        </div>

        {tab === 'lots' ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>MẶT HÀNG / HOẠT CHẤT</th>
                    <th>HÃNG SẢN XUẤT</th>
                    <th>KHO & VỊ TRÍ KỆ</th>
                    <th>SỐ LÔ SX</th>
                    <th>HẠN DÙNG (FEFO)</th>
                    <th>TỒN KHO</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.map(l => {
                    const isExpired = l.daysLeft !== undefined ? l.daysLeft < 0 : l.expiry < today;
                    const isUrgent = l.daysLeft !== undefined && l.daysLeft >= 0 && l.daysLeft <= 30;
                    const isNear = l.daysLeft !== undefined && l.daysLeft > 30 && l.daysLeft <= 90;

                    let badgeClass = 'teal';
                    let badgeText = 'Khả dụng';
                    if (l.isLocked || isExpired) {
                      badgeClass = 'danger';
                      badgeText = isExpired ? 'Đã hết hạn' : 'Đã khóa';
                    } else if (isUrgent) {
                      badgeClass = 'danger';
                      badgeText = `Cận date (${l.daysLeft} ngày)`;
                    } else if (isNear) {
                      badgeClass = 'amber';
                      badgeText = `Cận date (${l.daysLeft} ngày)`;
                    } else if (l.qty < 100) {
                      badgeClass = 'amber';
                      badgeText = 'Tồn thấp';
                    }

                    return (
                      <tr key={l.id}>
                        <td>
                          <b>{l.name}</b>
                          {l.activeIngredient && (
                            <small style={{ display: 'block', color: '#64748b' }}>{l.activeIngredient}</small>
                          )}
                        </td>
                        <td>
                          <span>{l.manufacturer || '—'}</span>
                          {l.country && (
                            <small style={{ display: 'block', color: '#888' }}>{l.country}</small>
                          )}
                        </td>
                        <td>
                          <b>{l.warehouseName}</b>
                          {l.shelfLocation && (
                            <small style={{ display: 'block', color: '#64748b' }}>{l.shelfLocation}</small>
                          )}
                        </td>
                        <td>
                          <span className="lot-tag" style={{ fontWeight: 600 }}>{l.lot}</span>
                        </td>
                        <td>
                          <span>{l.expiry ? l.expiry.split('-').reverse().join('/') : '—'}</span>
                          {l.daysLeft !== undefined && (
                            <small style={{
                              display: 'block',
                              color: isExpired || isUrgent ? '#ef4444' : isNear ? '#d97706' : '#10b981',
                              fontWeight: 500
                            }}>
                              {isExpired
                                ? `Quá hạn ${Math.abs(l.daysLeft)} ngày`
                                : `Còn ${l.daysLeft} ngày`}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="lot-balance">{l.qty.toLocaleString('vi-VN')}</span> {l.unit}
                          {l.isLocked && <small style={{ display: 'block', color: '#ef4444' }}>Khóa cấp phát</small>}
                        </td>
                        <td>
                          <span className={'badge ' + badgeClass}>{badgeText}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!filteredLots.length && (
              <div className="business-empty">Không có lô phù hợp trong kho đã chọn.</div>
            )}
          </>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>THỜI GIAN</th>
                    <th>MẶT HÀNG</th>
                    <th>KHO</th>
                    <th>SỐ LÔ</th>
                    <th>BIẾN ĐỘNG</th>
                    <th>CHỨNG TỪ</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger
                    .filter(l => (warehouse === 'all' || l.warehouseId === warehouse) &&
                      ((stock.find(s => s.id === l.medicineId)?.name || '') + ' ' + l.medicineId + ' ' + l.lot).toLowerCase().includes(search.toLowerCase()))
                    .slice(0, 100)
                    .map(l => (
                      <tr key={l.id}>
                        <td>{new Date(l.time).toLocaleString('vi-VN')}</td>
                        <td>{stock.find(s => s.id === l.medicineId)?.name}</td>
                        <td>{db.warehouses.find(w => w.id === l.warehouseId)?.name || l.warehouseId}</td>
                        <td>{l.lot}</td>
                        <td><b style={{ color: l.delta < 0 ? '#b48168' : '#5b9b76' }}>{l.delta > 0 ? '+' : ''}{l.delta}</b></td>
                        <td>{l.event}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!ledger.some(l => warehouse === 'all' || l.warehouseId === warehouse) && (
              <div className="business-empty">Chưa có giao dịch kho được ghi nhận.</div>
            )}
            <p className="form-hint" style={{ padding: 16 }}>Hiển thị tối đa 100 biến động gần nhất trong phạm vi kho.</p>
          </>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section className="modal business-modal wide-modal" role="dialog" aria-modal="true" aria-label="Giao dịch kho" onClick={e => e.stopPropagation()}>
            <button className="close icon-button" aria-label="Đóng giao dịch kho" onClick={() => setModal(null)}>
              <X size={20} />
            </button>
            <h2>
              {draft
                ? 'Xác nhận giao dịch'
                : modal === 'transfer'
                ? 'Điều chuyển giữa hai kho'
                : modal === 'product'
                ? 'Thêm mặt hàng và tồn đầu'
                : 'Nhập lô hàng'}
            </h2>
            <p className="dialog-subtitle">
              {draft ? 'Kiểm tra thông tin trước khi ghi nhận thay đổi tồn kho.' : 'Chọn đúng kho, số lô và hạn dùng của hàng hóa.'}
            </p>
            {draft ? (
              <>
                <div className="detail-list">
                  {Object.entries(draft).map(([k, v]) => (
                    <div key={k}>
                      <span>
                        {{
                          medicine: 'Mặt hàng',
                          warehouse: 'Kho nhập',
                          source: 'Kho nguồn',
                          destination: 'Kho đích',
                          lot: 'Số lô',
                          expiry: 'Hạn dùng',
                          qty: 'Số lượng nhập',
                          quantity: 'Số lượng chuyển',
                          id: 'Mã hàng',
                          name: 'Tên mặt hàng',
                          unit: 'Đơn vị tính',
                          type: 'Nhóm hàng'
                        }[k]}
                      </span>
                      <b>
                        {['source', 'destination', 'warehouse'].includes(k)
                          ? db.warehouses.find(w => w.id === v)?.name || v
                          : k === 'medicine'
                          ? stock.find(s => s.id === v)?.name || v
                          : v}
                      </b>
                    </div>
                  ))}
                </div>
                {modal === 'transfer' && (
                  <AllocationPreview requests={[{ medicine: draft.medicine, quantity: Number(draft.quantity) }]} warehouse={draft.source} />
                )}
                <div className="dialog-actions">
                  <button className="secondary" onClick={() => setDraft(null)}>Sửa lại thông tin</button>
                  <button className="primary" onClick={confirm}><Check size={16} />Xác nhận ghi nhận kho</button>
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                {modal === 'product' ? (
                  <>
                    <label>Mã mặt hàng<input name="id" required pattern="[A-Za-z0-9_-]+" placeholder="TH005 hoặc VT002" /></label>
                    <label>Tên mặt hàng<input name="name" required /></label>
                    <div className="form-grid">
                      <label>Nhóm hàng<select name="type"><option>Thuốc</option><option>Vật tư y tế</option></select></label>
                      <label>Đơn vị tính<input name="unit" required /></label>
                    </div>
                  </>
                ) : (
                  <label>Mặt hàng
                    <select name="medicine" required>
                      <option value="">Chọn thuốc / vật tư</option>
                      {stock.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
                    </select>
                  </label>
                )}
                {modal === 'transfer' ? (
                  <>
                    <div className="form-grid">
                      <label>Kho nguồn
                        <select name="source" required defaultValue={warehouse !== 'all' ? warehouse : ''}>
                          <option value="">Chọn kho nguồn</option>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </label>
                      <label>Kho đích
                        <select name="destination" required>
                          <option value="">Chọn kho đích</option>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <label>Số lượng điều chuyển<input name="quantity" type="number" min="1" step="1" required /></label>
                  </>
                ) : (
                  <>
                    <label>Kho nhập
                      <select name="warehouse" required defaultValue={warehouse !== 'all' ? warehouse : 'KHO001'}>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </label>
                    <div className="form-grid">
                      <label>Số lô<input name="lot" required /></label>
                      <label>Hạn dùng<input name="expiry" type="date" required min={today} /></label>
                    </div>
                    <label>Số lượng nhập<input name="qty" type="number" min="1" step="1" required /></label>
                  </>
                )}
                <button className="primary full">Kiểm tra giao dịch <ArrowRight size={16} /></button>
              </form>
            )}
            {error && <p className="form-error" role="alert" style={{ marginTop: 15 }}>{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}
