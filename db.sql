
--
-- Database: `tune4u`
--

-- --------------------------------------------------------

--
-- Table structure for table `city`
--

CREATE TABLE IF NOT EXISTS `city` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`citycode` varchar(25) NOT NULL DEFAULT '',
	`city` varchar(55) NOT NULL,
	`description` varchar(225) DEFAULT NULL,
	`createddate` date NOT NULL,
	`updateddate` date NOT NULL,
	PRIMARY KEY (`id`),
	UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `township`
--

CREATE TABLE IF NOT EXISTS `township` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`townshipcode` varchar(25) NOT NULL DEFAULT '',
	`township` varchar(55) NOT NULL,
	`cityid` int(11) NOT NULL,
	`description` varchar(225) DEFAULT NULL,
	`createddate` date NOT NULL,
	`updateddate` date NOT NULL,
	PRIMARY KEY (`id`),
	UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------