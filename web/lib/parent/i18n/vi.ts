import type { ParentMessageKey } from "@/lib/parent/i18n/en";

/** Vietnamese parent-portal UI copy (Phase 1–2). */
export const parentMessagesVi = {
  "brand.parentPortal": "Cổng phụ huynh",
  "brand.tagline": "We Know English",

  "nav.stream": "Dòng lớp học",
  "nav.streamShort": "Lớp học",
  "nav.progress": "Tiến bộ",
  "nav.children": "Con em",
  "nav.alerts": "Thông báo",
  "nav.home": "Trang chủ phụ huynh",
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

  "home.welcomeTitle": "Chào mừng phụ huynh",
  "home.welcomeBody":
    "Bạn có thể đặt buổi học thử trước khi con có tài khoản học sinh. Nếu giáo viên đã mời bạn, hãy dùng lời mời trong email để liên kết với học sinh đã ghi danh.",
  "home.findTeacher": "Tìm giáo viên & đặt học thử",
  "home.howItWorks": "Cách hoạt động",
  "home.inviteTitle": "Đã nhận lời mời lớp học?",
  "home.inviteBody":
    "Quay lại email đó và dùng liên kết lời mời riêng với địa chỉ đã xác minh này.",
  "home.viewChildren": "Xem danh sách con",
  "home.yourChild": "Con của bạn",

  "children.eyebrow": "Quyền truy cập gia đình",
  "children.title": "Con đã liên kết",
  "children.subtitle":
    "Đây là các con đã được giáo viên phê duyệt quyền truy cập cho tài khoản này.",
  "children.activeConnection": "Kết nối gia đình đang hoạt động",
  "children.activeAccess": "Đang có quyền truy cập",
  "children.viewUpdates": "Xem cập nhật",
  "children.emptyTitle": "Chưa có kết nối",
  "children.emptyBody": "Cần lời mời từ giáo viên để liên kết với con.",
  "children.changeTitle": "Cần thay đổi hoặc gỡ quyền truy cập?",
  "children.changeBody":
    "Liên hệ giáo viên của con. Vì lý do bảo mật học sinh, không thể thêm hoặc chuyển quan hệ gia đình từ trang này.",

  "alerts.eyebrow": "Cập nhật",
  "alerts.title": "Thông báo",
  "alerts.subtitle":
    "Thông báo quan trọng về báo cáo và quyền truy cập gia đình. Chi tiết học tập chỉ nằm trong cổng an toàn.",
  "alerts.emptyTitle": "Chưa có thông báo",
  "alerts.emptyBody": "Các cập nhật quan trọng về báo cáo và quyền truy cập sẽ hiện ở đây.",
  "alerts.unreadCount": "{count} thông báo chưa đọc",
  "alerts.unreadCountPlural": "{count} thông báo chưa đọc",
  "alerts.markAll": "Đánh dấu tất cả đã đọc",
  "alerts.updating": "Đang cập nhật...",
  "alerts.new": "Mới",
  "alerts.recent": "Gần đây",

  "stream.emptyTitle": "Cập nhật sẽ hiện ở đây",
  "stream.emptyBody":
    "Giáo viên của {name} chưa chia sẻ cập nhật dành cho phụ huynh. Chỉ thông tin được chọn dành cho gia đình mới xuất hiện trên dòng này.",
  "stream.openResource": "Mở tài nguyên đã chia sẻ",
  "stream.type.teacher_update": "Cập nhật từ giáo viên",
  "stream.type.teacher_link": "Tài nguyên được chia sẻ",
  "stream.type.homework_update": "Cập nhật bài tập",
  "stream.type.learning_activity": "Hoạt động học tập",
  "stream.type.student_highlight": "Điểm nổi bật học tập",
  "stream.type.milestone": "Cột mốc",
  "stream.type.progress_report": "Báo cáo tiến bộ",

  "schedule.eyebrow": "Lịch lớp học",
  "schedule.nextLesson": "Buổi học tiếp theo",
  "schedule.nextLessonLabel": "Buổi học tiếp theo: {label}",
  "schedule.classTimezone": "Múi giờ lớp: {zone}",
  "schedule.yourTime": "Giờ của bạn: {time} ({zone})",
  "schedule.noWeekly":
    "Chưa có lịch học hàng tuần. Hãy hỏi giáo viên nếu bạn chưa rõ giờ học.",
  "schedule.notLinked": "Con chưa được liên kết với lịch lớp đang hoạt động.",
  "schedule.minutes": "{count} phút",

  "trial.eyebrow": "Buổi học thử",
  "trial.confirmedTitle": "Học thử đã xác nhận",
  "trial.classroomReady":
    "Quyền vào lớp sẽ sẵn sàng khi con có tài khoản học sinh và được ghi danh.",
  "trial.pendingTitle": "Yêu cầu đang chờ",
  "trial.pendingTitlePlural": "Các yêu cầu đang chờ",
  "trial.awaiting": "Đang chờ phản hồi từ giáo viên",
  "trial.cancel": "Hủy",

  "pref.eyebrow": "Chọn khung giờ phù hợp",
  "pref.titleWithClass": "{classTitle} · khung giờ ưu tiên",
  "pref.title": "Khung giờ lớp ưu tiên",
  "pref.body":
    "Chạm các khung giờ phù hợp với gia đình, rồi dùng lên/xuống để xếp thứ tự. Lựa chọn đầu giúp giáo viên xếp lớp.",
  "pref.timezoneNote": " Giờ hiển thị theo múi giờ lớp ({zone}).",
  "pref.minutes": "{count} phút",
  "pref.up": "Lên",
  "pref.down": "Xuống",
  "pref.tapToAdd": "Chạm để thêm",
  "pref.save": "Lưu lựa chọn",
  "pref.saving": "Đang lưu…",
  "pref.saved": "Đã lưu lựa chọn. Giáo viên sẽ chọn giờ học cho lớp.",

  "langTip.message": "Xem cổng phụ huynh bằng tiếng Việt? · View in Vietnamese?",
  "langTip.chooseVi": "Tiếng Việt",
  "langTip.dismiss": "Để sau",
} as const satisfies Record<ParentMessageKey, string>;
