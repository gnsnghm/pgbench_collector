-- 実行時に lab が無ければ作成
DO
$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'lab') THEN
     CREATE DATABASE lab;
  END IF;
END;
$$;