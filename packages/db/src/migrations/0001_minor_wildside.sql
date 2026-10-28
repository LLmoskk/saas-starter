CREATE TABLE `credit_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`reference_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `credit_entry_user_idx` ON `credit_entry` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credit_entry_reason_ref_idx` ON `credit_entry` (`reason`,`reference_id`);--> statement-breakpoint
CREATE TABLE `generation_job` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`flow_id` text NOT NULL,
	`input` text NOT NULL,
	`status` text NOT NULL,
	`credit_cost` integer NOT NULL,
	`upstream_job_id` text,
	`output_key` text,
	`output_mime` text,
	`actual_cost` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generation_job_user_idx` ON `generation_job` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `generation_job_status_idx` ON `generation_job` (`status`);