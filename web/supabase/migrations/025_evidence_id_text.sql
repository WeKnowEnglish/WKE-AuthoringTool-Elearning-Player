-- 025_evidence_id_text.sql
-- P1c: evidence event ids are composite strings, not UUIDs

alter table public.student_learning_evidence
  alter column id type text using id::text;
