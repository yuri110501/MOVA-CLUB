CREATE TABLE `mova_drafts` (
	`id` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`revision` integer NOT NULL,
	`base_revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
