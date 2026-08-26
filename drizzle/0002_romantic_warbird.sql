CREATE TABLE `impactSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` varchar(96) NOT NULL,
	`directTradeValueInr` decimal(12,2) NOT NULL,
	`buyerSavingsInr` decimal(12,2) NOT NULL,
	`farmerIncomeUpliftPercent` decimal(6,2) NOT NULL,
	`wasteAvoidedKg` decimal(10,2) NOT NULL,
	`routeKmAvoided` decimal(10,2) NOT NULL,
	`emissionsAvoidedKg` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `impactSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','fpo','logistics') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `impact_scope_idx` ON `impactSnapshots` (`scope`);