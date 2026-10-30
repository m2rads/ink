CREATE TABLE "purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"checkout_session_id" text NOT NULL,
	"payment_intent_id" text,
	"plan" text NOT NULL,
	"amount" integer NOT NULL,
	"tax" integer NOT NULL,
	"currency" text NOT NULL,
	"country" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refunded_at" timestamp with time zone,
	CONSTRAINT "purchase_checkoutSessionId_unique" UNIQUE("checkout_session_id"),
	CONSTRAINT "purchase_paymentIntentId_unique" UNIQUE("payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_customer" (
	"user_id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customer_customerId_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_customer" ADD CONSTRAINT "stripe_customer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_user_id_index" ON "purchase" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_purchase_id_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entitlement_purchase_id_index" ON "entitlement" USING btree ("purchase_id");