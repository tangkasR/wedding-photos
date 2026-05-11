-- Wedding Photos - Database Setup
-- Run via: node scripts/setup-db.js
-- Or manually paste this into MySQL/HeidiSQL/phpMyAdmin

CREATE DATABASE IF NOT EXISTS wedding_photos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wedding_photos;

CREATE TABLE IF NOT EXISTS `photos` (
  `id`               VARCHAR(50)    NOT NULL,
  `originalName`     VARCHAR(500)   NOT NULL,
  `storedName`       VARCHAR(500)   NOT NULL,
  `filePath`         VARCHAR(1000)  NOT NULL DEFAULT '',
  `mimeType`         VARCHAR(100)   NOT NULL,
  `fileSize`         BIGINT         NOT NULL DEFAULT 0,
  `width`            INT            NULL,
  `height`           INT            NULL,
  `checksum`         VARCHAR(64)    NOT NULL DEFAULT '',
  `uploadedAt`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `downloadCount`    INT            NOT NULL DEFAULT 0,
  `uploaderName`     VARCHAR(200)   NULL,
  `uploaderMessage`  TEXT           NULL,
  `deviceInfo`       TEXT           NULL,
  `exifData`         JSON           NULL,
  `status`           ENUM('UPLOADING','COMPLETE','FAILED') NOT NULL DEFAULT 'COMPLETE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `photos_storedName_key` (`storedName`),
  INDEX `photos_uploadedAt_idx` (`uploadedAt`),
  INDEX `photos_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
