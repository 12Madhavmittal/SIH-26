CREATE TABLE `deliveryPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planCode` varchar(96) NOT NULL,
	`vehicleType` varchar(120) NOT NULL,
	`capacityKg` int NOT NULL,
	`plannedLoadKg` int NOT NULL,
	`baselineKm` decimal(10,2) NOT NULL,
	`optimizedKm` decimal(10,2) NOT NULL,
	`estimatedCostInr` decimal(12,2) NOT NULL,
	`estimatedEmissionsKg` decimal(10,2) NOT NULL,
	`planStatus` enum('draft','ready','in_transit','completed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveryPlans_planCode_unique` UNIQUE(`planCode`)
);
--> statement-breakpoint
CREATE TABLE `farmerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fpoId` int,
	`farmerCode` varchar(64) NOT NULL,
	`harvestCluster` varchar(160) NOT NULL,
	`verificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `farmerProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `farmerProfiles_farmerCode_unique` UNIQUE(`farmerCode`)
);
--> statement-breakpoint
CREATE TABLE `lotContributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lotId` int NOT NULL,
	`farmerId` int NOT NULL,
	`contributedKg` int NOT NULL,
	`grade` varchar(64),
	`harvestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lotContributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerOrganizationId` int,
	`listingId` int NOT NULL,
	`lotId` int,
	`quantityKg` int NOT NULL,
	`totalInr` decimal(12,2) NOT NULL,
	`buyerType` enum('consumer','bulk') NOT NULL,
	`orderStatus` enum('placed','consolidated','routed','delivered','cancelled') NOT NULL DEFAULT 'placed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizationProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int,
	`organizationType` enum('farmer','fpo','buyer','logistics') NOT NULL,
	`displayName` varchar(200) NOT NULL,
	`verificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`verificationReference` varchar(128),
	`state` varchar(100),
	`district` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizationProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produceListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fpoId` int NOT NULL,
	`crop` varchar(120) NOT NULL,
	`variety` varchar(120),
	`grade` varchar(64),
	`availableKg` int NOT NULL,
	`minOrderKg` int NOT NULL,
	`directPricePerKg` decimal(10,2) NOT NULL,
	`marketReferencePerKg` decimal(10,2),
	`conventionalPricePerKg` decimal(10,2),
	`listingStatus` enum('draft','live','reserved','sold_out') NOT NULL DEFAULT 'draft',
	`availableFrom` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `produceListings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `traceabilityLots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`fpoId` int NOT NULL,
	`lotCode` varchar(96) NOT NULL,
	`totalKg` int NOT NULL,
	`grade` varchar(64),
	`packedAt` timestamp,
	`lotStatus` enum('open','consolidated','in_transit','delivered') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `traceabilityLots_id` PRIMARY KEY(`id`),
	CONSTRAINT `traceabilityLots_lotCode_unique` UNIQUE(`lotCode`)
);
--> statement-breakpoint
CREATE INDEX `farmer_fpo_idx` ON `farmerProfiles` (`fpoId`);--> statement-breakpoint
CREATE INDEX `contribution_lot_idx` ON `lotContributions` (`lotId`);--> statement-breakpoint
CREATE INDEX `contribution_farmer_idx` ON `lotContributions` (`farmerId`);--> statement-breakpoint
CREATE INDEX `order_listing_idx` ON `marketplaceOrders` (`listingId`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `marketplaceOrders` (`orderStatus`);--> statement-breakpoint
CREATE INDEX `organization_type_idx` ON `organizationProfiles` (`organizationType`);--> statement-breakpoint
CREATE INDEX `listing_fpo_idx` ON `produceListings` (`fpoId`);--> statement-breakpoint
CREATE INDEX `listing_status_idx` ON `produceListings` (`listingStatus`);--> statement-breakpoint
CREATE INDEX `lot_listing_idx` ON `traceabilityLots` (`listingId`);--> statement-breakpoint
CREATE INDEX `lot_fpo_idx` ON `traceabilityLots` (`fpoId`);