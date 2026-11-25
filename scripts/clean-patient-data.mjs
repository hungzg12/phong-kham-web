import { querySql } from '../server/admin-store.mjs';

async function cleanPatientData() {
  console.log('--- CLEANING ALL PATIENT & ENCOUNTER DATA IN SQL SERVER ---');

  const cleanSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    -- Disable constraints on patient-related transaction tables
    EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";

    DELETE FROM dbo.SoKho;
    DELETE FROM dbo.ChiTietPhieuKho;
    DELETE FROM dbo.PhieuKho;
    DELETE FROM dbo.LanThucHienYLenh;
    DELETE FROM dbo.YLenh;
    DELETE FROM dbo.ToDieuTri;
    DELETE FROM dbo.ChiTietDonThuoc;
    DELETE FROM dbo.DonThuoc;

    DELETE FROM dbo.GiaoDichThanhToan;
    DELETE FROM dbo.ChiTietQuyetToan;
    DELETE FROM dbo.QuyetToan;
    DELETE FROM dbo.BaoCaoVienPhi;

    DELETE FROM dbo.ChiSoXetNghiem;
    DELETE FROM dbo.KetQuaMoTa;
    DELETE FROM dbo.KetQuaXetNghiem;
    DELETE FROM dbo.KetQuaCLS;
    DELETE FROM dbo.ChiTietChiDinh;
    DELETE FROM dbo.ChiDinhCLS;

    DELETE FROM dbo.PhanGiuong;
    UPDATE dbo.GiuongBenh SET trangThaiHienTai = 'TRONG';
    IF OBJECT_ID('dbo.TomTatBenhAn','U') IS NOT NULL DELETE FROM dbo.TomTatBenhAn;
    DELETE FROM dbo.DotDieuTri;

    DELETE FROM dbo.PhienBanBenhAn;
    DELETE FROM dbo.BenhAnDienTu;
    DELETE FROM dbo.BienBanHoiChan;
    DELETE FROM dbo.GiayChuyenTuyen;
    DELETE FROM dbo.GiayRaVien;
    DELETE FROM dbo.LichHen;
    DELETE FROM dbo.UyQuyenHoSo;

    DELETE FROM dbo.KhamChuyenKhoaMat;
    DELETE FROM dbo.KhamDaLieu;
    DELETE FROM dbo.KhamNhiKhoa;
    DELETE FROM dbo.KhamRangHamMat;
    DELETE FROM dbo.KhamSanPhuKhoa;
    DELETE FROM dbo.KhamTaiMuiHong;

    DELETE FROM dbo.PhieuSinhHieu;
    DELETE FROM dbo.HoSoKham;
    DELETE FROM dbo.LuotKham;
    DELETE FROM dbo.BoDemSoThuTuKham;

    DELETE FROM dbo.BenhNhan;

    -- Re-enable constraints
    EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";

    COMMIT;
    SELECT 'CLEANED_OK';
  `;
  const res = await querySql(cleanSql);
  console.log('Clean Result:', res);

  const countRes = await querySql(`
    SELECT
      (SELECT COUNT(*) FROM dbo.BenhNhan) as BenhNhan,
      (SELECT COUNT(*) FROM dbo.LuotKham) as LuotKham,
      (SELECT COUNT(*) FROM dbo.ChiDinhCLS) as ChiDinhCLS,
      (SELECT COUNT(*) FROM dbo.DonThuoc) as DonThuoc,
      (SELECT COUNT(*) FROM dbo.GiuongBenh WHERE trangThaiHienTai != 'TRONG') as GiuongDangDung
  `, {}, {rows: true});
  console.log('Current Counts:', JSON.parse(countRes));
  process.exit(0);
}

cleanPatientData().catch(err => {
  console.error(err);
  process.exit(1);
});
