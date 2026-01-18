-- DIAGNOSTIC QUERY
-- Run this to check if your tables have data
SELECT 'RTO' as table_name, count(*) as row_count FROM "RTO"
UNION ALL
SELECT 'Detections' as table_name, count(*) as row_count FROM "Detections";
