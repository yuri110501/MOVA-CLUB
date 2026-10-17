CREATE TABLE `mova_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`csrf` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mova_documents` (
	`id` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mova_history` (
	`revision` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`actor` text,
	`name` text,
	`at` text NOT NULL,
	`action` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mova_invitations` (
	`token` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`expires` integer NOT NULL,
	`used_by` text,
	`used_at` integer,
	`nonce` text
);
--> statement-breakpoint
CREATE TABLE `mova_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
