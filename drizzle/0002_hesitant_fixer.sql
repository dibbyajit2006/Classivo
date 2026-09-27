CREATE TABLE `class_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`classId` varchar(64) NOT NULL,
	`subjectId` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `class_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_assignment_unique` UNIQUE(`teacherId`,`classId`,`subjectId`)
);
--> statement-breakpoint
ALTER TABLE `students` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `teachers` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `attendance` ADD `attendanceDate` varchar(10) DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `name` varchar(160) DEFAULT 'Student' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `teachers` ADD `name` varchar(160) DEFAULT 'Teacher' NOT NULL;--> statement-breakpoint
ALTER TABLE `teachers` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_userId_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_userId_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_email_unique` UNIQUE(`email`);