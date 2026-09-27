CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`classId` varchar(64) NOT NULL,
	`subject` varchar(160) NOT NULL,
	`markedAt` bigint NOT NULL,
	`status` enum('present','absent') NOT NULL DEFAULT 'present',
	`confidence` double,
	`reviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `camera_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`studentId` int,
	`evidenceUrl` text,
	`location` varchar(180),
	`timestamp` bigint NOT NULL,
	`confidence` double,
	`reviewStatus` enum('pending','acknowledged','dismissed') NOT NULL DEFAULT 'pending',
	CONSTRAINT `camera_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `class_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`classId` varchar(64) NOT NULL,
	`subjectId` varchar(120) NOT NULL,
	`topic` varchar(220) NOT NULL,
	`content` text,
	`fileUrl` text,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `class_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`teacherId` int,
	`category` varchar(80) NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text NOT NULL,
	`location` varchar(180) NOT NULL,
	`status` enum('submitted','acknowledged','in_progress','resolved','closed') NOT NULL DEFAULT 'submitted',
	`response` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`eventId` int,
	`title` varchar(220) NOT NULL,
	`message` text NOT NULL,
	`priority` enum('low','normal','high') NOT NULL DEFAULT 'normal',
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rollNumber` varchar(40) NOT NULL,
	`classId` varchar(64) NOT NULL,
	`department` varchar(120) NOT NULL,
	`faceImageKey` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_rollNumber_unique` UNIQUE(`rollNumber`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('teacher','admin') NOT NULL DEFAULT 'teacher',
	`classId` varchar(64),
	`department` varchar(120),
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`)
);
