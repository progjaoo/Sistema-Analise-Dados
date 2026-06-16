-- MySQL dump 10.13  Distrib 9.5.0, for macos15.4 (arm64)
--
-- Host: ibopebank.mysql.dbaas.com.br    Database: ibopebank
-- ------------------------------------------------------
-- Server version	5.7.32-35-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `analysis_data`
--

DROP TABLE IF EXISTS `analysis_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_data` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `analysis_type_id` bigint(20) unsigned NOT NULL,
  `import_id` bigint(20) unsigned NOT NULL,
  `row_index` int(10) unsigned NOT NULL,
  `payload_json` json NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_analysis_row` (`analysis_type_id`,`import_id`,`row_index`),
  KEY `import_id` (`import_id`),
  KEY `idx_analysis_data_lookup` (`analysis_type_id`,`import_id`),
  CONSTRAINT `analysis_data_ibfk_1` FOREIGN KEY (`analysis_type_id`) REFERENCES `analysis_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_data_ibfk_2` FOREIGN KEY (`import_id`) REFERENCES `analysis_imports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `analysis_imports`
--

DROP TABLE IF EXISTS `analysis_imports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_imports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `arquivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `arquivo_mime` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `arquivo_tamanho` bigint(20) unsigned DEFAULT NULL,
  `arquivo_caminho` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `arquivo_blob` mediumblob,
  `periodo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_importacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` bigint(20) unsigned DEFAULT NULL,
  `status` enum('PROCESSING','COMPLETED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROCESSING',
  `total_analises` int(10) unsigned NOT NULL DEFAULT '0',
  `total_registros` int(10) unsigned NOT NULL DEFAULT '0',
  `erro` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_analysis_imports_data` (`data_importacao`),
  KEY `idx_analysis_imports_status` (`status`),
  CONSTRAINT `analysis_imports_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `analysis_types`
--

DROP TABLE IF EXISTS `analysis_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `slug` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_visualizacao` enum('table','line','bar','area','pie','kpi') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'table',
  `source_sheet` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `schema_json` json NOT NULL,
  `filter_config_json` json DEFAULT NULL,
  `ordem` int(11) NOT NULL DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_analysis_types_active_order` (`ativo`,`ordem`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_events`
--

DROP TABLE IF EXISTS `email_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tipo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinatario` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('QUEUED','SENT','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `erro` text COLLATE utf8mb4_unicode_ci,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_events_created` (`criado_em`),
  KEY `idx_email_events_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `import_download_logs`
--

DROP TABLE IF EXISTS `import_download_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_download_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `import_id` bigint(20) unsigned NOT NULL,
  `usuario_id` bigint(20) unsigned DEFAULT NULL,
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `baixado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_download_logs_import` (`import_id`,`baixado_em`),
  KEY `idx_import_download_logs_user` (`usuario_id`,`baixado_em`),
  CONSTRAINT `import_download_logs_ibfk_1` FOREIGN KEY (`import_id`) REFERENCES `analysis_imports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `import_download_logs_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `import_logs`
--

DROP TABLE IF EXISTS `import_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `import_id` bigint(20) unsigned NOT NULL,
  `nivel` enum('INFO','WARNING','ERROR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INFO',
  `etapa` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `contexto_json` json DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_logs_import` (`import_id`,`criado_em`),
  CONSTRAINT `import_logs_ibfk_1` FOREIGN KEY (`import_id`) REFERENCES `analysis_imports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `user_id` (`user_id`),
  KEY `idx_password_reset_expiry` (`expires_at`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `clerk_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('ADMIN','ANALYST','VIEWER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VIEWER',
  `auth_provider` enum('LOCAL','CLERK','BOTH') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LOCAL',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `clerk_id` (`clerk_id`),
  KEY `idx_users_clerk_id` (`clerk_id`),
  KEY `idx_users_ativo` (`ativo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'ibopebank'
--
--
-- WARNING: can't read the INFORMATION_SCHEMA.libraries table. It's most probably an old server 5.7.32-35-log.
--
--
-- WARNING: can't read the INFORMATION_SCHEMA.libraries table. It's most probably an old server 5.7.32-35-log.
--
/*!50003 DROP PROCEDURE IF EXISTS `add_column_if_missing` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE' */ ;
DELIMITER ;;
CREATE DEFINER=`ibopebank`@`%` PROCEDURE `add_column_if_missing`(
  IN table_name_param VARCHAR(64),
  IN column_name_param VARCHAR(64),
  IN alter_sql_param TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_param
      AND COLUMN_NAME = column_name_param
  ) THEN
    SET @ddl = alter_sql_param;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-16 10:35:43
