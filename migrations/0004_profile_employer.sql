PRAGMA foreign_keys=ON;
ALTER TABLE profiles ADD COLUMN employer_name TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_employer ON profiles(employer_name);
