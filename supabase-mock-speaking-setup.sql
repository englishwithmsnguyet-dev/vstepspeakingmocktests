-- ============================================================================
-- VSTEP SPEAKING MOCK TESTS (PART 1–3) — SUPABASE DATABASE, STORAGE & 6H LOCK
-- ============================================================================
-- Thiết kế riêng cho website vstepspeakingmocktests:
-- - Học viên GIỮ NGUYÊN đăng nhập hiện tại (Họ tên + Mã lớp + Mật khẩu ở web)
--   nên toàn bộ dữ liệu nộp bài & bài sửa AI được khoá RLS ở tầng Database:
--   + Học viên CHỈ giao tiếp qua Edge Function `grade-mock-speaking` (server kiểm
--     tra release_at <= now() và ẩn điểm số nội bộ trước khi trả về).
--   + Giáo viên đăng nhập Supabase Auth tại `teacher-grading.html` và có toàn
--     quyền xem ngay lập tức, nghe 3 file audio, chấm lại, trả bài sớm & xoá bài.
--
-- Cách chạy:
-- 1. Mở Supabase Dashboard -> SQL Editor -> New query
-- 2. Đổi Gmail giáo viên ở mục 1 bên dưới thành Gmail thật của bạn
-- 3. Dán toàn bộ file này và bấm RUN
-- 4. Deploy Edge Function `grade-mock-speaking` từ:
--    supabase/functions/grade-mock-speaking/index.ts
-- ============================================================================

-- 1. BẢNG DANH SÁCH GIÁO VIÊN (Bảo mật quyền admin trên server)
create table if not exists public.teachers (
  email text primary key,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;

-- >>> ĐỊA CHỈ GMAIL GIÁO VIÊN CỦA BẠN <<<
insert into public.teachers (email, full_name)
values ('nguyetphamforwork@gmail.com', 'Cô Nguyệt')
on conflict (email) do nothing;

create or replace function public.is_teacher()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "Teachers: read own record" on public.teachers;
create policy "Teachers: read own record"
  on public.teachers for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 2. BẢNG BÀI NỘP MOCK TEST SPEAKING (TRỌN BỘ 3 PART)
create table if not exists public.mock_speaking_submissions (
  id text primary key,
  student_key text not null,
  student_name text not null,
  class_code text not null default '',
  test_id int not null,
  test_title text not null default '',
  target_level text not null default 'B1',
  prompt_part1 text not null default '',
  prompt_part2 text not null default '',
  prompt_part3 text not null default '',
  audio_path_p1 text not null default '',
  audio_path_p2 text not null default '',
  audio_path_p3 text not null default '',
  duration_p1 int not null default 0,
  duration_p2 int not null default 0,
  duration_p3 int not null default 0,
  status text not null default 'uploading',
  submitted_at timestamptz,
  release_at timestamptz,
  teacher_score text not null default '',
  teacher_feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mock_sub_student_key
  on public.mock_speaking_submissions (student_key, submitted_at desc);

create index if not exists idx_mock_sub_test_class
  on public.mock_speaking_submissions (test_id, class_code, submitted_at desc);

create index if not exists idx_mock_sub_status
  on public.mock_speaking_submissions (status, submitted_at desc);

alter table public.mock_speaking_submissions enable row level security;

-- Chỉ Giáo viên (Supabase Auth) và Edge Function (service_role) được truy cập trực tiếp
drop policy if exists "Mock Submissions: teacher full access" on public.mock_speaking_submissions;
create policy "Mock Submissions: teacher full access"
  on public.mock_speaking_submissions for all
  using (public.is_teacher())
  with check (public.is_teacher());

-- 3. BẢNG BÀI CHẤM & SỬA AI CHO MOCK TEST (HẸN GIỜ TRẢ SAU 6 TIẾNG)
create table if not exists public.mock_speaking_ai_reviews (
  id text primary key,
  submission_id text not null unique references public.mock_speaking_submissions(id) on delete cascade,
  student_key text not null,
  student_name text not null default '',
  class_code text not null default '',
  test_id int not null,
  target_level text not null default 'B1',
  status text not null default 'pending',
  release_at timestamptz not null default (now() + interval '6 hours'),
  review_json jsonb,
  error_message text not null default '',
  retry_count int not null default 0,
  student_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mock_rev_student_release
  on public.mock_speaking_ai_reviews (student_key, release_at desc);

create index if not exists idx_mock_rev_status
  on public.mock_speaking_ai_reviews (status, updated_at asc);

alter table public.mock_speaking_ai_reviews enable row level security;

-- Học viên KHÔNG thể đọc trực tiếp bảng này từ trình duyệt -> không thể vượt rào 6 tiếng
drop policy if exists "Mock AI Reviews: teacher full access" on public.mock_speaking_ai_reviews;
create policy "Mock AI Reviews: teacher full access"
  on public.mock_speaking_ai_reviews for all
  using (public.is_teacher())
  with check (public.is_teacher());

-- 4. RPC CHO GIÁO VIÊN TRẢ BÀI SỬA SỚM HƠN 6 TIẾNG
create or replace function public.teacher_release_mock_review_now(p_submission_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
begin
  if not public.is_teacher() then
    raise exception 'Permission denied: only teachers can release reviews early';
  end if;

  update public.mock_speaking_ai_reviews
  set release_at = now_ts,
      student_seen_at = null,
      updated_at = now_ts
  where submission_id = p_submission_id or id = p_submission_id;

  update public.mock_speaking_submissions
  set release_at = now_ts,
      status = case when status in ('scheduled', 'submitted', 'grading', 'ready') then 'ready' else status end,
      updated_at = now_ts
  where id = p_submission_id;
end;
$$;

-- 5. PRIVATE STORAGE BUCKET LƯU FILE GHI ÂM PART 1–3
insert into storage.buckets (id, name, public)
values ('mock-speaking-recordings', 'mock-speaking-recordings', false)
on conflict (id) do nothing;

-- Giáo viên được nghe & xoá mọi file ghi âm; học viên upload qua Signed Upload URL của Edge Function
drop policy if exists "Mock Audio: teacher read all" on storage.objects;
create policy "Mock Audio: teacher read all"
  on storage.objects for select
  using (bucket_id = 'mock-speaking-recordings' and public.is_teacher());

drop policy if exists "Mock Audio: teacher delete all" on storage.objects;
create policy "Mock Audio: teacher delete all"
  on storage.objects for delete
  using (bucket_id = 'mock-speaking-recordings' and public.is_teacher());

-- 6. CẤP QUYỀN TRUY CẬP CHO AUTHENTICATED & SERVICE_ROLE
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.teachers to authenticated, service_role;
grant select, insert, update, delete on table public.mock_speaking_submissions to authenticated, service_role;
grant select, insert, update, delete on table public.mock_speaking_ai_reviews to authenticated, service_role;
grant execute on function public.is_teacher() to anon, authenticated, service_role;
grant execute on function public.teacher_release_mock_review_now(text) to authenticated, service_role;

-- 7. BẬT HÀNG ĐỢI TỰ ĐỘNG CHẤM LẠI MỖI 5 PHÚT (CHẠY RIÊNG SAU KHI DEPLOY EDGE FUNCTION)
-- Hướng dẫn:
--   Bước A: Vào Edge Functions -> Secrets, thêm GEMINI_API_KEY và CRON_SECRET
--   Bước B: Bỏ dấu "--" các dòng dưới, thay PROJECT_REF và CRON_SECRET rồi RUN 1 lần:
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.unschedule('vstep-mock-speaking-queue') where exists (
--   select 1 from cron.job where jobname = 'vstep-mock-speaking-queue'
-- );
-- select cron.schedule(
--   'vstep-mock-speaking-queue',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://cssfktsmqyadgzjakgbo.supabase.co/functions/v1/grade-mock-speaking',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', 'THAY_BANG_CRON_SECRET_CUA_BAN'
--     ),
--     body := '{"action":"process_queue","batch_size":2}'::jsonb
--   );
--   $$
-- );
