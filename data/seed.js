// Dữ liệu dự phòng khi mở bằng file:// (không fetch được giapha.json).
// Trên GitHub Pages, app luôn ưu tiên đọc data/giapha.json.
window.GIAPHA_SEED = {
  tenDongHo: "Gia phả dòng họ",
  chiPhai: "",
  khauHieu: "Cây có gốc mới nở cành xanh ngọn — Nước có nguồn mới bể rộng sông sâu",
  lichSu: "Chưa cập nhật lịch sử dòng họ. Vào trang Quản trị để bổ sung.",
  nhaTho: { ten:"Nhà thờ tổ", diaChi:"", mapEmbed:"", lat:"", lng:"", moTa:"" },
  thanhVien: [
    { id:"to-1", hoTen:"Thủy tổ (chưa cập nhật)", gioiTinh:"nam", parentId:null, spouseOfId:null,
      doi:1, conThuTu:1, namSinh:"", namMat:"", ngayGioAmLich:"", ngayGioDuong:"",
      anh:"", video:"", chucDanh:"Thủy tổ", noiSinhSong:"",
      tieuSu:"Người khai sinh dòng họ. Hãy vào trang Quản trị để cập nhật thông tin và thêm hậu duệ." }
  ],
  suKien: [],
  tinTuc: []
};
