CREATE OR REPLACE FUNCTION ng_getlrdist(name, double precision, double precision) RETURNS TABLE(distance double precision, uniq_uid TEXT) AS 
$$
DECLARE ret RECORD;
DECLARE pt geometry := ST_SetSRID(ST_MakePoint($3, $4),4326);
DECLARE part geometry;
DECLARE dist double precision;
BEGIN
--get uniq_uid list
  FOR uniq_uid IN EXECUTE 'SELECT uniq_uid FROM ' || $1 || ' GROUP BY "uniq_uid";'
  LOOP 
    RETURN QUERY SELECT * FROM ng_getlrdistbyuuid($1, uniq_uid::TEXT, $2, $3);
  END LOOP;
  RETURN;
END;
$$
LANGUAGE plpgsql STABLE;