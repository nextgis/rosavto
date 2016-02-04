#!/bin/bash

PGDB='rosavto'

update_db () {

table_name=$1
table_schema=$2

psql -a -d $PGDB -c "
--create index

CREATE INDEX "$table_name"_uniq_uid_idx ON $table_schema.\"$table_name\"
USING btree   (uniq_uid COLLATE pg_catalog.\"default\");

--alter date fields

ALTER TABLE $table_schema.\"$table_name\" ALTER COLUMN adate_beg TYPE timestamp with time zone;
ALTER TABLE $table_schema.\"$table_name\" ALTER COLUMN adate_beg SET NOT NULL;
ALTER TABLE $table_schema.\"$table_name\" ALTER COLUMN adate_beg SET DEFAULT '1970-01-01';

ALTER TABLE $table_schema.\"$table_name\" ALTER COLUMN adate_end TYPE timestamp with time zone;
ALTER TABLE $table_schema.\"$table_name\" ALTER COLUMN adate_end SET NOT NULL;
ALTER TABLE $table_schema.\"$table_name\" ALTER COLUMN adate_end SET DEFAULT '2199-01-01';

--create trigger function

CREATE OR REPLACE FUNCTION "$table_name"_history()
  RETURNS trigger AS
\$BODY\$
    BEGIN
        IF NEW.adate_beg > OLD.adate_beg THEN
        IF NEW.adate_beg < OLD.adate_end THEN --divide previous time period
            NEW.adate_end := OLD.adate_end;
            OLD.adate_end := NEW.adate_beg;
        ELSE
            NEW.adate_end := '2199-01-01';
        END IF;
        ELSEIF NEW.adate_beg < OLD.adate_beg THEN
            NEW.adate_end := OLD.adate_beg;
        ELSE
            RETURN NEW; --nothing to do
            END IF;
            BEGIN
            EXECUTE 'SELECT nextval(''' || TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME || '_ogc_fid_seq''::regclass)' INTO NEW.ogc_fid;
            INSERT INTO $table_schema.\"$table_name\" VALUES (NEW.*);
        END;
        RETURN OLD;
    END;
\$BODY\$
  LANGUAGE plpgsql VOLATILE
  COST 100;

--create trigger

--CREATE TRIGGER "$table_name"_history BEFORE UPDATE ON $table_schema.\"$table_name\" FOR EACH ROW EXECUTE PROCEDURE "$table_name"_history();"

}

drop_trigger_in_db () {

table_name=$1
table_schema=$2

psql -a -d $PGDB -c "
DROP TRIGGER "$table_name"_history ON $table_schema.\"$table_name\";"

}

#tables
thematic_table_list=("accidents" "borders_dept" "chemical_plants" "crossing_joining" "danger_stretches" "detour" "emergency_posts" "facilities" "facilities_danger_zones" "facilities_important" "floods" "hydro_power_plant" "meteo" "nuclear_power_plant" "pk" "productions" "reservoir" "road_parts_danger_zones" "road_parts_floods" "road_parts_rockslide" "road_parts_snowfall" "road_parts_snowslip" "roads" "roads_dep" "roads_oudh" "roads_regional" "sensors_meteo" "sensors_video" "sensors_traffic" "service" "weight_control_points" "workobj_line" "workobj_points")

#run for thematic

for table_name in ${thematic_table_list[@]}
do
    update_db "$table_name" "thematic"
    python /home/cloud/projects/ngw/nextgisweb_rosavto/nextgisweb_rosavto/pg_replica/table-register "thematic".${table_name}

#    drop_trigger_in_db "$table_name" "thematic"
done

#run for basic
basic_table_list=("federal_districts" "regions")

for table_name in ${basic_table_list[@]}
do
    update_db "$table_name" "basic"
    python /home/cloud/projects/ngw/nextgisweb_rosavto/nextgisweb_rosavto/pg_replica/table-register "basic".${table_name}
#    drop_trigger_in_db "$table_name" "basic"
done

# run for routing
routing_table_list=( "ways" )

for table_name in ${routing_table_list[@]}
do
    python /home/cloud/projects/ngw/nextgisweb_rosavto/nextgisweb_rosavto/pg_replica/table-register "routing".${table_name}
done

exit 0