CREATE OR REPLACE FUNCTION ng_getlrsublinebyuuid(name, text, double precision, double precision, double precision) RETURNS geometry AS 
$$
DECLARE output geometry;
DECLARE part geometry;
DECLARE subline geometry;
DECLARE beg_pt geometry;
DECLARE end_pt geometry;
--get floor of beg
DECLARE round_beg double precision := floor($3 / $5) * $5;
--get ceil of end
DECLARE round_end double precision := ceil($4 / $5) * $5;
BEGIN
--get subline from parts
  EXECUTE 'SELECT ST_Union(foo.wkb_geometry) FROM (SELECT * FROM ' || $1 || ' WHERE "beg" >= ' ||  round_beg || ' AND "end" <= ' || round_end || ' AND "uniq_uid" = ''' || $2 || '''  ORDER BY "beg") as foo' INTO part;
-- ccc
  SELECT ST_LineMerge(part) INTO subline;
  
--get begin point
  SELECT ng_getlrposbyuuid($1,$2,$3) INTO beg_pt;
--get end point
  SELECT ng_getlrposbyuuid($1,$2,$4) INTO end_pt;
--divide subline by 2 point
  SELECT ST_Line_Substring(subline, ST_Line_Locate_Point(subline, beg_pt), ST_Line_Locate_Point(subline, end_pt)) INTO output;

  RETURN output;
END;
$$
LANGUAGE plpgsql STABLE;