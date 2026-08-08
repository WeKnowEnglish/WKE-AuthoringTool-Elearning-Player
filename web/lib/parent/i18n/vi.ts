import type { ParentMessageKey } from "@/lib/parent/i18n/en";

/** Vietnamese parent-portal UI copy (Phase 1: shell, login, settings). */
export const parentMessagesVi = {
  "brand.parentPortal": "Cổng phụ huynh",
  "brand.tagline": "We Know English",

  "nav.stream": "Dòng lớp học",
  "nav.streamShort": "Lớp học",
  "nav.progress": "Tiến bộ",
  "nav.children": "Con em",
  "nav.alerts": "Thông báo",
  "nav.settings": "Cài đặt phụ huynh",
  "nav.signOut": "Đăng xuất",
  "nav.notifications": "Thông báo",
  "nav.notificationsUnread": "Thông báo, {count} chưa đọc",
  "nav.child": "Con",
  "nav.chooseChild": "Chọn con",
  "nav.parentPortal": "Cổng phụ huynh",

  "login.title": "Cổng phụ huynh",
  "login.subtitle":
    "Xem cập nhật lớp học đã được giáo viên duyệt và câu chuyện rõ ràng về việc học của con.",
  "login.modeSignIn": "Đăng nhập",
  "login.modeCreate": "Tạo tài khoản",
  "login.name": "Tên của bạn",
  "login.email": "Địa chỉ email",
  "login.password": "Mật khẩu",
  "login.submitSignIn": "Đăng nhập cổng phụ huynh",
  "login.submitCreate": "Tạo tài khoản phụ huynh",
  "login.submitSignInInvite": "Đăng nhập và tiếp tục",
  "login.submitCreateInvite": "Tạo tài khoản và tiếp tục",
  "login.busy": "Vui lòng chờ…",
  "login.errorEmail": "Nhập địa chỉ email hợp lệ.",
  "login.errorPassword": "Mật khẩu phải có ít nhất 8 ký tự.",
  "login.errorName": "Nhập tên của bạn.",
  "login.errorCredentials": "Email hoặc mật khẩu không đúng.",
  "login.errorGeneric": "Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại.",
  "login.checkEmail":
    "Kiểm tra email để xác minh tài khoản, rồi quay lại lời mời này và đăng nhập.",
  "login.inviteHint":
    "Dùng đúng địa chỉ email đã nhận lời mời. Email phải được xác minh trước khi kích hoạt quyền truy cập của học sinh.",
  "login.language": "Ngôn ngữ",
  "login.languageEn": "English",
  "login.languageVi": "Tiếng Việt",

  "settings.eyebrow": "Tài khoản",
  "settings.title": "Cài đặt phụ huynh",
  "settings.subtitle":
    "Chọn cách cổng thông tin cập nhật cho bạn. Chi tiết học tập của học sinh không bao giờ được đưa vào email thông báo.",
  "settings.name": "Tên của bạn",
  "settings.language": "Ngôn ngữ ưa thích",
  "settings.languageEn": "English",
  "settings.languageVi": "Tiếng Việt",
  "settings.notifications": "Thông báo",
  "settings.inAppTitle": "Thông báo trong ứng dụng",
  "settings.inAppBody":
    "Hiển thị báo cáo tiến bộ mới và thông báo quyền truy cập gia đình trên cổng phụ huynh.",
  "settings.emailTitle": "Email quan trọng",
  "settings.emailBody":
    "Nhận email chung khi có báo cáo mới hoặc thay đổi quyền truy cập gia đình. Email không chứa chi tiết học tập của học sinh.",
  "settings.save": "Lưu cài đặt",
  "settings.saving": "Đang lưu...",
  "settings.errorName": "Nhập tên của bạn.",
  "settings.saved": "Đã lưu cài đặt.",
} as const satisfies Record<ParentMessageKey, string>;
