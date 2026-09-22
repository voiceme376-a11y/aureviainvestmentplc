PRAGMA foreign_keys=ON;
ALTER TABLE profiles ADD COLUMN nationality TEXT;
ALTER TABLE profiles ADD COLUMN gender TEXT;
ALTER TABLE profiles ADD COLUMN tax_residency TEXT;
ALTER TABLE profiles ADD COLUMN source_of_funds TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
