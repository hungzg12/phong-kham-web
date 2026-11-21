import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Download, Package, Pill, AlertCircle, X, Check, ArrowRight, RefreshCw, Building2, Trash2, FileSpreadsheet, Truck, ShieldCheck } from 'lucide-react';
import { useWorkspace, getWorkspace, syncWithSqlServer, planFEFO } from './workspace';
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
  const operation = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Live SQL Server pharmacy batches
  const [loading, setLoading] = useState(false);

  // Multi-item shipment state for 'lot' (Đợt nhập hàng / Lô hàng hãng)
  const [shipmentForm, setShipmentForm] = useState({
    shipmentName: 'Lô Hàng Dược Phẩm Nhập Mới ' + today,
    warehouseId: 'KHO_TONG',
    supplier: 'Công ty Cổ phần Dược phẩm Zuellig Pharma Việt Nam',
    manufacturer: 'GSK (GlaxoSmithKline)',
    invoiceNumber: 'HD-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-01',
    importDate: today,
    deliveryPerson: 'Nguyễn Văn Giao Hàng',
    receiverPerson: 'DS. Lê Quốc Huy (Dược sĩ Trưởng)',
    note: 'Đợt nhập dược phẩm theo hợp đồng cung ứng 2026',
    lines: [
      {
        medicineId: 'TH_PARA500',
        lot: 'GSK-' + new Date().getFullYear() + '-01',
        mfgDate: today,
        expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
        qty: 1000,
        unit: 'Viên',
        unitPrice: 1200,
        shelfLocation: 'Dãy A - Kệ 01 - Tầng 2',
        packaging: 'Hộp 15 vỉ x 12 viên',
        regNumber: 'VD-21345-19'
      }
    ]
  });

  const fetchSqlBatches = async () => {
    setLoading(true);
    try {
      await syncWithSqlServer();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSqlBatches();
  }, []);

  const actor = actorRoles[role];
  const warehouses = db.warehouses.filter(w => w.status === 'Đang hoạt động');

  // SQL snapshot is authoritative
  const activeLots = inventory.map(l => {
    const s = stock.find(item => item.id === l.medicineId);
    const w = db.warehouses.find(item => item.id === l.warehouseId);
    const expiryDate = new Date(l.expiry);
    const todayDate = new Date(today);
    const diffDays = Math.ceil((expiryDate - todayDate) / (1000 * 60 * 60 * 24));
    return {
      id: l.id,
      medicineId: l.medicineId,
      name: s?.name || l.medicineId,
      activeIngredient: l.activeIngredient || '',
      manufacturer: l.manufacturer || '',
      country: l.country || '',
      warehouseName: w?.name || l.warehouseId,
      warehouseId: l.warehouseId,
      shelfLocation: l.shelfLocation || '',
      lot: l.lot,
      expiry: l.expiry,
      daysLeft: isNaN(diffDays) ? undefined : diffDays,
      qty: l.physicalQty ?? l.qty,
      availQty: l.qty,
      unit: s?.unit || 'Đơn vị',
      unitPrice: l.unitPrice || 0,
      isLocked: !!l.locked || l.expiry < today,
      statusLabel: l.expiry < today ? 'ĐÃ HẾT HẠN' : diffDays <= 90 ? 'CẬN DATE' : 'CÒN HẠN SỬ DỤNG'
    };
  });

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
    operation.current = null;
    setModal(type);
    setDraft(null);
    setError('');

    if (type === 'lot') {
      // Reset shipment form with valid defaults
      const defaultMed = stock[0]?.id || 'TH_PARA500';
      const medItem = stock.find(s => s.id === defaultMed);
      setShipmentForm({
        shipmentName: 'Lô Hàng Dược Phẩm Nhập Mới ' + today,
        warehouseId: warehouse !== 'all' ? warehouse : 'KHO_TONG',
        supplier: 'Công ty Cổ phần Dược phẩm Zuellig Pharma Việt Nam',
        manufacturer: 'GSK (GlaxoSmithKline)',
        invoiceNumber: 'HD-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-01',
        importDate: today,
        deliveryPerson: 'Nguyễn Văn Giao Hàng',
        receiverPerson: 'DS. Lê Quốc Huy (Dược sĩ Trưởng)',
        note: 'Đợt nhập dược phẩm theo hợp đồng cung ứng 2026',
        lines: [
          {
            medicineId: defaultMed,
            lot: 'BATCH-' + Math.floor(1000 + Math.random() * 9000),
            mfgDate: today,
            expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
            qty: 500,
            unit: medItem?.unit || 'Viên',
            unitPrice: medItem?.price || 1500,
            shelfLocation: 'Dãy A - Kệ 01',
            packaging: 'Hộp chuẩn',
            regNumber: 'VD-21345-19'
          }
        ]
      });
    }
  }

  // Add line to shipment
  function addShipmentLine() {
    const med = stock[0]?.id || 'TH_PARA500';
    const medItem = stock.find(s => s.id === med);
    setShipmentForm(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          medicineId: med,
          lot: 'BATCH-' + Math.floor(1000 + Math.random() * 9000),
          mfgDate: today,
          expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
          qty: 200,
          unit: medItem?.unit || 'Viên',
          unitPrice: medItem?.price || 2000,
          shelfLocation: 'Kệ FEFO',
          packaging: 'Hộp chuẩn',
          regNumber: 'VN-17552-13'
        }
      ]
    }));
  }

  function removeShipmentLine(idx) {
    setShipmentForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  }

  function updateShipmentLine(idx, key, value) {
    setShipmentForm(prev => {
      const nextLines = [...prev.lines];
      const target = { ...nextLines[idx], [key]: value };
      if (key === 'medicineId') {
        const found = stock.find(s => s.id === value);
        if (found) {
          target.unit = found.unit || target.unit;
          target.unitPrice = found.price || target.unitPrice;
        }
      }
      nextLines[idx] = target;
      return { ...prev, lines: nextLines };
    });
  }

  // Multi-item totals
  const totalShipmentUnits = shipmentForm.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const totalShipmentValue = shipmentForm.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);

  // Submit multi-item shipment directly to SQL Server!
  async function submitMultiItemShipment(e) {
    e.preventDefault();
    setError('');

    if (!shipmentForm.lines.length) {
      setError('Cần ít nhất một loại thuốc trong đợt nhập hàng.');
      return;
    }

    for (let i = 0; i < shipmentForm.lines.length; i++) {
      const l = shipmentForm.lines[i];
      if (!l.medicineId) { setError(`Dòng ${i + 1}: Vui lòng chọn loại thuốc.`); return; }
      if (!l.lot) { setError(`Dòng ${i + 1}: Vui lòng nhập số lô sản xuất.`); return; }
      if (!l.expiry || l.expiry <= today) { setError(`Dòng ${i + 1}: Hạn dùng phải sau ngày hôm nay.`); return; }
      if (!l.qty || Number(l.qty) <= 0) { setError(`Dòng ${i + 1}: Số lượng nhập phải lớn hơn 0.`); return; }
    }

    setSaving(true);
    try {
      const payload = {
        action: 'import_lot',
        warehouseId: shipmentForm.warehouseId,
        supplier: shipmentForm.supplier,
        manufacturer: shipmentForm.manufacturer,
        importDate: shipmentForm.importDate,
        invoiceNumber: shipmentForm.invoiceNumber,
        shipmentName: shipmentForm.shipmentName,
        lines: shipmentForm.lines.map(l => ({
          medicineId: l.medicineId,
          lot: l.lot.trim(),
          expiry: l.expiry,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice) || 1000,
          shelfLocation: l.shelfLocation || 'Kệ kho'
        }))
      };

      const result = await hisApi.importPharmacyLot(payload);
      await syncWithSqlServer();
      setModal(null);
      notify(`Đã nhập kho thành công đợt hàng ${result.shipmentId || ''}: ${shipmentForm.lines.length} loại thuốc, ${totalShipmentUnits.toLocaleString('vi-VN')} đơn vị tồn.`);
    } catch (err) {
      setError(err.message || 'Lỗi khi nhập kho dược phẩm.');
    } finally {
      setSaving(false);
    }
  }

  // Normal submit for transfer and product creation
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
      setDraft(f);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError('');
    if (!operation.current) operation.current = crypto.randomUUID();
    try {
      const values = modal === 'transfer'
        ? { kind: 'Điều chuyển', medicine: draft.medicine, warehouse: draft.source, destination: draft.destination, quantity: Number(draft.quantity), price: 0, reason: draft.reason }
        : { kind: 'Nhập kho', medicine: draft.medicine, warehouse: draft.warehouse, lot: draft.lot, expiry: draft.expiry, quantity: Number(draft.qty), price: Number(draft.price), reason: draft.reason };

      const result = await hisApi.pharmacyAction({
        ...values,
        ...(modal === 'product' ? { productId: draft.id, name: draft.name, unit: draft.unit, productType: draft.type, ingredient: draft.ingredient, strength: draft.strength, route: draft.route, form: draft.form } : {}),
        action: modal === 'product' ? 'createProduct' : 'saveMovement',
        role,
        staffId: actor.staffId,
        requestId: operation.current
      });

      await hisApi.pharmacyAction({ action: 'approveMovement', id: result.id, role, staffId: actor.staffId, requestId: operation.current + '-approve' });
      await syncWithSqlServer();
      setModal(null);
      notify('Đã ghi sổ giao dịch kho trong SQL Server');
    } catch (err) {
      setError(err.message || 'Không lưu được giao dịch kho.');
      await syncWithSqlServer();
    } finally {
      setSaving(false);
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

  const availableWarehouses = [...new Set(activeLots.map(l => l.warehouseId))];
  const availableManufacturers = [...new Set(activeLots.map(l => l.manufacturer).filter(Boolean))];
  const warehouseOptions = availableWarehouses.length > 0
    ? availableWarehouses.map(name => <option key={name} value={name}>{db.warehouses.find(w => w.id === name)?.name || name}</option>)
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
            <button className="secondary" onClick={() => open('transfer')}>Điều chuyển kho</button>
            <button className="secondary" onClick={() => open('product')}><Plus size={14} />Thêm mặt hàng</button>
            <button className="primary" onClick={() => open('lot')}><Plus size={15} />Nhập đợt hàng / Nhiều loại thuốc</button>
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

          <select aria-label="Lọc theo kho" value={warehouse} onChange={e => setWarehouse(e.target.value)} className="his-select">
            <option value="all">Tất cả kho</option>
            {warehouseOptions}
          </select>

          <select aria-label="Lọc hãng sản xuất" value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="his-select">
            <option value="all">Tất cả hãng sản xuất</option>
            {availableManufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select aria-label="Lọc hạn dùng" value={filter} onChange={e => setFilter(e.target.value)} className="his-select">
            {['Tất cả', 'Còn hạn', 'Cận date', 'Hết hạn', 'Tồn thấp'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <button className="secondary" onClick={exportLots}>
            <Download size={15} />Xuất tồn kho
          </button>

          <button className="icon-button" aria-label="Đồng bộ SQL Server" onClick={fetchSqlBatches} disabled={loading} title="Đồng bộ CSDL SQL Server">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          </button>
        </div>

        <div className="inventory-tabs">
          <button className={tab === 'lots' ? 'active' : ''} onClick={() => setTab('lots')}>Danh sách lô</button>
          <button className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>Lịch sử xuất nhập</button>
        </div>

        {tab === 'lots' && (
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
                  {filteredLots.map(l => (
                    <tr key={l.id} className={l.isLocked ? 'lot-locked' : ''}>
                      <td>
                        <b>{l.name}</b>
                        {l.activeIngredient && <small>{l.activeIngredient}</small>}
                      </td>
                      <td>
                        {l.manufacturer || '—'}
                        {l.country && <small>{l.country}</small>}
                      </td>
                      <td>
                        <b>{l.warehouseName}</b>
                        {l.shelfLocation && <small>{l.shelfLocation}</small>}
                      </td>
                      <td><code>{l.lot}</code></td>
                      <td>
                        {l.expiry ? new Date(l.expiry).toLocaleDateString('vi-VN') : '—'}
                        <small className={l.daysLeft !== undefined && l.daysLeft < 0 ? 'text-danger' : l.daysLeft !== undefined && l.daysLeft <= 90 ? 'text-warning' : ''}>
                          {l.daysLeft !== undefined && l.daysLeft < 0
                            ? `Quá hạn ${Math.abs(l.daysLeft)} ngày`
                            : l.daysLeft !== undefined
                            ? `Còn ${l.daysLeft} ngày`
                            : ''}
                        </small>
                      </td>
                      <td>
                        <b>{l.qty.toLocaleString('vi-VN')}</b> {l.unit}
                        {l.availQty !== l.qty && <small>Khả dụng: {l.availQty.toLocaleString('vi-VN')}</small>}
                      </td>
                      <td>
                        <span className={`badge ${l.daysLeft !== undefined && l.daysLeft < 0 ? 'danger' : l.daysLeft !== undefined && l.daysLeft <= 90 ? 'amber' : 'teal'}`}>
                          {l.daysLeft !== undefined && l.daysLeft < 0 ? 'Đã hết hạn' : l.daysLeft !== undefined && l.daysLeft <= 90 ? 'Cận date' : 'Khả dụng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!filteredLots.length && (
              <div className="business-empty">
                <Package size={32} />
                <h3>Không tìm thấy lô hàng phù hợp</h3>
                <p>Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
              </div>
            )}
          </>
        )}

        {tab === 'ledger' && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>THỜI ĐIỂM</th>
                    <th>CHỨNG TỪ</th>
                    <th>MẶT HÀNG</th>
                    <th>KHO</th>
                    <th>SỐ LÔ</th>
                    <th>BIẾN ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger
                    .filter(l => warehouse === 'all' || l.warehouseId === warehouse)
                    .map(l => (
                      <tr key={l.id}>
                        <td>{l.time ? new Date(l.time).toLocaleString('vi-VN') : '—'}</td>
                        <td><code>{l.event}</code></td>
                        <td>{stock.find(s => s.id === l.medicineId)?.name || l.medicineId}</td>
                        <td>{db.warehouses.find(w => w.id === l.warehouseId)?.name || l.warehouseId}</td>
                        <td><code>{l.lot}</code></td>
                        <td>
                          <b className={l.delta > 0 ? 'text-success' : 'text-danger'}>
                            {l.delta > 0 ? `+${l.delta}` : l.delta}
                          </b>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!ledger.some(l => warehouse === 'all' || l.warehouseId === warehouse) && (
              <div className="business-empty">Chưa có giao dịch kho được ghi nhận.</div>
            )}
          </>
        )}
      </section>

      {/* MODAL POPUP */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={`modal business-modal wide-modal ${modal === 'lot' ? 'his-consignment-modal' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Giao dịch kho dược"
            onClick={e => e.stopPropagation()}
          >
            <button className="close icon-button" aria-label="Đóng giao dịch kho" onClick={() => setModal(null)}>
              <X size={20} />
            </button>

            {modal === 'lot' ? (
              /* =========================================================================
                 FORM NHẬP ĐỢT HÀNG / LÔ HÀNG ĐA THUỐC (VIETTEL HIS CONSIGNMENT STANDARD)
                 ========================================================================= */
              <div className="his-consignment-container">
                <div className="his-form-header">
                  <div className="his-header-title">
                    <Truck size={24} className="his-header-icon" />
                    <div>
                      <h2>Nhập đợt hàng / Hóa đơn dược phẩm (Nhiều loại thuốc trong lô)</h2>
                      <p className="his-header-sub">
                        Theo dõi kiện hàng nhà sản xuất, tự động phân rã các dòng thuốc, số lô, hạn dùng FEFO vào CSDL SQL Server.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={submitMultiItemShipment} className="his-form-body">
                  {/* PHẦN 1: THÔNG TIN HÓA ĐƠN & NHÀ CUNG CẤP */}
                  <div className="his-card">
                    <div className="his-card-header">
                      <FileSpreadsheet size={16} />
                      <span>1. Thông tin Đợt nhập & Hóa đơn chứng từ</span>
                    </div>
                    <div className="his-card-body">
                      <div className="form-row form-row-3">
                        <label className="his-field-label">
                          Tên đợt nhập hàng / Kiện hàng *
                          <input
                            required
                            value={shipmentForm.shipmentName}
                            onChange={e => setShipmentForm({ ...shipmentForm, shipmentName: e.target.value })}
                            className="his-input"
                          />
                        </label>
                        <label className="his-field-label">
                          Kho tiếp nhận nhập kho *
                          <select
                            value={shipmentForm.warehouseId}
                            onChange={e => setShipmentForm({ ...shipmentForm, warehouseId: e.target.value })}
                            className="his-select"
                          >
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="his-field-label">
                          Ngày nhập kho *
                          <input
                            type="date"
                            required
                            value={shipmentForm.importDate}
                            onChange={e => setShipmentForm({ ...shipmentForm, importDate: e.target.value })}
                            className="his-input"
                          />
                        </label>
                      </div>

                      <div className="form-row form-row-3">
                        <label className="his-field-label">
                          Hãng sản xuất đại diện *
                          <input
                            required
                            value={shipmentForm.manufacturer}
                            onChange={e => setShipmentForm({ ...shipmentForm, manufacturer: e.target.value })}
                            placeholder="GSK, AstraZeneca, Merufa..."
                            className="his-input"
                          />
                        </label>
                        <label className="his-field-label">
                          Nhà phân phối / Nhà cung cấp *
                          <input
                            required
                            value={shipmentForm.supplier}
                            onChange={e => setShipmentForm({ ...shipmentForm, supplier: e.target.value })}
                            placeholder="Zuellig Pharma Việt Nam..."
                            className="his-input"
                          />
                        </label>
                        <label className="his-field-label">
                          Số hóa đơn GTGT / Chứng từ *
                          <input
                            required
                            value={shipmentForm.invoiceNumber}
                            onChange={e => setShipmentForm({ ...shipmentForm, invoiceNumber: e.target.value })}
                            placeholder="HD-2026-001"
                            className="his-input"
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label className="his-field-label">
                          Người giao hàng & Người nhận hàng
                          <div className="form-row">
                            <input
                              value={shipmentForm.deliveryPerson}
                              onChange={e => setShipmentForm({ ...shipmentForm, deliveryPerson: e.target.value })}
                              placeholder="Họ tên người giao"
                              className="his-input"
                            />
                            <input
                              value={shipmentForm.receiverPerson}
                              onChange={e => setShipmentForm({ ...shipmentForm, receiverPerson: e.target.value })}
                              placeholder="Dược sĩ thủ kho nhận"
                              className="his-input"
                            />
                          </div>
                        </label>
                        <label className="his-field-label">
                          Ghi chú chứng từ đợt nhập
                          <input
                            value={shipmentForm.note}
                            onChange={e => setShipmentForm({ ...shipmentForm, note: e.target.value })}
                            placeholder="Ghi chú điều kiện bảo quản nhiệt độ, hợp đồng..."
                            className="his-input"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* PHẦN 2: DANH SÁCH CÁC LOẠI THUỐC TRONG ĐỢT NHẬP */}
                  <div className="his-card">
                    <div className="his-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Pill size={16} />
                        <span>2. Danh mục các loại thuốc được nhập trong đợt này ({shipmentForm.lines.length} mặt hàng)</span>
                      </div>
                      <button type="button" className="secondary his-btn-sm" onClick={addShipmentLine}>
                        <Plus size={14} /> Thêm loại thuốc vào đợt nhập
                      </button>
                    </div>
                    <div className="his-card-body" style={{ padding: 0 }}>
                      <div className="table-scroll">
                        <table className="his-mini-table">
                          <thead>
                            <tr>
                              <th style={{ width: 220 }}>TÊN MẶT HÀNG THUỐC *</th>
                              <th style={{ width: 140 }}>SỐ LÔ SX (BATCH) *</th>
                              <th style={{ width: 130 }}>HẠN DÙNG (EXP) *</th>
                              <th style={{ width: 110 }}>SL NHẬP *</th>
                              <th style={{ width: 90 }}>ĐƠN VỊ</th>
                              <th style={{ width: 120 }}>ĐƠN GIÁ (₫)</th>
                              <th style={{ width: 140 }}>VỊ TRÍ DÃY KỆ</th>
                              <th style={{ width: 120 }}>THÀNH TIỀN (₫)</th>
                              <th style={{ width: 50 }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {shipmentForm.lines.map((line, idx) => {
                              const lineTotal = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
                              return (
                                <tr key={idx}>
                                  <td>
                                    <select
                                      required
                                      value={line.medicineId}
                                      onChange={e => updateShipmentLine(idx, 'medicineId', e.target.value)}
                                      className="his-select his-table-select"
                                    >
                                      {stock.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.name} ({s.id})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      required
                                      value={line.lot}
                                      onChange={e => updateShipmentLine(idx, 'lot', e.target.value)}
                                      placeholder="GSK-26018"
                                      className="his-input his-table-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="date"
                                      required
                                      min={today}
                                      value={line.expiry}
                                      onChange={e => updateShipmentLine(idx, 'expiry', e.target.value)}
                                      className="his-input his-table-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      required
                                      min="1"
                                      step="1"
                                      value={line.qty}
                                      onChange={e => updateShipmentLine(idx, 'qty', e.target.value)}
                                      className="his-input his-table-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={line.unit}
                                      onChange={e => updateShipmentLine(idx, 'unit', e.target.value)}
                                      className="his-input his-table-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={line.unitPrice}
                                      onChange={e => updateShipmentLine(idx, 'unitPrice', e.target.value)}
                                      className="his-input his-table-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={line.shelfLocation}
                                      onChange={e => updateShipmentLine(idx, 'shelfLocation', e.target.value)}
                                      placeholder="Dãy A - Kệ 01"
                                      className="his-input his-table-input"
                                    />
                                  </td>
                                  <td style={{ fontWeight: 600, color: '#166534' }}>
                                    {lineTotal.toLocaleString('vi-VN')}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="icon-button"
                                      disabled={shipmentForm.lines.length === 1}
                                      onClick={() => removeShipmentLine(idx)}
                                      title="Xóa loại thuốc này"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* TỔNG KẾT ĐỢT NHẬP */}
                      <div className="his-consignment-summary">
                        <div className="summary-item">
                          <span>Số loại thuốc trong lô:</span>
                          <strong>{shipmentForm.lines.length} loại</strong>
                        </div>
                        <div className="summary-item">
                          <span>Tổng số đơn vị nhập:</span>
                          <strong>{totalShipmentUnits.toLocaleString('vi-VN')} đơn vị</strong>
                        </div>
                        <div className="summary-item summary-highlight">
                          <span>Tổng giá trị nhập kho:</span>
                          <b>{totalShipmentValue.toLocaleString('vi-VN')} ₫</b>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && <p className="form-error" role="alert">{error}</p>}

                  <div className="his-action-toolbar">
                    <button type="button" className="secondary" onClick={() => setModal(null)} disabled={saving}>
                      Hủy bỏ
                    </button>
                    <button type="submit" className="primary his-submit-btn" disabled={saving}>
                      {saving ? (
                        'Đang lưu vào SQL Server...'
                      ) : (
                        <>
                          <Check size={18} /> Ghi sổ nhập kho đợt hàng ({shipmentForm.lines.length} loại thuốc)
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : draft ? (
              /* XÁC NHẬN GIAO DỊCH (CHO TRANSFER HOẶC PRODUCT) */
              <>
                <h2>Xác nhận giao dịch kho</h2>
                <p className="dialog-subtitle">Kiểm tra thông tin trước khi ghi nhận thay đổi tồn kho.</p>
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
                        }[k] || k}
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
                  <button className="secondary" disabled={saving} onClick={() => { operation.current = null; setDraft(null); }}>
                    Sửa lại thông tin
                  </button>
                  <button className="primary" disabled={saving} onClick={confirm}>
                    <Check size={16} /> Xác nhận ghi nhận kho
                  </button>
                </div>
              </>
            ) : (
              /* FORM ĐIỀU CHUYỂN HOẶC THÊM MẶT HÀNG */
              <>
                <h2>{modal === 'transfer' ? 'Điều chuyển giữa hai kho' : 'Thêm mặt hàng mới vào danh mục'}</h2>
                <p className="dialog-subtitle">Chọn đúng kho nguồn, kho đích hoặc thông tin chuyên môn thuốc.</p>
                <form onSubmit={submit}>
                  {modal === 'product' ? (
                    <>
                      <label>Mã mặt hàng<input name="id" required pattern="[A-Za-z0-9_-]+" placeholder="TH_NEW01 hoặc VT_NEW01" /></label>
                      <label>Tên mặt hàng<input name="name" required maxLength={150} /></label>
                      <p className="form-hint">Với thuốc, điền đủ thông tin chuyên môn dược lý bên dưới:</p>
                      <div className="form-grid">
                        <label>Hoạt chất<input name="ingredient" maxLength={100} /></label>
                        <label>Hàm lượng<input name="strength" maxLength={100} /></label>
                        <label>Đường dùng<input name="route" maxLength={100} /></label>
                        <label>Dạng bào chế<input name="form" maxLength={100} /></label>
                      </div>
                      <div className="form-grid">
                        <label>Nhóm hàng
                          <select name="type">
                            <option>Thuốc</option>
                            <option>Vật tư y tế</option>
                          </select>
                        </label>
                        <label>Đơn vị tính<input name="unit" required maxLength={30} /></label>
                      </div>
                    </>
                  ) : (
                    <>
                      <label>Mặt hàng điều chuyển
                        <select name="medicine" required className="his-select">
                          <option value="">Chọn thuốc / vật tư</option>
                          {stock.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
                        </select>
                      </label>
                      <div className="form-grid">
                        <label>Kho nguồn (Xuất đi)
                          <select name="source" required defaultValue={warehouse !== 'all' ? warehouse : ''} className="his-select">
                            <option value="">Chọn kho nguồn</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </label>
                        <label>Kho đích (Tiếp nhận)
                          <select name="destination" required className="his-select">
                            <option value="">Chọn kho đích</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </label>
                      </div>
                      <label>Số lượng điều chuyển<input name="quantity" type="number" min="1" step="1" required className="his-input" /></label>
                    </>
                  )}
                  <label>Lý do thao tác<input name="reason" required maxLength={500} placeholder="Xuất cấp kho ngoại trú, bổ sung cơ số..." className="his-input" /></label>
                  <button className="primary full">Kiểm tra giao dịch <ArrowRight size={16} /></button>
                </form>
              </>
            )}
            {error && <p className="form-error" role="alert" style={{ marginTop: 15 }}>{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}
