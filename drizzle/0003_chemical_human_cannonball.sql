DROP INDEX `account_issuer_accountId_uidx`;--> statement-breakpoint
CREATE INDEX `account_providerId_accountId_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `issuer`;