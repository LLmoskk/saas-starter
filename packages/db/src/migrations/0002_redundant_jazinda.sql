PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_admin_audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text,
	`before` text,
	`after` text,
	`idempotency_key` text,
	`request_ip` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_admin_audit_event`("id", "actor_user_id", "action", "target_type", "target_id", "reason", "before", "after", "idempotency_key", "request_ip", "created_at") SELECT "id", "actor_user_id", "action", "target_type", "target_id", "reason", "before", "after", "idempotency_key", "request_ip", "created_at" FROM `admin_audit_event`;--> statement-breakpoint
DROP TABLE `admin_audit_event`;--> statement-breakpoint
ALTER TABLE `__new_admin_audit_event` RENAME TO `admin_audit_event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit_event` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_target_idx` ON `admin_audit_event` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_idempotency_idx` ON `admin_audit_event` (`idempotency_key`);