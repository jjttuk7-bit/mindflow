-- Content management columns
alter table items add column if not exists is_pinned boolean default false;
alter table items add column if not exists is_archived boolean default false;
