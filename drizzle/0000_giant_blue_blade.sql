CREATE TABLE `quorum_comfort_responses` (
	`round_id` text NOT NULL,
	`group_id` text NOT NULL,
	`option_id` text NOT NULL,
	`member_id` text NOT NULL,
	`value` text NOT NULL,
	`option_version` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`round_id`, `option_id`, `member_id`)
);
--> statement-breakpoint
CREATE INDEX `quorum_comfort_round_idx` ON `quorum_comfort_responses` (`round_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `quorum_favorite_votes` (
	`round_id` text NOT NULL,
	`group_id` text NOT NULL,
	`member_id` text NOT NULL,
	`option_id` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`round_id`, `member_id`)
);
--> statement-breakpoint
CREATE INDEX `quorum_favorites_round_idx` ON `quorum_favorite_votes` (`round_id`);--> statement-breakpoint
CREATE TABLE `quorum_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_code` text NOT NULL,
	`name` text NOT NULL,
	`vibe_index` integer,
	`phase` text DEFAULT 'collecting' NOT NULL,
	`creator_member_id` text,
	`current_round_id` text,
	`selected_option_id` text,
	`confirmation_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quorum_groups_invite_code_idx` ON `quorum_groups` (`invite_code`);--> statement-breakpoint
CREATE TABLE `quorum_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`session_id` text NOT NULL,
	`character_id` text NOT NULL,
	`nickname` text NOT NULL,
	`is_creator` integer DEFAULT false NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quorum_members_session_group_idx` ON `quorum_members` (`session_id`,`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `quorum_members_character_group_idx` ON `quorum_members` (`group_id`,`character_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `quorum_members_nickname_group_idx` ON `quorum_members` (`group_id`,`nickname`);--> statement-breakpoint
CREATE INDEX `quorum_members_group_idx` ON `quorum_members` (`group_id`);--> statement-breakpoint
CREATE TABLE `quorum_options` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`contributor_member_id` text NOT NULL,
	`source_url` text NOT NULL,
	`provider` text NOT NULL,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`image_url` text,
	`description` text,
	`official_embed_html` text,
	`source_guest_count` integer,
	`category` text NOT NULL,
	`dates` text NOT NULL,
	`all_in_total_cents` integer NOT NULL,
	`participant_count` integer NOT NULL,
	`base_price_cents` integer,
	`fees_cents` integer,
	`taxes_cents` integer,
	`checked_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quorum_options_group_idx` ON `quorum_options` (`group_id`,`archived`);--> statement-breakpoint
CREATE TABLE `quorum_payment_authorizations` (
	`group_id` text NOT NULL,
	`member_id` text NOT NULL,
	`option_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_at` text,
	PRIMARY KEY(`group_id`, `member_id`)
);
--> statement-breakpoint
CREATE INDEX `quorum_payments_group_idx` ON `quorum_payment_authorizations` (`group_id`,`status`);--> statement-breakpoint
CREATE TABLE `quorum_review_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `quorum_rounds_group_idx` ON `quorum_review_rounds` (`group_id`);