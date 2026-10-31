CREATE TABLE `webhook_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`updated_at` integer NOT NULL
);
