CREATE TABLE rep_log
(
  table_name character varying(255) NOT NULL,
  operation smallint NOT NULL, -- 1 - DELETE...
  stamp timestamp with time zone NOT NULL DEFAULT ('now'::text)::timestamp(2) with time zone,
  fid integer NOT NULL
)
WITH (
  OIDS=FALSE
);
ALTER TABLE rep_log
  OWNER TO postgres;
COMMENT ON COLUMN rep_log.operation IS '1 - DELETE
2 - INSERT
3 - UPDATE';
