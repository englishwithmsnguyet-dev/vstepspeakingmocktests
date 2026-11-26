// ============================================================================
// CẤU HÌNH SUPABASE CHO TÍNH NĂNG CHẤM ĐIỂM VSTEP SPEAKING MOCK TESTS
// ============================================================================
// Đã kết nối tới dự án Supabase của bạn (https://cssfktsmqyadgzjakgbo.supabase.co).
// Lưu ý: Khóa Publishable là khóa công khai dành cho trình duyệt, an toàn khi
// đưa lên GitHub Pages nhờ Row Level Security (RLS) trong supabase-mock-speaking-setup.sql.
// ============================================================================

window.VSTEP_SPEAKING_GRADER_CONFIG = {
  url: "https://cssfktsmqyadgzjakgbo.supabase.co",
  anonKey: "sb_publishable_7lKDuGVWXrILo11Jygwv2g_jhtoC_0H",
  edgeFunctionName: "grade-mock-speaking",
  releaseDelayHours: 8,
  teacherEmail: "nguyetphamforwork@gmail.com",
  teacherPageUrl: "teacher-grading.html"
};
