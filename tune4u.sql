-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 06, 2020 at 10:30 AM
-- Server version: 10.4.10-MariaDB
-- PHP Version: 7.3.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tune4u`
--

-- --------------------------------------------------------

--
-- Table structure for table `city`
--

CREATE TABLE `city` (
  `id` int(11) NOT NULL,
  `citycode` varchar(25) NOT NULL DEFAULT '',
  `city` varchar(55) NOT NULL,
  `description` varchar(225) DEFAULT NULL,
  `createddate` date NOT NULL,
  `updateddate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `city`
--

INSERT INTO `city` (`id`, `citycode`, `city`, `description`, `createddate`, `updateddate`) VALUES
(1, 'YGN', 'Yangon', 'YGN', '2019-12-23', '2019-12-23'),
(2, 'MDY', 'Mandalay', 'MDY', '2019-12-26', '2019-12-26');

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `id` int(11) NOT NULL,
  `customer_code` varchar(225) NOT NULL,
  `customer_name` varchar(225) NOT NULL,
  `customer_description` varchar(225) NOT NULL,
  `township_id` int(11) NOT NULL,
  `createddate` date NOT NULL,
  `updateddate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `customer`
--

INSERT INTO `customer` (`id`, `customer_code`, `customer_name`, `customer_description`, `township_id`, `createddate`, `updateddate`) VALUES
(2, 'WP', 'Wai Phyo', 'Backend Developer', 1, '2019-12-27', '2019-12-27'),
(3, 'PP', 'Pyae Phyo', 'DSTA', 2, '2019-12-27', '2019-12-27'),
(13, 'WP', 'Wai Phyo', 'Backend Developer', 0, '2020-01-02', '2020-01-02');

-- --------------------------------------------------------

--
-- Table structure for table `township`
--

CREATE TABLE `township` (
  `id` int(11) NOT NULL,
  `townshipcode` varchar(25) NOT NULL DEFAULT '',
  `township` varchar(55) NOT NULL,
  `cityid` int(11) NOT NULL,
  `description` varchar(225) DEFAULT NULL,
  `createddate` date NOT NULL,
  `updateddate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `township`
--

INSERT INTO `township` (`id`, `townshipcode`, `township`, `cityid`, `description`, `createddate`, `updateddate`) VALUES
(1, '', 'Bahan', 1, 'BHN', '2019-12-23', '2019-12-23'),
(2, '', 'Aung Myay Tha San', 2, 'AMTS', '2019-12-25', '2019-12-27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `city`
--
ALTER TABLE `city`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_UNIQUE` (`id`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `township`
--
ALTER TABLE `township`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `city`
--
ALTER TABLE `city`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `customer`
--
ALTER TABLE `customer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `township`
--
ALTER TABLE `township`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
