import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dbDir = path.join(root, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Standard ICD-10 Dataset compliant with Vietnam Ministry of Health (QĐ 130 / QĐ 4469)
const icd10List = [
  // CHƯƠNG I: BỆNH NHIỄM TRÙNG VÀ KÝ SINH TRÙNG (A00-B99)
  { maICD: 'A00', tenBenh: 'Bệnh tả', tenTiengAnh: 'Cholera', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 0 },
  { maICD: 'A00.0', tenBenh: 'Bệnh tả do Vibrio cholerae 01, biovar cholerae', tenTiengAnh: 'Cholera due to Vibrio cholerae 01, biovar cholerae', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 0 },
  { maICD: 'A00.1', tenBenh: 'Bệnh tả do Vibrio cholerae 01, biovar eltor', tenTiengAnh: 'Cholera due to Vibrio cholerae 01, biovar eltor', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 0 },
  { maICD: 'A01.0', tenBenh: 'Bệnh sốt thương hàn', tenTiengAnh: 'Typhoid fever', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A02.0', tenBenh: 'Viêm ruột do Salmonella', tenTiengAnh: 'Salmonella enteritis', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A04.9', tenBenh: 'Nhiễm trùng đường ruột do vi khuẩn, không đặc hiệu', tenTiengAnh: 'Bacterial intestinal infection, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A06.0', tenBenh: 'Lỵ amip ruột cấp tính', tenTiengAnh: 'Acute amoebic dysentery', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A09', tenBenh: 'Tiêu chảy và viêm dạ dày-ruột nghi do nhiễm khuẩn', tenTiengAnh: 'Infectious gastroenteritis and colitis, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A15.0', tenBenh: 'Lao phổi, xác định bằng soi kính hiển vi tìm AFB', tenTiengAnh: 'Tuberculosis of lung, confirmed by sputum microscopy', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A16.2', tenBenh: 'Lao phổi, không chẩn đoán vi khuẩn hay mô học', tenTiengAnh: 'Tuberculosis of lung, without mention of bacteriological or histological confirmation', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A37.9', tenBenh: 'Bệnh ho gà, không xác định', tenTiengAnh: 'Whooping cough, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 0 },
  { maICD: 'A41.9', tenBenh: 'Nhiễm trùng huyết, không xác định', tenTiengAnh: 'Sepsis, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A49.9', tenBenh: 'Nhiễm vi khuẩn, vị trí không xác định', tenTiengAnh: 'Bacterial infection, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A90', tenBenh: 'Sốt Dengue (Sốt xuất huyết Dengue cổ điển)', tenTiengAnh: 'Dengue fever [classical dengue]', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'A91', tenBenh: 'Sốt xuất huyết Dengue có dấu hiệu cảnh báo/nặng', tenTiengAnh: 'Dengue haemorrhagic fever', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B01.9', tenBenh: 'Bệnh thủy đậu không biến chứng', tenTiengAnh: 'Varicella without complication', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B02.9', tenBenh: 'Bệnh Zona không biến chứng', tenTiengAnh: 'Zoster without complication', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B05.9', tenBenh: 'Bệnh sởi không biến chứng', tenTiengAnh: 'Measles without complication', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B08.4', tenBenh: 'Viêm miệng mụn nước do enterovirus kèm phát ban (Tay-Chân-Miệng)', tenTiengAnh: 'Enteroviral vesicular stomatitis with exanthem [Hand, foot and mouth disease]', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B18.1', tenBenh: 'Viêm gan virus B mạn tính không có tác nhân delta', tenTiengAnh: 'Chronic viral hepatitis B without delta-agent', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B18.2', tenBenh: 'Viêm gan virus C mạn tính', tenTiengAnh: 'Chronic viral hepatitis C', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B20', tenBenh: 'Bệnh do virus gây suy giảm miễn dịch ở người [HIV]', tenTiengAnh: 'Human immunodeficiency virus [HIV] disease', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 0 },
  { maICD: 'B26.9', tenBenh: 'Bệnh quai bị không biến chứng', tenTiengAnh: 'Mumps without complication', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B34.9', tenBenh: 'Nhiễm virus, vị trí không xác định (Sốt virus)', tenTiengAnh: 'Viral infection, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B35.9', tenBenh: 'Nấm da, không xác định', tenTiengAnh: 'Dermatophytosis, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B37.0', tenBenh: 'Viêm miệng do nấm Candida (Tưa miệng)', tenTiengAnh: 'Candidal stomatitis', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },
  { maICD: 'B82.0', tenBenh: 'Nhiễm giun đường ruột, không xác định', tenTiengAnh: 'Intestinal helminthiasis, unspecified', maChuong: 'I', tenChuong: 'Một số bệnh nhiễm trùng và ký sinh trùng', thuongGap: 1 },

  // CHƯƠNG II: KHỐI U VÀ UNG THƯ (C00-D48)
  { maICD: 'C16.9', tenBenh: 'U ác của dạ dày, không xác định (Ung thư dạ dày)', tenTiengAnh: 'Malignant neoplasm of stomach, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 0 },
  { maICD: 'C18.9', tenBenh: 'U ác của đại tràng, không xác định (Ung thư đại tràng)', tenTiengAnh: 'Malignant neoplasm of colon, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 0 },
  { maICD: 'C22.0', tenBenh: 'Ung thư biểu mô tế bào gan (HCC)', tenTiengAnh: 'Liver cell carcinoma', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'C34.9', tenBenh: 'U ác của phế quản và phổi, không xác định (Ung thư phổi)', tenTiengAnh: 'Malignant neoplasm of bronchus or lung, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'C50.9', tenBenh: 'U ác của vú, không xác định (Ung thư vú)', tenTiengAnh: 'Malignant neoplasm of breast, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'C53.9', tenBenh: 'U ác của cổ tử cung, không xác định (Ung thư cổ tử cung)', tenTiengAnh: 'Malignant neoplasm of cervix uteri, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'C73', tenBenh: 'U ác của tuyến giáp (Ung thư tuyến giáp)', tenTiengAnh: 'Malignant neoplasm of thyroid gland', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'D12.6', tenBenh: 'U lành của đại tràng (Polyp đại tràng)', tenTiengAnh: 'Benign neoplasm of colon', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'D17.9', tenBenh: 'U mỡ lành tính, vị trí không xác định (U mỡ Lipoma)', tenTiengAnh: 'Benign lipomatous neoplasm, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'D24', tenBenh: 'U lành của vú (U xơ tuyến vú)', tenTiengAnh: 'Benign neoplasm of breast', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },
  { maICD: 'D25.9', tenBenh: 'U xơ tử cung, không xác định', tenTiengAnh: 'Leiomyoma of uterus, unspecified', maChuong: 'II', tenChuong: 'Khối u', thuongGap: 1 },

  // CHƯƠNG III: BỆNH CƠ QUAN TẠO MÁU VÀ HỆ MIỄN DỊCH (D50-D89)
  { maICD: 'D50.9', tenBenh: 'Thiếu máu do thiếu sắt, không xác định', tenTiengAnh: 'Iron deficiency anaemia, unspecified', maChuong: 'III', tenChuong: 'Bệnh của máu và cơ quan tạo máu', thuongGap: 1 },
  { maICD: 'D56.9', tenBenh: 'Bệnh Thalassemia, không xác định', tenTiengAnh: 'Thalassaemia, unspecified', maChuong: 'III', tenChuong: 'Bệnh của máu và cơ quan tạo máu', thuongGap: 1 },
  { maICD: 'D64.9', tenBenh: 'Thiếu máu, không xác định', tenTiengAnh: 'Anaemia, unspecified', maChuong: 'III', tenChuong: 'Bệnh của máu và cơ quan tạo máu', thuongGap: 1 },
  { maICD: 'D69.6', tenBenh: 'Giảm tiểu cầu, không xác định', tenTiengAnh: 'Thrombocytopenia, unspecified', maChuong: 'III', tenChuong: 'Bệnh của máu và cơ quan tạo máu', thuongGap: 1 },

  // CHƯƠNG IV: BỆNH NỘI TIẾT, DINH DƯỠNG VÀ CHUYỂN HÓA (E00-E90)
  { maICD: 'E03.9', tenBenh: 'Suy giáp, không xác định', tenTiengAnh: 'Hypothyroidism, unspecified', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E04.1', tenBenh: 'Bướu giáp đơn nhân không độc', tenTiengAnh: 'Nontoxic single thyroid nodule', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E04.2', tenBenh: 'Bướu giáp đa nhân không độc', tenTiengAnh: 'Nontoxic multinodular goitre', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E05.0', tenBenh: 'Nhiễm độc giáp kèm bướu giáp lan tỏa (Basedow)', tenTiengAnh: 'Thyrotoxicosis with diffuse goitre', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E10.9', tenBenh: 'Đái tháo đường phụ thuộc insulin (Type 1), không biến chứng', tenTiengAnh: 'Type 1 diabetes mellitus without complications', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E11.9', tenBenh: 'Đái tháo đường không phụ thuộc insulin (Type 2), không biến chứng', tenTiengAnh: 'Type 2 diabetes mellitus without complications', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E11.4', tenBenh: 'Đái tháo đường type 2 có biến chứng thần kinh', tenTiengAnh: 'Type 2 diabetes mellitus with neurological complications', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E14.9', tenBenh: 'Bệnh đái tháo đường không xác định', tenTiengAnh: 'Unspecified diabetes mellitus without complications', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E66.9', tenBenh: 'Béo phì, không xác định', tenTiengAnh: 'Obesity, unspecified', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E78.0', tenBenh: 'Tăng cholesterol máu thuần túy', tenTiengAnh: 'Pure hypercholesterolaemia', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E78.1', tenBenh: 'Tăng triglycerid máu thuần túy', tenTiengAnh: 'Pure hyperglyceridaemia', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E78.2', tenBenh: 'Tăng lipid máu hỗn hợp (Rối loạn chuyển hóa lipid máu)', tenTiengAnh: 'Mixed hyperlipidaemia', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },
  { maICD: 'E79.0', tenBenh: 'Tăng acid uric máu không có dấu hiệu viêm khớp (Tăng acid uric máu)', tenTiengAnh: 'Hyperuricaemia without signs of inflammatory arthritis', maChuong: 'IV', tenChuong: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá', thuongGap: 1 },

  // CHƯƠNG V: RỐI LOẠN TÂM THẦN VÀ HÀNH VI (F00-F99)
  { maICD: 'F32.9', tenBenh: 'Giai đoạn trầm cảm, không xác định', tenTiengAnh: 'Depressive episode, unspecified', maChuong: 'V', tenChuong: 'Rối loạn tâm thần và hành vi', thuongGap: 1 },
  { maICD: 'F41.1', tenBenh: 'Rối loạn lo âu lan tỏa', tenTiengAnh: 'Generalized anxiety disorder', maChuong: 'V', tenChuong: 'Rối loạn tâm thần và hành vi', thuongGap: 1 },
  { maICD: 'F41.9', tenBenh: 'Rối loạn lo âu, không xác định', tenTiengAnh: 'Anxiety disorder, unspecified', maChuong: 'V', tenChuong: 'Rối loạn tâm thần và hành vi', thuongGap: 1 },
  { maICD: 'F45.0', tenBenh: 'Rối loạn cơ thể hóa (Rối loạn dạng cơ thể)', tenTiengAnh: 'Somatization disorder', maChuong: 'V', tenChuong: 'Rối loạn tâm thần và hành vi', thuongGap: 1 },
  { maICD: 'F51.0', tenBenh: 'Mất ngủ không thực tổn', tenTiengAnh: 'Nonorganic insomnia', maChuong: 'V', tenChuong: 'Rối loạn tâm thần và hành vi', thuongGap: 1 },

  // CHƯƠNG VI: BỆNH HỆ THẦN KINH (G00-G99)
  { maICD: 'G40.9', tenBenh: 'Bệnh động kinh, không xác định', tenTiengAnh: 'Epilepsy, unspecified', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 0 },
  { maICD: 'G43.9', tenBenh: 'Đau nửa đầu (Migraine), không xác định', tenTiengAnh: 'Migraine, unspecified', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 1 },
  { maICD: 'G44.2', tenBenh: 'Đau đầu do căng thẳng', tenTiengAnh: 'Tension-type headache', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 1 },
  { maICD: 'G45.9', tenBenh: 'Cơn thiếu máu não cục bộ thoáng qua (TIA)', tenTiengAnh: 'Transient cerebral ischaemic attack, unspecified', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 1 },
  { maICD: 'G47.0', tenBenh: 'Rối loạn bắt đầu và duy trì giấc ngủ [Mất ngủ]', tenTiengAnh: 'Disorders of initiating and maintaining sleep [insomnias]', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 1 },
  { maICD: 'G51.0', tenBenh: 'Liệt Bell (Liệt dây thần kinh số VII ngoại biên)', tenTiengAnh: 'Bell palsy', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 1 },
  { maICD: 'G56.0', tenBenh: 'Hội chứng ống cổ tay', tenTiengAnh: 'Carpal tunnel syndrome', maChuong: 'VI', tenChuong: 'Bệnh hệ thần kinh', thuongGap: 1 },

  // CHƯƠNG VII: BỆNH MẮT VÀ PHẦN PHỤ (H00-H59)
  { maICD: 'H00.0', tenBenh: 'Lẹo và các viêm sâu khác của mi mắt', tenTiengAnh: 'Hordeolum and other deep inflammation of eyelid', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },
  { maICD: 'H10.9', tenBenh: 'Viêm kết mạc, không xác định (Đau mắt đỏ)', tenTiengAnh: 'Conjunctivitis, unspecified', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },
  { maICD: 'H16.0', tenBenh: 'Loét giác mạc', tenTiengAnh: 'Corneal ulcer', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },
  { maICD: 'H25.9', tenBenh: 'Đục thủy tinh thể tuổi già, không xác định', tenTiengAnh: 'Senile cataract, unspecified', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },
  { maICD: 'H40.9', tenBenh: 'Glaucoma, không xác định (Tăng nhãn áp / Thiên đầu thống)', tenTiengAnh: 'Glaucoma, unspecified', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },
  { maICD: 'H52.1', tenBenh: 'Cận thị', tenTiengAnh: 'Myopia', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },
  { maICD: 'H52.2', tenBenh: 'Loạn thị', tenTiengAnh: 'Astigmatism', maChuong: 'VII', tenChuong: 'Bệnh của mắt và phần phụ', thuongGap: 1 },

  // CHƯƠNG VIII: BỆNH TAI VÀ XƯƠNG CHŨM (H60-H95)
  { maICD: 'H60.9', tenBenh: 'Viêm tai ngoài, không xác định', tenTiengAnh: 'Otitis externa, unspecified', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H65.9', tenBenh: 'Viêm tai giữa không nung mủ, không xác định', tenTiengAnh: 'Nonsuppurative otitis media, unspecified', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H66.9', tenBenh: 'Viêm tai giữa có nung mủ, không xác định', tenTiengAnh: 'Otitis media, unspecified', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H81.0', tenBenh: 'Bệnh Meniere (Chóng mặt Meniere)', tenTiengAnh: 'Meniere disease', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H81.1', tenBenh: 'Chóng mặt kịch phát lành tính theo tư thế (BPPV)', tenTiengAnh: 'Benign paroxysmal vertigo', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H81.9', tenBenh: 'Rối loạn chức năng tiền đình, không xác định (Hội chứng tiền đình)', tenTiengAnh: 'Disorder of vestibular function, unspecified', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H91.9', tenBenh: 'Giảm thính lực, không xác định', tenTiengAnh: 'Hearing loss, unspecified', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },
  { maICD: 'H93.1', tenBenh: 'Ù tai', tenTiengAnh: 'Tinnitus', maChuong: 'VIII', tenChuong: 'Bệnh của tai và xương chũm', thuongGap: 1 },

  // CHƯƠNG IX: BỆNH HỆ TUẦN HOÀN (I00-I99)
  { maICD: 'I10', tenBenh: 'Bệnh tăng huyết áp vô căn (nguyên phát)', tenTiengAnh: 'Essential (primary) hypertension', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I11.9', tenBenh: 'Bệnh tim do tăng huyết áp không có suy tim', tenTiengAnh: 'Hypertensive heart disease without heart failure', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I15.9', tenBenh: 'Tăng huyết áp thứ phát, không xác định', tenTiengAnh: 'Secondary hypertension, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I20.9', tenBenh: 'Cơn đau thắt ngực, không xác định', tenTiengAnh: 'Angina pectoris, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I21.9', tenBenh: 'Nhồi máu cơ tim cấp, không xác định', tenTiengAnh: 'Acute myocardial infarction, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I25.1', tenBenh: 'Bệnh tim xơ vữa (Bệnh động mạch vành mạn tính)', tenTiengAnh: 'Atherosclerotic heart disease', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I25.9', tenBenh: 'Bệnh tim thiếu máu cục bộ mạn tính, không xác định', tenTiengAnh: 'Chronic ischaemic heart disease, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I47.1', tenBenh: 'Nhịp nhanh trên thất', tenTiengAnh: 'Supraventricular tachycardia', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I48', tenBenh: 'Rung nhĩ và cuồng nhĩ', tenTiengAnh: 'Atrial fibrillation and flutter', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I49.9', tenBenh: 'Loạn nhịp tim, không xác định', tenTiengAnh: 'Cardiac arrhythmia, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I50.9', tenBenh: 'Suy tim, không xác định', tenTiengAnh: 'Heart failure, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I63.9', tenBenh: 'Nhồi máu não, không xác định (Đột quỵ thiếu máu não cục bộ)', tenTiengAnh: 'Cerebral infarction, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I64', tenBenh: 'Đột quỵ, không xác định xuất huyết hay nhồi máu', tenTiengAnh: 'Stroke, not specified as haemorrhage or infarction', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I67.8', tenBenh: 'Bệnh mạch máu não đặc hiệu khác (Thiểu năng tuần hoàn não)', tenTiengAnh: 'Other specified cerebrovascular diseases', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I67.9', tenBenh: 'Bệnh mạch máu não, không xác định', tenTiengAnh: 'Cerebrovascular disease, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I83.9', tenBenh: 'Giãn tĩnh mạch chi dưới không kèm loét hoặc viêm', tenTiengAnh: 'Varicose veins of lower extremities without ulcer or inflammation', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I84.9', tenBenh: 'Bệnh trĩ không xác định không biến chứng', tenTiengAnh: 'Unspecified haemorrhoids without complication', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },
  { maICD: 'I95.9', tenBenh: 'Hạ huyết áp, không xác định', tenTiengAnh: 'Hypotension, unspecified', maChuong: 'IX', tenChuong: 'Bệnh hệ tuần hoàn', thuongGap: 1 },

  // CHƯƠNG X: BỆNH HỆ HÔ HẤP (J00-J99)
  { maICD: 'J00', tenBenh: 'Viêm mũi họng cấp [Cảm lạnh thông thường]', tenTiengAnh: 'Acute nasopharyngitis [common cold]', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J01.9', tenBenh: 'Viêm xoang cấp, không xác định', tenTiengAnh: 'Acute sinusitis, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J02.9', tenBenh: 'Viêm họng cấp, không xác định', tenTiengAnh: 'Acute pharyngitis, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J03.9', tenBenh: 'Viêm amidan cấp, không xác định', tenTiengAnh: 'Acute tonsillitis, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J04.0', tenBenh: 'Viêm thanh quản cấp', tenTiengAnh: 'Acute laryngitis', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J06.9', tenBenh: 'Nhiễm trùng đường hô hấp trên cấp tính, không xác định', tenTiengAnh: 'Acute upper respiratory infection, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J11.1', tenBenh: 'Cúm không xác định vi rút kèm biểu hiện hô hấp khác', tenTiengAnh: 'Influenza with other respiratory manifestations, virus not identified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J18.0', tenBenh: 'Phế quản phế viêm, không xác định', tenTiengAnh: 'Bronchopneumonia, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J18.9', tenBenh: 'Viêm phổi, không xác định', tenTiengAnh: 'Pneumonia, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J20.9', tenBenh: 'Viêm phế quản cấp, không xác định', tenTiengAnh: 'Acute bronchitis, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J30.4', tenBenh: 'Viêm mũi dị ứng, không xác định', tenTiengAnh: 'Allergic rhinitis, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J31.0', tenBenh: 'Viêm mũi mạn tính', tenTiengAnh: 'Chronic rhinitis', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J32.9', tenBenh: 'Viêm xoang mạn tính, không xác định', tenTiengAnh: 'Chronic sinusitis, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J35.0', tenBenh: 'Viêm amidan mạn tính', tenTiengAnh: 'Chronic tonsillitis', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J40', tenBenh: 'Viêm phế quản không đặc hiệu là cấp hay mạn tính', tenTiengAnh: 'Bronchitis, not specified as acute or chronic', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J44.9', tenBenh: 'Bệnh phổi tắc nghẽn mạn tính, không xác định (COPD)', tenTiengAnh: 'Chronic obstructive pulmonary disease, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },
  { maICD: 'J45.9', tenBenh: 'Hen phế quản, không xác định (Hen suyễn)', tenTiengAnh: 'Asthma, unspecified', maChuong: 'X', tenChuong: 'Bệnh hệ hô hấp', thuongGap: 1 },

  // CHƯƠNG XI: BỆNH HỆ TIÊU HÓA (K00-K93)
  { maICD: 'K02.9', tenBenh: 'Sâu răng, không xác định', tenTiengAnh: 'Dental caries, unspecified', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K05.1', tenBenh: 'Viêm lợi mạn tính', tenTiengAnh: 'Chronic gingivitis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K05.3', tenBenh: 'Viêm quanh răng mạn tính (Viêm nha chu)', tenTiengAnh: 'Chronic periodontitis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K12.0', tenBenh: 'Loét áp tơ tái phát ở miệng (Nhiệt miệng)', tenTiengAnh: 'Recurrent oral aphthae', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K21.0', tenBenh: 'Bệnh trào ngược dạ dày-thực quản có viêm thực quản', tenTiengAnh: 'Gastro-oesophageal reflux disease with oesophagitis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K21.9', tenBenh: 'Bệnh trào ngược dạ dày-thực quản không có viêm thực quản (GERD)', tenTiengAnh: 'Gastro-oesophageal reflux disease without oesophagitis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K25.9', tenBenh: 'Loét dạ dày, không đặc hiệu là cấp hay mạn, không xuất huyết hay thủng', tenTiengAnh: 'Gastric ulcer, unspecified as acute or chronic, without haemorrhage or perforation', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K26.9', tenBenh: 'Loét tá tràng, không đặc hiệu là cấp hay mạn, không xuất huyết hay thủng', tenTiengAnh: 'Duodenal ulcer, unspecified as acute or chronic, without haemorrhage or perforation', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K29.1', tenBenh: 'Viêm dạ dày cấp tính khác', tenTiengAnh: 'Other acute gastritis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K29.5', tenBenh: 'Viêm dạ dày mạn tính, không xác định', tenTiengAnh: 'Chronic gastritis, unspecified', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K29.7', tenBenh: 'Viêm dạ dày, không xác định (Đau dạ dày)', tenTiengAnh: 'Gastritis, unspecified', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K30', tenBenh: 'Chứng khó tiêu (Đầy bụng khó tiêu)', tenTiengAnh: 'Dyspepsia', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K35.8', tenBenh: 'Viêm ruột thừa cấp khác và không xác định', tenTiengAnh: 'Other and unspecified acute appendicitis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K58.9', tenBenh: 'Hội chứng ruột kích thích không kèm tiêu chảy (IBS / Viêm đại tràng co thắt)', tenTiengAnh: 'Irritable bowel syndrome without diarrhoea', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K59.0', tenBenh: 'Táo bón', tenTiengAnh: 'Constipation', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K70.3', tenBenh: 'Xơ gan do rượu', tenTiengAnh: 'Alcoholic cirrhosis of liver', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K74.6', tenBenh: 'Xơ gan khác và không xác định', tenTiengAnh: 'Other and unspecified cirrhosis of liver', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K76.0', tenBenh: 'Gan nhiễm mỡ, không phân loại ở nơi khác', tenTiengAnh: 'Fatty (change of) liver, not elsewhere classified', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K80.2', tenBenh: 'Sỏi túi mật không kèm viêm túi mật', tenTiengAnh: 'Calculus of gallbladder without cholecystitis', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },
  { maICD: 'K85.9', tenBenh: 'Viêm tụy cấp, không xác định', tenTiengAnh: 'Acute pancreatitis, unspecified', maChuong: 'XI', tenChuong: 'Bệnh hệ tiêu hoá', thuongGap: 1 },

  // CHƯƠNG XII: BỆNH DA VÀ MÔ DƯỚI DA (L00-L99)
  { maICD: 'L02.9', tenBenh: 'Áp xe da, nhọt và nhọt cụm, vị trí không xác định', tenTiengAnh: 'Cutaneous abscess, furuncle and carbuncle, unspecified', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L03.9', tenBenh: 'Viêm mô tế bào, không xác định', tenTiengAnh: 'Cellulitis, unspecified', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L20.9', tenBenh: 'Viêm da cơ địa, không xác định (Chàm Eczema)', tenTiengAnh: 'Atopic dermatitis, unspecified', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L23.9', tenBenh: 'Viêm da tiếp xúc dị ứng, không xác định nguyên nhân', tenTiengAnh: 'Allergic contact dermatitis, unspecified cause', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L29.9', tenBenh: 'Ngứa, không xác định', tenTiengAnh: 'Pruritus, unspecified', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L30.9', tenBenh: 'Viêm da, không xác định', tenTiengAnh: 'Dermatitis, unspecified', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L40.0', tenBenh: 'Bệnh vảy nến thể mảng', tenTiengAnh: 'Psoriasis vulgaris', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L50.0', tenBenh: 'Mày đay dị ứng', tenTiengAnh: 'Allergic urticaria', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L50.9', tenBenh: 'Mày đay, không xác định (Nổi mề đay)', tenTiengAnh: 'Urticaria, unspecified', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },
  { maICD: 'L70.0', tenBenh: 'Mụn trứng cá thông thường', tenTiengAnh: 'Acne vulgaris', maChuong: 'XII', tenChuong: 'Bệnh của da và mô dưới da', thuongGap: 1 },

  // CHƯƠNG XIII: BỆNH HỆ CƠ XƯƠNG KHỚP VÀ MÔ LIÊN KẾT (M00-M99)
  { maICD: 'M06.9', tenBenh: 'Viêm khớp dạng thấp, không xác định', tenTiengAnh: 'Rheumatoid arthritis, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M10.9', tenBenh: 'Bệnh gút, không xác định (Gout)', tenTiengAnh: 'Gout, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M17.9', tenBenh: 'Thoái hóa khớp gối, không xác định', tenTiengAnh: 'Gonarthrosis, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M19.9', tenBenh: 'Thoái hóa khớp, không xác định', tenTiengAnh: 'Arthrosis, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M25.5', tenBenh: 'Đau khớp', tenTiengAnh: 'Pain in joint', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M47.9', tenBenh: 'Thoái hóa cột sống, không xác định', tenTiengAnh: 'Spondylosis, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M50.9', tenBenh: 'Bệnh đĩa đệm cột sống cổ, không xác định (Thoát vị đĩa đệm cổ)', tenTiengAnh: 'Cervical disc disorder, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M51.2', tenBenh: 'Thoát vị đĩa đệm cột sống thắt lưng khác', tenTiengAnh: 'Other specified intervertebral disc displacement', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M54.2', tenBenh: 'Đau cổ (Hội chứng đau vai gáy)', tenTiengAnh: 'Cervicalgia', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M54.3', tenBenh: 'Đau thần kinh tọa', tenTiengAnh: 'Sciatica', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M54.5', tenBenh: 'Đau thắt lưng (Đau lưng dưới)', tenTiengAnh: 'Low back pain', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M79.1', tenBenh: 'Đau cơ (Myalgia)', tenTiengAnh: 'Myalgia', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },
  { maICD: 'M81.9', tenBenh: 'Loãng xương, không xác định', tenTiengAnh: 'Osteoporosis, unspecified', maChuong: 'XIII', tenChuong: 'Bệnh hệ cơ-xương-khớp và mô liên kết', thuongGap: 1 },

  // CHƯƠNG XIV: BỆNH HỆ SINH DỤC - TIẾT NIỆU (N00-N99)
  { maICD: 'N18.9', tenBenh: 'Bệnh thận mạn tính, không xác định (Suy thận mạn)', tenTiengAnh: 'Chronic kidney disease, unspecified', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N20.0', tenBenh: 'Sỏi thận', tenTiengAnh: 'Calculus of kidney', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N20.1', tenBenh: 'Sỏi niệu quản', tenTiengAnh: 'Calculus of ureter', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N30.0', tenBenh: 'Viêm bàng quang cấp', tenTiengAnh: 'Acute cystitis', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N39.0', tenBenh: 'Nhiễm trùng đường tiết niệu, vị trí không xác định (UTI)', tenTiengAnh: 'Urinary tract infection, site not specified', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N40', tenBenh: 'Tăng sinh lành tính tuyến tiền liệt (Phì đại tiền liệt tuyến)', tenTiengAnh: 'Hyperplasia of prostate', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N72', tenBenh: 'Bệnh viêm cổ tử cung', tenTiengAnh: 'Inflammatory disease of cervix uteri', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N76.0', tenBenh: 'Viêm âm đạo cấp (Viêm phụ khoa)', tenTiengAnh: 'Acute vaginitis', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N92.0', tenBenh: 'Kinh nguyệt quá nhiều và thường xuyên với chu kỳ đều (Rong kinh)', tenTiengAnh: 'Excessive and frequent menstruation with regular cycle', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },
  { maICD: 'N94.6', tenBenh: 'Đau bụng kinh, không xác định', tenTiengAnh: 'Dysmenorrhoea, unspecified', maChuong: 'XIV', tenChuong: 'Bệnh hệ sinh dục-tiết niệu', thuongGap: 1 },

  // CHƯƠNG XV: THAI NGHÉN, SINH ĐẺ VÀ HẬU SẢN (O00-O99)
  { maICD: 'O00.9', tenBenh: 'Chửa ngoài tử cung, không xác định', tenTiengAnh: 'Ectopic pregnancy, unspecified', maChuong: 'XV', tenChuong: 'Thai nghén, sinh đẻ và thời kỳ sau đẻ', thuongGap: 1 },
  { maICD: 'O20.0', tenBenh: 'Dọa sẩy thai', tenTiengAnh: 'Threatened abortion', maChuong: 'XV', tenChuong: 'Thai nghén, sinh đẻ và thời kỳ sau đẻ', thuongGap: 1 },
  { maICD: 'O24.4', tenBenh: 'Đái tháo đường xuất hiện trong thời kỳ thai nghén (Đái tháo đường thai kỳ)', tenTiengAnh: 'Diabetes mellitus arising in pregnancy', maChuong: 'XV', tenChuong: 'Thai nghén, sinh đẻ và thời kỳ sau đẻ', thuongGap: 1 },
  { maICD: 'O80.0', tenBenh: 'Đẻ thường ngôi chỏm', tenTiengAnh: 'Spontaneous vertex delivery', maChuong: 'XV', tenChuong: 'Thai nghén, sinh đẻ và thời kỳ sau đẻ', thuongGap: 1 },

  // CHƯƠNG XVIII: TRIỆU CHỨNG, DẤU HIỆU VÀ KẾT QUẢ BẤT THƯỜNG (R00-R99)
  { maICD: 'R00.0', tenBenh: 'Nhịp tim nhanh, không xác định (Hồi hộp, tim đập nhanh)', tenTiengAnh: 'Tachycardia, unspecified', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R05', tenBenh: 'Ho', tenTiengAnh: 'Cough', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R06.0', tenBenh: 'Khó thở', tenTiengAnh: 'Dyspnoea', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R07.4', tenBenh: 'Đau ngực, không xác định', tenTiengAnh: 'Chest pain, unspecified', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R10.4', tenBenh: 'Đau bụng khác và không xác định', tenTiengAnh: 'Other and unspecified abdominal pain', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R11', tenBenh: 'Buồn nôn và nôn', tenTiengAnh: 'Nausea and vomiting', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R42', tenBenh: 'Chóng mặt và hoa mắt', tenTiengAnh: 'Dizziness and giddiness', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R50.9', tenBenh: 'Sốt, không xác định', tenTiengAnh: 'Fever, unspecified', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R51', tenBenh: 'Đau đầu (Nhức đầu)', tenTiengAnh: 'Headache', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },
  { maICD: 'R53', tenBenh: 'Khó ở và mệt mỏi (Suy nhược cơ thể)', tenTiengAnh: 'Malaise and fatigue', maChuong: 'XVIII', tenChuong: 'Triệu chứng, dấu hiệu và kết quả bất thường', thuongGap: 1 },

  // CHƯƠNG XIX: VẾT THƯƠNG, NGỘ ĐỘC VÀ CHẤN THƯƠNG (S00-T98)
  { maICD: 'S00.9', tenBenh: 'Chấn thương nông ở đầu, phần không xác định', tenTiengAnh: 'Superficial injury of head, part unspecified', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'S06.0', tenBenh: 'Chấn động não (Chấn thương sọ não nhẹ)', tenTiengAnh: 'Concussion', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'S52.5', tenBenh: 'Gãy đầu dưới xương quay', tenTiengAnh: 'Fracture of lower end of radius', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'S60.9', tenBenh: 'Chấn thương nông của cổ tay và bàn tay, không xác định', tenTiengAnh: 'Superficial injury of wrist and hand, unspecified', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'S83.6', tenBenh: 'Bong gân và căng cơ các phần khác và không xác định của khớp gối', tenTiengAnh: 'Sprain and strain of other and unspecified parts of knee', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'S93.4', tenBenh: 'Bong gân và căng cơ khớp cổ chân (Bong gân mắt cá chân)', tenTiengAnh: 'Sprain and strain of ankle', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'T14.0', tenBenh: 'Vết thương nông ở vùng cơ thể không xác định (Xây xát da)', tenTiengAnh: 'Superficial injury of unspecified body region', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'T14.1', tenBenh: 'Vết thương hở ở vùng cơ thể không xác định (Vết rách da chảy máu)', tenTiengAnh: 'Open wound of unspecified body region', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },
  { maICD: 'T78.4', tenBenh: 'Dị ứng, không xác định', tenTiengAnh: 'Allergy, unspecified', maChuong: 'XIX', tenChuong: 'Vết thương, ngộ độc và hậu quả khác', thuongGap: 1 },

  // CHƯƠNG XXI: YẾU TỐ ẢNH HƯỞNG TÌNH TRẠNG SỨC KHỎE (Z00-Z99)
  { maICD: 'Z00.0', tenBenh: 'Khám kiểm tra sức khỏe tổng quát (Khám sức khỏe định kỳ)', tenTiengAnh: 'General medical examination', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z01.0', tenBenh: 'Khám mắt và thị lực', tenTiengAnh: 'Examination of eyes and vision', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z01.1', tenBenh: 'Khám tai và thính lực', tenTiengAnh: 'Examination of ears and hearing', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z01.2', tenBenh: 'Khám răng', tenTiengAnh: 'Dental examination', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z02.1', tenBenh: 'Khám sức khỏe trước khi tuyển dụng lao động', tenTiengAnh: 'Pre-employment examination', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z02.5', tenBenh: 'Khám sức khỏe để cấp giấy phép lái xe', tenTiengAnh: 'Examination for participation in sport / driver license', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z23', tenBenh: 'Cần tiêm chủng phòng một bệnh đơn thuần do virus (Tiêm chủng vắc xin)', tenTiengAnh: 'Need for immunization against single viral diseases', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z34.9', tenBenh: 'Giám sát thai nghén bình thường, không xác định (Khám thai định kỳ)', tenTiengAnh: 'Supervision of normal pregnancy, unspecified', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 },
  { maICD: 'Z76.0', tenBenh: 'Cấp lại đơn thuốc (Tái kê đơn)', tenTiengAnh: 'Issue of repeat prescription', maChuong: 'XXI', tenChuong: 'Yếu tố ảnh hưởng đến tình trạng sức khoẻ', thuongGap: 1 }
];

console.log(`Loaded ${icd10List.length} authentic ICD-10 codes.`);

// 1. Generate Excel File
const excelPath = path.join(dbDir, 'Danh_Muc_ICD10_Chuan_Bo_Y_Te.xlsx');
const wsData = icd10List.map(item => ({
  'Mã ICD-10': item.maICD,
  'Tên bệnh (Tiếng Việt)': item.tenBenh,
  'Tên quốc tế (English)': item.tenTiengAnh || '',
  'Mã chương': item.maChuong || '',
  'Tên chương bệnh': item.tenChuong || '',
  'Bệnh thường gặp (1=Có, 0=Không)': item.thuongGap ? 1 : 0
}));

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(wsData);

// Set column widths
ws['!cols'] = [
  { wch: 12 }, // Mã ICD-10
  { wch: 60 }, // Tên bệnh
  { wch: 55 }, // Tên quốc tế
  { wch: 12 }, // Mã chương
  { wch: 45 }, // Tên chương
  { wch: 30 }, // Thường gặp
];

XLSX.utils.book_append_sheet(wb, ws, 'DanhMucICD10');
XLSX.writeFile(wb, excelPath);
console.log(`Created Excel file: ${excelPath}`);

// 2. Generate SQL Seed Script
const sqlPath = path.join(dbDir, 'Seed_DanhMucICD10.sql');
let sql = `-- =========================================================================
-- KỊCH BẢN TẠO BẢNG & NẠP DỮ LIỆU DANH MỤC ICD-10 CHUẨN BỘ Y TẾ VIỆT NAM
-- Cơ sở dữ liệu: QuanLyBenhVien
-- =========================================================================

USE QuanLyBenhVien;
GO

-- 1. Tạo bảng DanhMucICD10 nếu chưa tồn tại
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DanhMucICD10')
BEGIN
    CREATE TABLE dbo.DanhMucICD10 (
        maICD VARCHAR(20) NOT NULL PRIMARY KEY,
        tenBenh NVARCHAR(350) NOT NULL,
        tenTiengAnh NVARCHAR(350) NULL,
        maChuong VARCHAR(10) NULL,
        tenChuong NVARCHAR(250) NULL,
        thuongGap BIT DEFAULT 0,
        trangThai BIT DEFAULT 1,
        ngayCapNhat DATETIME2 DEFAULT SYSDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_DanhMucICD10_Search 
    ON dbo.DanhMucICD10 (maICD, thuongGap) 
    INCLUDE (tenBenh, tenChuong);

    PRINT N'Đã tạo bảng dbo.DanhMucICD10 thành công.';
END
GO

-- 2. Bulk Merge nạp dữ liệu chuẩn
BEGIN TRANSACTION;

`;

for (const row of icd10List) {
  const safeName = row.tenBenh.replaceAll("'", "''");
  const safeEn = (row.tenTiengAnh || '').replaceAll("'", "''");
  const safeCh = (row.tenChuong || '').replaceAll("'", "''");
  sql += `MERGE dbo.DanhMucICD10 AS target
USING (SELECT '${row.maICD}' AS maICD, N'${safeName}' AS tenBenh, '${safeEn}' AS tenTiengAnh, '${row.maChuong}' AS maChuong, N'${safeCh}' AS tenChuong, ${row.thuongGap} AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
`;
}

sql += `
COMMIT TRANSACTION;
PRINT N'Đã nạp thành công ${icd10List.length} mã bệnh ICD-10 vào CSDL QuanLyBenhVien.';
GO

SELECT COUNT(*) AS TongSoMaICD10 FROM dbo.DanhMucICD10;
GO
`;

fs.writeFileSync(sqlPath, sql, 'utf8');
console.log(`Created SQL file: ${sqlPath}`);
