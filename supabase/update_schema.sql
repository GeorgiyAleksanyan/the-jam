-- Add output and logs columns to agents table
alter table agents 
add column if not exists output text,
add column if not exists logs text;
