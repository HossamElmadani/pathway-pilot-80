
-- Drop old multi-tenant schema
DROP TABLE IF EXISTS public.step_progress CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.agencies CASCADE;

DROP FUNCTION IF EXISTS public.is_agency_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_agency_id() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.doc_status CASCADE;
DROP TYPE IF EXISTS public.application_status CASCADE;
DROP TYPE IF EXISTS public.step_status CASCADE;

-- Enums
CREATE TYPE public.app_role AS ENUM ('director', 'worker', 'student');
CREATE TYPE public.doc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.application_status AS ENUM ('pending', 'submitted', 'accepted', 'rejected', 'waitlisted');
CREATE TYPE public.step_status AS ENUM ('locked', 'in_progress', 'pending_review', 'approved', 'rejected');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  current_step int NOT NULL DEFAULT 1,
  must_change_password boolean NOT NULL DEFAULT false,
  assigned_worker_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  personal_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  academic_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_language text NOT NULL DEFAULT 'fr',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_assigned_worker ON public.profiles(assigned_worker_id);

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'director')
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'worker')
$$;

-- Returns true if current user is director, OR is the assigned worker of _student_id
CREATE OR REPLACE FUNCTION public.can_manage_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'director')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _student_id AND assigned_worker_id = auth.uid()
    )
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Profiles RLS
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "directors view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_director());
CREATE POLICY "workers view assigned + self + staff" ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'worker')
    AND (assigned_worker_id = auth.uid() OR id = auth.uid())
  );
CREATE POLICY "staff insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());
CREATE POLICY "directors update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_director()) WITH CHECK (public.is_director());
CREATE POLICY "workers update assigned student" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'worker') AND assigned_worker_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'worker') AND assigned_worker_id = auth.uid());

-- User roles RLS
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "directors manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_director()) WITH CHECK (public.is_director());
CREATE POLICY "workers assign student role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'worker') AND role = 'student');
CREATE POLICY "staff view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_staff());

-- Universities (global to the agency)
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  price numeric,
  ranking int,
  description text,
  image_url text,
  badges text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all authenticated view universities" ON public.universities FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage universities" ON public.universities FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  step int NOT NULL DEFAULT 2,
  file_name text NOT NULL,
  file_url text NOT NULL,
  status doc_status NOT NULL DEFAULT 'pending',
  is_mandatory boolean NOT NULL DEFAULT true,
  feedback text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_documents_user ON public.documents(user_id);

CREATE POLICY "students view own documents" ON public.documents FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "students insert own documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "students delete own pending docs" ON public.documents FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "staff view managed documents" ON public.documents FOR SELECT TO authenticated
  USING (public.can_manage_student(user_id));
CREATE POLICY "staff update managed documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.can_manage_student(user_id)) WITH CHECK (public.can_manage_student(user_id));

-- Applications
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  university_id uuid NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_apps_user ON public.applications(user_id);

CREATE POLICY "students manage own applications" ON public.applications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff view managed applications" ON public.applications FOR SELECT TO authenticated
  USING (public.can_manage_student(user_id));
CREATE POLICY "staff update managed applications" ON public.applications FOR UPDATE TO authenticated
  USING (public.can_manage_student(user_id)) WITH CHECK (public.can_manage_student(user_id));

-- Step progress
CREATE TABLE public.step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step int NOT NULL,
  status step_status NOT NULL DEFAULT 'locked',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step)
);
ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_step_progress_user ON public.step_progress(user_id);

CREATE TRIGGER trg_step_progress_updated BEFORE UPDATE ON public.step_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "students view own progress" ON public.step_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "students insert own progress" ON public.step_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "students update own progress" ON public.step_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff view managed progress" ON public.step_progress FOR SELECT TO authenticated
  USING (public.can_manage_student(user_id));
CREATE POLICY "staff update managed progress" ON public.step_progress FOR UPDATE TO authenticated
  USING (public.can_manage_student(user_id)) WITH CHECK (public.can_manage_student(user_id));

-- Storage policies (documents bucket already exists)
DROP POLICY IF EXISTS "students upload own docs" ON storage.objects;
DROP POLICY IF EXISTS "students read own docs" ON storage.objects;
DROP POLICY IF EXISTS "staff read managed docs" ON storage.objects;

CREATE POLICY "students upload own docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "students read own docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "staff read managed docs" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.can_manage_student(((storage.foldername(name))[1])::uuid)
  );
