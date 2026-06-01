
-- 1) suggested_universities junction
CREATE TABLE public.suggested_universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  university_id uuid NOT NULL,
  suggested_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, university_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggested_universities TO authenticated;
GRANT ALL ON public.suggested_universities TO service_role;

ALTER TABLE public.suggested_universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student views own suggestions"
ON public.suggested_universities FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "staff view managed suggestions"
ON public.suggested_universities FOR SELECT
TO authenticated
USING (public.can_manage_student(student_id));

CREATE POLICY "staff insert suggestions"
ON public.suggested_universities FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_student(student_id));

CREATE POLICY "staff update suggestions"
ON public.suggested_universities FOR UPDATE
TO authenticated
USING (public.can_manage_student(student_id))
WITH CHECK (public.can_manage_student(student_id));

CREATE POLICY "staff delete suggestions"
ON public.suggested_universities FOR DELETE
TO authenticated
USING (public.can_manage_student(student_id));

CREATE INDEX idx_suggested_universities_student ON public.suggested_universities(student_id);
CREATE INDEX idx_suggested_universities_university ON public.suggested_universities(university_id);

-- 2) Restrict student access to the global universities catalogue
DROP POLICY IF EXISTS "all authenticated view universities" ON public.universities;

CREATE POLICY "staff view all universities"
ON public.universities FOR SELECT
TO authenticated
USING (public.is_staff());

CREATE POLICY "students view suggested universities"
ON public.universities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.suggested_universities su
    WHERE su.university_id = universities.id
      AND su.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.university_id = universities.id
      AND a.user_id = auth.uid()
  )
);
