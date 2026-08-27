CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"notification_id" text NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
DO $$
DECLARE
 expected record;
 actual_data_type text;
 actual_is_nullable text;
 actual_default text;
BEGIN
 FOR expected IN
  SELECT * FROM (VALUES
   ('notifications', 'id', 'text', 'NO', NULL),
   ('notifications', 'type', 'text', 'NO', NULL),
   ('notifications', 'title', 'text', 'NO', NULL),
   ('notifications', 'message', 'text', 'NO', NULL),
   ('notifications', 'metadata', 'jsonb', 'YES', '''{}''::jsonb'),
   ('notifications', 'created_at', 'timestamp without time zone', 'NO', 'now()'),
   ('notification_recipients', 'id', 'uuid', 'NO', 'gen_random_uuid()'),
   ('notification_recipients', 'user_id', 'text', 'NO', NULL),
   ('notification_recipients', 'notification_id', 'text', 'NO', NULL),
   ('notification_recipients', 'read_at', 'timestamp without time zone', 'YES', NULL)
  ) AS required(table_name, column_name, data_type, is_nullable, expected_default)
 LOOP
  SELECT column_entry.data_type, column_entry.is_nullable, column_entry.column_default
  INTO actual_data_type, actual_is_nullable, actual_default
  FROM information_schema.columns AS column_entry
  WHERE column_entry.table_schema = 'public'
    AND column_entry.table_name = expected.table_name
    AND column_entry.column_name = expected.column_name;

  IF NOT FOUND
    OR actual_data_type <> expected.data_type
    OR actual_is_nullable <> expected.is_nullable
    OR (expected.expected_default IS NOT NULL AND actual_default IS DISTINCT FROM expected.expected_default)
  THEN
   RAISE EXCEPTION 'Unsafe legacy notification schema: %.% does not match required type/nullability/default', expected.table_name, expected.column_name;
  END IF;
 END LOOP;

 IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint AS constraint_entry
  WHERE constraint_entry.conrelid = 'public.notifications'::regclass
    AND constraint_entry.contype = 'p'
    AND pg_get_constraintdef(constraint_entry.oid) = 'PRIMARY KEY (id)'
 ) THEN
  RAISE EXCEPTION 'Unsafe legacy notification schema: notifications.id must be the primary key';
 END IF;

 IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint AS constraint_entry
  WHERE constraint_entry.conrelid = 'public.notification_recipients'::regclass
    AND constraint_entry.contype = 'p'
    AND pg_get_constraintdef(constraint_entry.oid) = 'PRIMARY KEY (id)'
 ) THEN
  RAISE EXCEPTION 'Unsafe legacy notification schema: notification_recipients.id must be the primary key';
 END IF;
END $$;
--> statement-breakpoint
DO $$
DECLARE
 existing_constraint text;
BEGIN
 SELECT constraint_entry.conname
 INTO existing_constraint
 FROM pg_constraint AS constraint_entry
 WHERE constraint_entry.conrelid = 'public.notification_recipients'::regclass
   AND constraint_entry.confrelid = 'public.notifications'::regclass
   AND constraint_entry.contype = 'f'
 ORDER BY (constraint_entry.conname = 'notification_recipients_notification_id_notifications_id_fk') DESC
 LIMIT 1;

 IF existing_constraint IS NULL THEN
  ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
 ELSIF existing_constraint <> 'notification_recipients_notification_id_notifications_id_fk' THEN
  EXECUTE format(
   'ALTER TABLE "notification_recipients" RENAME CONSTRAINT %I TO "notification_recipients_notification_id_notifications_id_fk"',
   existing_constraint
  );
 END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_recipients_user_notification_idx" ON "notification_recipients" USING btree ("user_id","notification_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipients_user_id_idx" ON "notification_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipients_notification_id_idx" ON "notification_recipients" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");