CREATE TABLE "catalogue_override" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"name" text,
	"category" text,
	"note" text,
	"quantity_mode" text,
	"quantity_value" integer,
	"quantity_cap" integer
);
--> statement-breakpoint
CREATE TABLE "packing_list" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"catalogue_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packing_list_trip_id_unique" UNIQUE("trip_id")
);
--> statement-breakpoint
CREATE TABLE "packing_list_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"list_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_ref" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"note" text,
	"quantity" integer NOT NULL,
	"position" integer NOT NULL,
	"packed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"nights" integer NOT NULL,
	"climate" text NOT NULL,
	"accommodation" text NOT NULL,
	"transport" text NOT NULL,
	"activities" text[] NOT NULL,
	"laundry_available" boolean NOT NULL,
	"international" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"note" text,
	"quantity_mode" text NOT NULL,
	"quantity_value" integer NOT NULL,
	"quantity_cap" integer,
	"condition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "packing_list" ADD CONSTRAINT "packing_list_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_list_item" ADD CONSTRAINT "packing_list_item_list_id_packing_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."packing_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalogue_override_user_item_idx" ON "catalogue_override" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "packing_list_item_list_id_idx" ON "packing_list_item" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "trip_user_id_idx" ON "trip" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_item_user_id_idx" ON "user_item" USING btree ("user_id");