import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Download, Package, Pill, AlertCircle, X, Check, ArrowRight, RefreshCw, Building2, Trash2, FileSpreadsheet, Truck, ShieldCheck, ClipboardList, CheckCircle2, Clock, Printer, User, FileText } from 'lucide-react';
import { useWorkspace, getWorkspace, syncWithSqlServer, planFEFO, applyClinicalStock } from './workspace';
import { today } from './business-data';
import { actorRoles } from './roles';
import { AllocationPreview } from './AllocationPreview';
import { parseBhytCard } from './bhyt-utils';
import { hisApi } from './api';

export default function Inventory({ role = 'admin', notify, clinicalContext }) {
  const [inventory] = useWorkspace('inventory');
  const [stock] = useWorkspace('stock');
  const [db] = useWorkspace('business');
  const [ledger] = useWorkspace('ledger');
  const [patients] = useWorkspace('patients');

  const [warehouse, setWarehouse] = useState('all');
  const [manufacturer, setManufacturer] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [tab, setTab] = useState(role === 'pharmacist' ? 'dispense' : 'lots');
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(null);
  const operation = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Outpatient Dispensing Queue state
  const [rxSearch, setRxSearch] = useState('');
  const [rxFilter, setRxFilter] = useState('Tất cả');
  const [dispenseWarehouse, setDispenseWarehouse] = useState('KHO_NGOAI_TRU');
  const [activeRx, setActiveRx] = useState(null);
  const [dispensingRxId, setDispensingRxId] = useState(null);

  useEffect(() => {
    if (clinicalContext?.recordId) { setTab('dispense'); setRxSearch(clinicalContext.recordId); }
  }, [clinicalContext?.recordId]);

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

  // Outpatient Prescriptions Queue calculations
  const allPrescriptions = db.prescriptions || [];
  const pendingRxCount = allPrescriptions.filter(r => ['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(r.status)).length;
  const dispensedRxCount = allPrescriptions.filter(r => r.status === 'Đã cấp phát').length;

  const filteredPrescriptions = allPrescriptions.filter(rx => {
    const q = rxSearch.trim().toLowerCase();
    const p = (patients || []).find(item => item.id === rx.patient) || {};
    const matchSearch = !q ||
      `${rx.id} ${rx.patient || ''} ${p.name || ''} ${rx.diagnosis || ''} ${rx.doctor || ''}`.toLowerCase().includes(q);

    let matchStatus = true;
    if (rxFilter === 'Chờ cấp phát') {
      matchStatus = ['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(rx.status);
    } else if (rxFilter === 'Đã cấp phát') {
      matchStatus = rx.status === 'Đã cấp phát';
    } else if (rxFilter === 'Đã hủy') {
      matchStatus = rx.status === 'Đã hủy';
    }

    return matchSearch && matchStatus;
  });

  const handleDispenseRx = async (rx) => {
    setDispensingRxId(rx.id);
    setError('');
    try {
      applyClinicalStock('prescriptions', rx.id, dispenseWarehouse, actor?.person || 'DS. Lê Quốc Huy');
      try {
        await hisApi.pharmacyAction({
          action: 'dispense',
          role,
          staffId: actor?.staffId || 'NV003',
          id: rx.id,
          warehouse: dispenseWarehouse,
          requestId: crypto.randomUUID()
        });
      } catch (sqlErr) {
        console.warn('SQL dispense sync warning (authoritative workspace updated):', sqlErr.message);
      }
      notify(`Đã cấp phát thành công đơn thuốc ${rx.id} cho người bệnh và trừ kho FEFO!`);
      setActiveRx(null);
    } catch (err) {
      setError(err.message || 'Lỗi khi cấp phát đơn thuốc.');
      notify(err.message || 'Không thể cấp phát đơn thuốc', 'error');
    } finally {
      setDispensingRxId(null);
    }
  };

  function open(type, customDraft = null) {
    operation.current = null;
    setModal(type);
    setDraft(customDraft);
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
        action: 'importShipment', role, staffId: actor.staffId, requestId: operation.current || (operation.current = crypto.randomUUID()),
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

      const result = await hisApi.pharmacyAction(payload);
      await syncWithSqlServer();
      setModal(null);
      notify(`Đã nhập kho thành công đợt hàng ${result.id || ''}: ${shipmentForm.lines.length} loại thuốc, ${totalShipmentUnits.toLocaleString('vi-VN')} đơn vị tồn.`);
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
      {tab === 'dispense' ? (
        <div className="business-summary">
          <div>
            <span><ClipboardList size={18} />Đơn chờ cấp phát</span>
            <b style={{ color: pendingRxCount > 0 ? '#b45309' : undefined }}>{pendingRxCount}</b>
          </div>
          <div>
            <span><CheckCircle2 size={18} />Đã cấp phát hôm nay</span>
            <b style={{ color: '#0f766e' }}>{dispensedRxCount}</b>
          </div>
          <div>
            <span><Building2 size={18} />Kho cấp phát ngoại trú</span>
            <b style={{ fontSize: 14 }}>{db.warehouses.find(w => w.id === dispenseWarehouse)?.name || 'Nhà Thuốc Khám Ngoại Trú'}</b>
          </div>
        </div>
      ) : (
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
      )}

      <section className="panel inventory-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {tab === 'dispense' ? 'Cấp phát ngoại trú' : tab === 'lots' ? 'Thuốc và tồn kho' : 'Lịch sử xuất nhập'}
            </h2>
          </div>
          <div className="row-actions">
            {tab !== 'dispense' ? (
              <>
                <button className="secondary" onClick={() => open('transfer')}>Điều chuyển kho</button>
                <button className="secondary" onClick={() => open('product')}><Plus size={14} />Thêm mặt hàng</button>
                <button className="primary" onClick={() => open('lot')}><Plus size={15} />Nhập hàng</button>
              </>
            ) : (
              <button className="secondary" onClick={fetchSqlBatches} disabled={loading} title="Tải lại dữ liệu">
                <RefreshCw size={14} className={loading ? 'spinning' : ''} style={{ marginRight: 6 }} />Đồng bộ đơn mới
              </button>
            )}
          </div>
        </div>

        {/* 1. Main Navigation Tabs Placed At Top */}
        <div className="inventory-tabs" role="group" aria-label="Chức năng dược">
          <button aria-pressed={tab === 'dispense'} className={tab === 'dispense' ? 'active' : ''} onClick={() => setTab('dispense')}>
            <ClipboardList size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Cấp phát ngoại trú
            {pendingRxCount > 0 && (
              <span style={{ marginLeft: 6, backgroundColor: '#f59e0b', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {pendingRxCount}
              </span>
            )}
          </button>
          <button aria-pressed={tab === 'lots'} className={tab === 'lots' ? 'active' : ''} onClick={() => setTab('lots')}>
            <Package size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Tồn kho theo lô
          </button>
          <button aria-pressed={tab === 'ledger'} className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>
            <FileSpreadsheet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Lịch sử xuất nhập
          </button>
        </div>

        {/* 2. Specific Search & Filter Toolbar For Active Tab */}
        {tab === 'dispense' ? (
          <div className="stock-toolbar">
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Tìm đơn thuốc"
                placeholder="Tìm mã đơn, tên người bệnh, mã BN, chẩn đoán, bác sĩ kê..."
                value={rxSearch}
                onChange={e => setRxSearch(e.target.value)}

              />
            </label>

            <select aria-label="Lọc trạng thái cấp phát" value={rxFilter} onChange={e => setRxFilter(e.target.value)} className="his-select">
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Chờ cấp phát">Chờ cấp phát ({pendingRxCount})</option>
              <option value="Đã cấp phát">Đã cấp phát ({dispensedRxCount})</option>
            </select>

            <select aria-label="Kho xuất cấp phát" value={dispenseWarehouse} onChange={e => setDispenseWarehouse(e.target.value)} className="his-select">
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
              ))}
            </select>

            <button className="icon-button" aria-label="Tải lại dữ liệu" onClick={fetchSqlBatches} disabled={loading} title="Tải lại dữ liệu" >
              <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        ) : (
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

            <button className="secondary" onClick={exportLots} >
              <Download size={15} />Xuất tồn kho
            </button>

            <button className="icon-button" aria-label="Tải lại dữ liệu" onClick={fetchSqlBatches} disabled={loading} title="Tải lại dữ liệu" >
              <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        )}

        {tab === 'dispense' && (
          <>
            <div className="table-scroll">
              <table style={{ minWidth: '1050px' }}>
                <thead>
                  <tr>
                    <th>MÃ ĐƠN & THỜI ĐIỂM</th>
                    <th>NGƯỜI BỆNH</th>
                    <th>BÁC SĨ KÊ & CHẨN ĐOÁN</th>
                    <th>CHI TIẾT THUỐC</th>
                    <th>TRẠNG THÁI CẤP PHÁT</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrescriptions.map(rx => {
                    const p = (patients || []).find(item => item.id === rx.patient) || { name: rx.patientName || rx.patient, id: rx.patient };
                    const isPending = ['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(rx.status);
                    const bh = parseBhytCard(p.insurance || p.soBHYT || rx.insurance);
                    return (
                      <tr key={rx.id}>
                        <td>
                          <b>{rx.id}</b>
                          <small>{rx.createdAt ? new Date(rx.createdAt).toLocaleString('vi-VN') : '—'}</small>
                          {rx.episodeId && <small style={{ color: '#0284c7' }}>Mã HS: {rx.episodeId}</small>}
                        </td>
                        <td>
                          <b>{p.name}</b>
                          <small>{p.id} {p.gender ? `· ${p.gender}` : ''} {p.birth ? `· ${new Date().getFullYear() - Number(p.birth.slice(0, 4))} tuổi` : ''}</small>
                          <div style={{ marginTop: 4 }}>
                            {bh.hasInsurance ? (
                              <span className={`badge ${bh.benefitBadgeClass}`} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                                {bh.benefitBadge} · {bh.code}
                              </span>
                            ) : (
                              <span style={{ fontSize: '9.5px', padding: '1px 6px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                Viện phí 100%
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <b>{rx.doctor || 'BS. Trần Minh Anh'}</b>
                          <small style={{ color: '#0f766e', fontWeight: 600 }}>{rx.diagnosis || 'Chưa ghi chẩn đoán'}</small>
                          {rx.advice && <small className="text-muted" style={{ fontStyle: 'italic', display: 'block', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dặn: {rx.advice}</small>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {(rx.lines || []).map((line, idx) => {
                              const medName = stock.find(s => s.id === line.medicine)?.name || line.medicineName || line.medicine;
                              return (
                                <span key={idx} style={{ fontSize: 12 }}>
                                  <b>{medName}</b>: {line.quantity} {line.unit || 'Viên'}
                                  <span style={{ color: '#64748b', marginLeft: 4 }}>({line.frequency || line.dose || 'Theo chỉ định'})</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${rx.status === 'Đã cấp phát' ? 'teal' : isPending ? 'amber' : 'gray'}`}>
                            {rx.status || 'Chờ cấp phát'}
                          </span>
                          {rx.reviewer && <small style={{ display: 'block' }}>Dược sĩ: {rx.reviewer}</small>}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setActiveRx(rx)}>
                              Chi tiết
                            </button>
                            {isPending && (
                              <button
                                className="primary"
                                style={{ padding: '5px 12px', fontSize: 12, backgroundColor: '#0f766e', borderColor: '#0f766e' }}
                                disabled={dispensingRxId === rx.id}
                                onClick={() => handleDispenseRx(rx)}
                              >
                                {dispensingRxId === rx.id ? 'Đang xuất...' : 'Cấp phát (FEFO)'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!filteredPrescriptions.length && (
              <div className="business-empty">
                <ClipboardList size={32} />
                <h3>Không có đơn thuốc nào trong danh sách</h3>
                <p>Thử điều chỉnh bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
              </div>
            )}
          </>
        )}

        {tab === 'lots' && (
          <>
            <div className="table-scroll">
              <table style={{ minWidth: '1050px' }}>
                <thead>
                  <tr>
                    <th>MẶT HÀNG / HOẠT CHẤT</th>
                    <th>HÃNG SẢN XUẤT</th>
                    <th>KHO & VỊ TRÍ KỆ</th>
                    <th>SỐ LÔ SX</th>
                    <th>HẠN DÙNG (FEFO)</th>
                    <th>TỒN KHO</th>
                    <th>ĐƠN VỊ</th>
                    <th>ĐƠN GIÁ (₫)</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
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
                        <b>{l.qty.toLocaleString('vi-VN')}</b>
                        {l.availQty !== l.qty && <small>Khả dụng: {l.availQty.toLocaleString('vi-VN')}</small>}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{l.unit || 'Viên'}</span>
                      </td>
                      <td>
                        <b style={{ color: '#0f766e', fontSize: '12px' }}>{(l.price || l.cost || 2000).toLocaleString('vi-VN')} ₫</b>
                      </td>
                      <td>
                        <span className={`badge ${l.daysLeft !== undefined && l.daysLeft < 0 ? 'danger' : l.daysLeft !== undefined && l.daysLeft <= 90 ? 'amber' : 'teal'}`}>
                          {l.daysLeft !== undefined && l.daysLeft < 0 ? 'Đã hết hạn' : l.daysLeft !== undefined && l.daysLeft <= 90 ? 'Cận date' : 'Khả dụng'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: '4px 10px', fontSize: '11.5px', height: '28px' }}
                            title="Điều chuyển kho cho lô thuốc này"
                            onClick={() => {
                              open('transfer', { medicineId: l.medicineId, sourceWarehouse: l.warehouseId, lot: l.lot, qty: Math.min(100, l.qty) });
                            }}
                          >
                            Điều chuyển
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: '4px 10px', fontSize: '11.5px', height: '28px' }}
                            title="Xem lịch sử xuất nhập & thẻ kho của thuốc này"
                            onClick={() => {
                              setSearch(l.name);
                              setTab('ledger');
                            }}
                          >
                            Thẻ kho
                          </button>
                        </div>
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
                        <select name="medicine" required className="his-select" defaultValue={draft?.medicineId || ''}>
                          <option value="">Chọn thuốc / vật tư</option>
                          {stock.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
                        </select>
                      </label>
                      <div className="form-grid">
                        <label>Kho nguồn (Xuất đi)
                          <select name="source" required defaultValue={draft?.sourceWarehouse || (warehouse !== 'all' ? warehouse : '')} className="his-select">
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
                      <label>Số lượng điều chuyển<input name="quantity" type="number" min="1" step="1" required defaultValue={draft?.qty || ''} className="his-input" /></label>
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

      {activeRx && (
        <div className="modal-backdrop" onClick={() => setActiveRx(null)}>
          <section className="modal-card wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#0f766e', fontWeight: 600 }}>QUẦY DƯỢC NGOẠI TRÚ · PHIẾU CẤP PHÁT THUỐC</span>
                <h3 style={{ margin: '4px 0 0 0' }}>Chi tiết Đơn thuốc: {activeRx.id}</h3>
              </div>
              <button className="icon-button" onClick={() => setActiveRx(null)}><X size={18} /></button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Patient info box */}
              {(() => {
                const pObj = (patients || []).find(p => p.id === activeRx.patient) || { name: activeRx.patientName || activeRx.patient, id: activeRx.patient };
                const bh = parseBhytCard(pObj.insurance || pObj.soBHYT || activeRx.insurance);
                const rxMedItems = (activeRx.lines || []).map(line => {
                  const med = stock.find(s => s.id === line.medicine);
                  const price = Number(med?.price || med?.cost || 2500);
                  const qty = Number(line.quantity || 1);
                  const inBhyt = (med?.insurancePrice !== undefined && med.insurancePrice > 0) || (med?.inBhyt !== false);
                  return { ...line, med, price, qty, total: price * qty, inBhyt };
                });
                const totalCost = rxMedItems.reduce((s, l) => s + l.total, 0);
                const eligibleCost = bh.hasInsurance ? rxMedItems.filter(l => l.inBhyt).reduce((s, l) => s + l.total, 0) : 0;
                const bhytPaid = bh.hasInsurance ? Math.round((eligibleCost * bh.rate) / 100) : 0;
                const patientDue = totalCost - bhytPaid;
                return (
                  <>
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div>
                        <small style={{ color: '#64748b', display: 'block' }}>Người bệnh</small>
                        <b>{pObj.name}</b>
                        <small style={{ display: 'block', color: '#64748b' }}>Mã BN: {activeRx.patient}</small>
                      </div>
                      <div>
                        <small style={{ color: '#64748b', display: 'block' }}>Bác sĩ kê đơn</small>
                        <b>{activeRx.doctor || 'BS. Trần Minh Anh'}</b>
                        <small style={{ display: 'block', color: '#64748b' }}>Ngày kê: {activeRx.createdAt ? new Date(activeRx.createdAt).toLocaleDateString('vi-VN') : today}</small>
                      </div>
                      <div>
                        <small style={{ color: '#64748b', display: 'block' }}>Chế độ KCB & BHYT</small>
                        {bh.hasInsurance ? (
                          <>
                            <b style={{ color: '#047857' }}>{bh.code}</b>
                            <small style={{ display: 'block', color: '#15803d' }}>{bh.benefitBadge} · {bh.groupName}</small>
                          </>
                        ) : (
                          <>
                            <b style={{ color: '#475569' }}>Viện phí</b>
                            <small style={{ display: 'block', color: '#64748b' }}>Tự chi trả 100%</small>
                          </>
                        )}
                      </div>
                      <div>
                        <small style={{ color: '#64748b', display: 'block' }}>Trạng thái cấp phát</small>
                        <span className={`badge ${activeRx.status === 'Đã cấp phát' ? 'teal' : 'amber'}`}>
                          {activeRx.status || 'Chờ cấp phát'}
                        </span>
                        {activeRx.reviewer && <small style={{ display: 'block', color: '#64748b' }}>Dược sĩ: {activeRx.reviewer}</small>}
                      </div>
                      <div style={{ gridColumn: 'span 4' }}>
                        <small style={{ color: '#64748b', display: 'block' }}>Chẩn đoán</small>
                        <b style={{ color: '#0f766e' }}>{activeRx.diagnosis || 'Chưa ghi nhận'}</b>
                        {activeRx.advice && <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}><b>Lời dặn:</b> {activeRx.advice}</div>}
                      </div>
                    </div>

                    {/* Prescribed medicines table */}
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Danh mục thuốc chỉ định</h4>
                      <div className="table-scroll" style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
                        <table style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>TÊN THUỐC / HOẠT CHẤT</th>
                              <th style={{ textAlign: 'center' }}>SL KÊ</th>
                              <th style={{ textAlign: 'right' }}>ĐƠN GIÁ (₫)</th>
                              <th style={{ textAlign: 'center' }}>BHYT</th>
                              <th style={{ textAlign: 'right' }}>THÀNH TIỀN (₫)</th>
                              <th>HƯỚNG DẪN DÙNG</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rxMedItems.map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  <b>{item.med?.name || item.medicineName || item.medicine}</b>
                                  {item.med?.activeIngredient && <small style={{ display: 'block', color: '#64748b' }}>{item.med.activeIngredient}</small>}
                                </td>
                                <td style={{ textAlign: 'center' }}><b>{item.qty}</b> {item.unit || item.med?.unit || 'Viên'}</td>
                                <td style={{ textAlign: 'right' }}>{item.price.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`badge ${item.inBhyt ? 'teal' : 'amber'}`} style={{ fontSize: '10px' }}>
                                    {item.inBhyt ? 'BHYT' : 'Tự túc'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total.toLocaleString('vi-VN')}</td>
                                <td>{item.frequency || item.dose || 'Theo chỉ định'} · {item.route || 'Uống'} ({item.days || 1} ngày)</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* BHYT Financial Summary Card */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                        <div>
                          <small style={{ color: '#64748b', display: 'block' }}>1. Tổng tiền thuốc</small>
                          <b style={{ fontSize: 14, color: '#0f172a' }}>{totalCost.toLocaleString('vi-VN')} ₫</b>
                        </div>
                        <div>
                          <small style={{ color: '#047857', display: 'block' }}>2. BHYT thanh toán ({bh.hasInsurance ? `${bh.rate}%` : '0%'})</small>
                          <b style={{ fontSize: 14, color: '#047857' }}>{bhytPaid.toLocaleString('vi-VN')} ₫</b>
                        </div>
                        <div>
                          <small style={{ color: '#1d4ed8', display: 'block' }}>3. BN cùng chi trả</small>
                          <b style={{ fontSize: 14, color: '#1d4ed8' }}>{patientDue.toLocaleString('vi-VN')} ₫</b>
                        </div>
                        <div>
                          <small style={{ color: '#64748b', display: 'block' }}>4. Chế độ đơn</small>
                          <span className={`badge ${bh.hasInsurance ? bh.benefitBadgeClass : 'gray'}`}>
                            {bh.hasInsurance ? `Đơn BHYT ${bh.rate}%` : 'Đơn Viện phí 100%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Warehouse selector & FEFO Allocation Preview */}
              {(() => {
                let fefoAllocations = null;
                let fefoError = null;
                if (activeRx.status !== 'Đã cấp phát') {
                  try {
                    fefoAllocations = planFEFO(inventory, activeRx.lines, dispenseWarehouse);
                  } catch (err) {
                    fefoError = err.message;
                  }
                }
                const alternativeWarehouse = !fefoAllocations && warehouses.find(w => {
                  if (w.id === dispenseWarehouse) return false;
                  try {
                    return !!planFEFO(inventory, activeRx.lines, w.id);
                  } catch {
                    return false;
                  }
                });

                return (
                  <>
                    {activeRx.status !== 'Đã cấp phát' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>Kho xuất cấp phát:</label>
                        <select
                          className="his-select"
                          value={dispenseWarehouse}
                          onChange={e => setDispenseWarehouse(e.target.value)}
                          style={{ flex: 1, padding: '6px 12px' }}
                        >
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                        </select>
                      </div>
                    )}

                    {/* FEFO Allocation Preview */}
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>
                        {activeRx.status === 'Đã cấp phát' ? 'Lô thuốc đã xuất kho' : 'Phân bổ lô xuất theo nguyên tắc FEFO'}
                      </h4>
                      {activeRx.status === 'Đã cấp phát' ? (
                        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#065f46' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                            <CheckCircle2 size={16} /> Đơn thuốc đã được xuất cấp phát hoàn tất từ kho {db.warehouses.find(w => w.id === activeRx.warehouse)?.name || activeRx.warehouse}.
                          </div>
                          {(activeRx.allocations || []).length > 0 && (
                            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                              {activeRx.allocations.map((a, i) => (
                                <li key={i}>Lô <code>{a.lot}</code> (HSD: {a.expiry}): Trừ <b>{a.quantity}</b> đơn vị</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : !fefoError ? (
                        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', fontSize: 13 }}>
                          <span style={{ color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={16} /> Đủ cơ số tồn kho khả dụng để cấp phát theo thứ tự hạn dùng gần nhất (FEFO):
                          </span>
                          <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#1e293b' }}>
                            {fefoAllocations?.map((alloc, i) => {
                              const med = stock.find(s => s.id === alloc.medicineId);
                              return (
                                <li key={i}>
                                  <b>{med?.name || alloc.medicineId}</b> — Lô <code>{alloc.lot}</code> (HSD: {alloc.expiry}): Xuất <b>{alloc.quantity}</b>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#991b1b' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                            <div style={{ flex: 1 }}>
                              <div><b>Không thể cấp phát:</b> {fefoError}</div>
                              {alternativeWarehouse ? (
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ color: '#047857', fontWeight: 600 }}>
                                    💡 Kho <b>{alternativeWarehouse.name}</b> có đủ cơ số tồn khả dụng:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setDispenseWarehouse(alternativeWarehouse.id)}
                                    style={{
                                      padding: '5px 12px',
                                      backgroundColor: '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Chuyển sang xuất tại {alternativeWarehouse.name}
                                  </button>
                                </div>
                              ) : (
                                <div style={{ marginTop: 6, fontSize: 12, color: '#7f1d1d' }}>
                                  Vui lòng chọn kho khác hoặc lập phiếu điều chuyển/nhập kho.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                      <button className="secondary" onClick={() => window.print()}>
                        <Printer size={15} /> In phiếu cấp phát & Lời dặn
                      </button>
                      <button className="secondary" onClick={() => setActiveRx(null)}>Đóng</button>
                      {['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(activeRx.status) && (
                        <button
                          className="primary"
                          disabled={dispensingRxId === activeRx.id || !!fefoError}
                          onClick={() => handleDispenseRx(activeRx)}
                          style={{
                            backgroundColor: fefoError ? '#94a3b8' : '#0f766e',
                            borderColor: fefoError ? '#94a3b8' : '#0f766e',
                            cursor: fefoError ? 'not-allowed' : 'pointer'
                          }}
                          title={fefoError ? 'Kho đã chọn không đủ cơ số tồn khả dụng' : 'Xuất kho và hoàn tất cấp phát'}
                        >
                          {dispensingRxId === activeRx.id ? 'Đang xuất kho...' : fefoError ? 'Thiếu tồn kho (Không thể xuất)' : 'Xác nhận cấp phát thuốc (FEFO)'}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
