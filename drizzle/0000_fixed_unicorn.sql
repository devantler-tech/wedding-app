CREATE TABLE "admin_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guest_pairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(8) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "guest_pairs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_pair_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"attending" boolean,
	"dietary_notes" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "room_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_pair_id" integer NOT NULL,
	"requested" boolean DEFAULT false NOT NULL,
	"nights" integer DEFAULT 1,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "room_bookings_guest_pair_id_unique" UNIQUE("guest_pair_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"guest_pair_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_guest_pair_id_guest_pairs_id_fk" FOREIGN KEY ("guest_pair_id") REFERENCES "public"."guest_pairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_guest_pair_id_guest_pairs_id_fk" FOREIGN KEY ("guest_pair_id") REFERENCES "public"."guest_pairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_guest_pair_id_guest_pairs_id_fk" FOREIGN KEY ("guest_pair_id") REFERENCES "public"."guest_pairs"("id") ON DELETE no action ON UPDATE no action;