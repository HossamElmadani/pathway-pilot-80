
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_director() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_student(uuid) TO authenticated;
