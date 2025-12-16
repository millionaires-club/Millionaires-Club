
import { Member, YearlyContribution } from './types';

// Date/Time Formatting Utilities
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Helper to generate IDs MC-1001 to MC-1210
const generateId = (num: number) => `MC-${(1000 + num).toString()}`;

// Raw Data Structure: [ID Suffix, Name, Nickname, Status, Email, Phone, Total Contribution, Join Date]
const RAW_MEMBERS_DATA: (string | number)[][] = [
  [1001, "Nang Ngaih Thang", "Nangpi", "Active", "nang@example.com", "-", 2840, "2013-12-25"],
  [1002, "Cin Lam Tuang", "Pu Tuang", "Active", "cin@example.com", "-", 2820, "2013-12-25"],
  [1003, "Thang Za Tuang", "John Tuang", "Active", "thang@example.com", "-", 2760, "2014-08-04"],
  [1004, "Nang Muan Lian", "Sia Chit", "Active", "nang@example.com", "-", 2800, "2014-08-17"],
  [1005, "Thang Khup Tuang", "Khup Tuang", "Active", "thang@example.com", "-", 2460, "2015-09-20"],
  [1006, "Kham Mung Piang", "Piangno", "Active", "kham@example.com", "-", 2460, "2015-09-20"],
  [1007, "Mang Sian Lang", "Mangpi(Ford)", "Active", "mang@example.com", "-", 2460, "2015-09-20"],
  [1008, "Kham Lian Mung", "K.L. Mungpu", "Inactive", "kham@example.com", "-", 0, "2015-10-12"],
  [1009, "Kai Sawm Piang", "Sangpu", "Active", "kai@example.com", "-", 2440, "2015-10-12"],
  [1010, "Lian Zo Tuang", "Kham Biak", "Active", "lian@example.com", "-", 480, "2024-02-10"],
  [1011, "Awi Don Cing", "Cingkhek", "Active", "awi@example.com", "-", 2440, "2015-10-12"],
  [1012, "Gin Lam Mung", "Mungno", "Active", "gin@example.com", "-", 2420, "2015-11-15"],
  [1013, "Go Lian Kam", "U Kam", "Inactive", "go@example.com", "-", 0, "2015-11-30"],
  [1014, "Langh Za Tung", "Langh Tung", "Active", "langh@example.com", "-", 2400, "2015-12-06"],
  [1015, "Niang Sian Huai", "Huaino", "Active", "niang@example.com", "-", 2380, "2016-01-03"],
  [1016, "Thang Khan Langh", "U Khan Langh", "Inactive", "thang@example.com", "-", 0, "2016-01-01"],
  [1017, "Lian Suan Khup", "Khaiboih", "Active", "lian@example.com", "-", 2280, "2016-01-10"],
  [1018, "John Cin Suan Khup", "John Khup", "Inactive", "john@example.com", "-", 0, "2016-01-10"],
  [1019, "Pau Sian Sum", "Ko Sumpi", "Active", "pau@example.com", "-", 500, "2024-01-14"],
  [1020, "Vung Siam Mawi", "Mawinu", "Inactive", "vung@example.com", "-", 0, "2016-01-31"],
  [1021, "Cing Suan Meng", "Mengboih", "Active", "cing@example.com", "-", 2340, "2016-02-07"],
  [1022, "Mang Suan Kim", "Mangpi", "Inactive", "mang@example.com", "-", 0, "2016-02-14"],
  [1023, "Suan Sian Sang", "Sangpi", "Inactive", "suan@example.com", "-", 0, "2016-04-22"],
  [1024, "Lal Thang Lian", "Lianpi", "Active", "lal@example.com", "-", 2200, "2016-10-02"],
  [1025, "Hau Ngaih Lian", "Haunu", "Inactive", "hau@example.com", "-", 0, "2016-12-13"],
  [1026, "Thang Gin Piang", "Piangpu", "Inactive", "thang@example.com", "-", 0, "2017-01-02"],
  [1027, "Hau Suan Khai", "Hau Khai", "Active", "hau@example.com", "-", 2140, "2017-01-02"],
  [1028, "Nem Sian Uap", "Nu Uappi", "Active", "nem@example.com", "-", 2120, "2017-01-02"],
  [1029, "Nang Do Pau", "Pa Khual", "Active", "nang@example.com", "-", 2140, "2017-01-02"],
  [1030, "Tun Lam Khai", "Pa Khaibawk", "Active", "dimlo.khai@gmail.com", "(918) 991-2599", 1580, "2017-01-02"],
  [1031, "Mang Sian Sang", "Piangpi", "Inactive", "mang@example.com", "-", 0, "2017-01-03"],
  [1032, "Dim Ngaih Lian", "Nu Nuampi", "Active", "dim@example.com", "-", 2160, "2017-01-03"],
  [1033, "Cing Vum Dim", "Vumnu", "Active", "cing@example.com", "-", 2100, "2017-01-03"],
  [1034, "Dim Khan Lian", "Nu Lian", "Inactive", "dim@example.com", "-", 0, "2017-01-03"],
  [1035, "Niang Tawi Mang", "Niangsen", "Inactive", "niang@example.com", "-", 0, "2017-01-03"],
  [1036, "Khup Sai Sum", "Khai Khup", "Inactive", "khup@example.com", "-", 0, "2017-01-04"],
  [1037, "Lal Muan Sang", "Maa Sang", "Inactive", "lal@example.com", "-", 0, "2017-01-07"],
  [1038, "Kaam Gin Tung", "Tungpi", "Active", "kaam@example.com", "-", 2160, "2017-01-08"],
  [1039, "Hau Za Kam", "Pa Kam", "Active", "hau@example.com", "-", 2140, "2017-01-08"],
  [1040, "Cin Lamh Kim", "Khawl Hung", "Active", "cin@example.com", "-", 2140, "2017-01-08"],
  [1041, "Cing Sian Nem", "Nu Nemno", "Inactive", "cing@example.com", "-", 0, "2017-01-08"],
  [1042, "Langh Khai Khai", "Pa Langh Khai", "Inactive", "langh@example.com", "-", 0, "2017-01-08"],
  [1043, "Ciin Sian Nem", "Nu Nembawi", "Inactive", "ciin@example.com", "-", 0, "2017-01-17"],
  [1044, "Dim Khan Lian", "Nu Lian", "Inactive", "dim@example.com", "-", 0, "2017-03-01"],
  [1045, "Niang Tawi Mang", "Niangsen", "Inactive", "niang@example.com", "-", 0, "2017-03-01"],
  [1046, "En Khan Zam", "Pa Zam", "Active", "en@example.com", "-", 2140, "2017-01-18"],
  [1047, "Niang Ngaih Man", "Nu Mansen", "Inactive", "niang@example.com", "-", 0, "2017-01-18"],
  [1048, "Ciang Ngaih Vung", "U Vungpi", "Inactive", "ciang@example.com", "-", 0, "2017-01-18"],
  [1049, "Neng Suan Dal", "Pa Dalkhek", "Active", "neng@example.com", "-", 2120, "2017-02-05"],
  [1050, "Gin Suan Khai", "Khaipyi", "Inactive", "gin@example.com", "-", 0, "2017-02-05"],
  [1051, "Hau Sawm Mang", "Pa Dai Suan", "Active", "hau@example.com", "-", 2120, "2017-02-19"],
  [1052, "Samuel Sang", "Pa Sang", "Inactive", "samuel@example.com", "-", 0, "2017-02-25"],
  [1053, "Pau Sian Taang", "Taangpu", "Active", "pau@example.com", "-", 2120, "2017-03-13"],
  [1054, "Cin Suan Mang", "Sia Mangpi", "Active", "cin@example.com", "-", 2060, "2017-03-12"],
  [1055, "Zo Ngaih Lun", "Nu Lun", "Active", "zo@example.com", "-", 460, "2024-01-06"],
  [1056, "Dim L. M. Hatzaw", "Nu Ciin", "Inactive", "dim@example.com", "-", 0, "2017-03-12"],
  [1057, "Mung Sian Tung", "Pa Tuang", "Inactive", "mung@example.com", "-", 0, "2017-03-12"],
  [1058, "Thangcinlal Khuptong", "Pa Lal", "Inactive", "thangcinlal@example.com", "-", 0, "2017-04-24"],
  [1059, "Lydia Kim Khuptong", "Nu Kim", "Inactive", "lydia@example.com", "-", 0, "2017-04-24"],
  [1060, "Din Ro Puia", "Khuppi", "Active", "din@example.com", "-", 2070, "2017-05-05"],
  [1061, "Mang Kim Sing", "Pa Kim Sing", "Active", "mang@example.com", "-", 2040, "2017-06-11"],
  [1062, "Taang Thang Kop", "Pa Thang Kop", "Inactive", "taang@example.com", "-", 0, "2017-06-11"],
  [1063, "Dal Mun Lian", "Mun Lian", "Inactive", "dal@example.com", "-", 0, "2017-06-11"],
  [1064, "Go Sian Khai", "Go Khai", "Inactive", "go@example.com", "-", 0, "2017-06-11"],
  [1065, "Pau Sian", "Pa Tuangpu", "Inactive", "pau@example.com", "-", 0, "2017-08-13"],
  [1066, "Go Khan Dal", "Pa Tawng", "Active", "go@example.com", "-", 1940, "2017-11-04"],
  [1067, "Ning Sawm Cing", "Nu Sawm Cing", "Active", "ning@example.com", "-", 1940, "2017-11-04"],
  [1068, "Zam Sian Khai", "Khaipiz", "Active", "zam@example.com", "-", 1920, "2017-12-10"],
  [1069, "Thang Sian Tuang", "Khaipi", "Inactive", "thang@example.com", "-", 0, "2017-12-17"],
  [1070, "Mangpi D. Jasuan", "Mangpi", "Active", "mangpi@example.com", "-", 1940, "2017-12-17"],
  [1071, "Rosemary N.K. Nuam", "U Nuam", "Inactive", "rosemary@example.com", "-", 0, "2017-12-17"],
  [1072, "Do Khan Thang", "Pa Do Thang", "Active", "do@example.com", "-", 640, "2023-04-23"],
  [1073, "Cing Khan Nuam", "Nu Nuam", "Active", "cing@example.com", "-", 640, "2023-04-23"],
  [1074, "Dong Sian Hung", "Hung Van", "Active", "dong@example.com", "-", 640, "2023-04-23"],
  [1075, "Niang Huaih Nuam", "Huaihpi", "Inactive", "niang@example.com", "-", 0, "2018-01-06"],
  [1076, "Suan Lian Mung", "Sia Mung", "Inactive", "suan@example.com", "-", 0, "2018-07-01"],
  [1077, "Ngin Za Sum", "Pa Sum", "Active", "ngin@example.com", "-", 1900, "2018-01-08"],
  [1078, "Ciang Do Pau", "Nu Pau", "Inactive", "ciang@example.com", "-", 0, "2018-01-08"],
  [1079, "Reserved Slot", "-", "Inactive", "inactive@example.com", "-", 0, "2018-01-01"],
  [1080, "Khup Khan Khai", "Pa Khup Khai", "Active", "khup@example.com", "-", 1900, "2018-01-13"],
  [1081, "Cing Ngaih Khai", "Nayzar Ngaih", "Active", "cing@example.com", "-", 1900, "2018-01-13"],
  [1082, "Go Hen Thang", "Pa Thang", "Inactive", "go@example.com", "-", 0, "2018-01-13"],
  [1083, "Vung Lam Niang", "Nu Niang", "Inactive", "vung@example.com", "-", 0, "2018-01-13"],
  [1084, "Pau Suan Khai", "Khaino", "Inactive", "pau@example.com", "-", 0, "2018-01-13"],
  [1085, "Vung Khawl Lun", "Nu Lun", "Inactive", "vung@example.com", "-", 0, "2018-01-13"],
  [1086, "Nang Suan Pau", "Pa Nang Pau", "Inactive", "nang@example.com", "-", 0, "2018-01-13"],
  [1087, "Hero Hau Lian Mung", "Pa Hero Mung", "Inactive", "hero@example.com", "-", 0, "2018-01-14"],
  [1088, "Dim Tawi Cing", "Nu Dim Tawi", "Inactive", "dim@example.com", "-", 0, "2018-01-14"],
  [1089, "Lian Tengh Khai", "Tengh Khai", "Inactive", "lian@example.com", "-", 0, "2018-01-14"],
  [1090, "Dal Suan Mung", "Pa Dal Mung", "Inactive", "dal@example.com", "-", 0, "2018-01-14"],
  [1091, "Pau Khaw Suan", "Pa Hang Pian", "Inactive", "pau@example.com", "-", 0, "2018-01-14"],
  [1092, "Lian Khup Mang", "Khup Mang", "Inactive", "lian@example.com", "-", 0, "2018-01-14"],
  [1093, "Kap Cin Thang", "Pa Kap Cin", "Active", "kap@example.com", "-", 1900, "2018-01-14"],
  [1094, "Thang Go Lal Sum", "Pa Sumpu", "Active", "thang@example.com", "-", 1900, "2018-01-14"],
  [1095, "Mang Nu", "Cingboih", "Inactive", "mang@example.com", "-", 0, "2018-01-16"],
  [1096, "Pau Neih Cing", "Nu Sian", "Active", "pau@example.com", "-", 220, "2024-10-20"],
  [1097, "Cing En Thang", "Nu Thang", "Active", "cing@example.com", "-", 1900, "2018-01-16"],
  [1098, "Ciin Khan Dim", "Nu Ciinneu", "Active", "ciin@example.com", "-", 1920, "2018-01-20"],
  [1099, "Thang C.K. Tangpua", "Sia Thangpi", "Inactive", "thang@example.com", "-", 0, "2018-01-21"],
  [1100, "Vung Zam Cing", "S/m Cing", "Inactive", "vung@example.com", "-", 0, "2018-01-21"],
  [1101, "Khen Lian", "Lwis Khai Pu", "Inactive", "khen@example.com", "-", 0, "2018-04-02"],
  [1102, "Tuang Pi", "Tuangpi", "Inactive", "tuang@example.com", "-", 0, "2018-04-02"],
  [1103, "Pau Neih Lian", "San Kimkim", "Active", "pau@example.com", "-", 1900, "2018-02-17"],
  [1104, "Min Thei Lo", "-", "Inactive", "min@example.com", "-", 0, "2018-02-17"],
  [1105, "Tuang Pu", "-", "Inactive", "tuangpu91@gmail.com", "(918) 565-6453", 0, "2018-02-18"],
  [1106, "Salem Thar", "BT Tharte", "Inactive", "salem@example.com", "-", 0, "2018-02-18"],
  [1107, "Mang Do", "Jv Dong San Lian", "Inactive", "mang@example.com", "-", 0, "2018-02-18"],
  [1108, "Nang Lian Mang", "Lianta", "Active", "nang@example.com", "-", 1880, "2018-02-18"],
  [1109, "Dim Lun Nuam", "Christina Rem Rem", "Active", "dim@example.com", "-", 1880, "2018-02-18"],
  [1110, "Thang Deih Pau", "MB Pau", "Active", "thang@example.com", "-", 1880, "2018-02-18"],
  [1111, "Ning Nuam Cing", "Cherry Nuam", "Active", "ning@example.com", "-", 1880, "2018-02-18"],
  [1112, "Khin Maung Si", "Khin Maung Si", "Active", "khin@example.com", "-", 1860, "2018-02-24"],
  [1113, "Khin Khin Moe", "Khin Moe", "Active", "khin@example.com", "-", 1870, "2018-02-24"],
  [1114, "Suan Thawn", "Thawthawn", "Active", "suan@example.com", "-", 1880, "2018-02-25"],
  [1115, "Om Lo", "-", "Inactive", "om@example.com", "-", 0, "2018-02-25"],
  [1116, "Dal Lian Tuang", "Dl Tuang", "Inactive", "dal@example.com", "-", 0, "2018-04-14"],
  [1117, "Deih Cing", "Deih Cing", "Inactive", "deih@example.com", "-", 0, "2018-04-14"],
  [1118, "Thawng Hau", "Munpi", "Inactive", "thawng@example.com", "-", 0, "2018-04-14"],
  [1119, "Ciin San Lun", "Terry Cisa", "Inactive", "ciin@example.com", "-", 0, "2018-04-29"],
  [1120, "Khup Sian Sang", "Khup Sang", "Inactive", "khup@example.com", "-", 0, "2018-04-29"],
  [1121, "Lian Suan Tung", "-", "Inactive", "lian@example.com", "-", 0, "2018-04-29"],
  [1122, "Za Cin Thawng", "-", "Inactive", "za@example.com", "-", 0, "2018-04-29"],
  [1123, "Ngo Sian Thang", "Pa Thang", "Active", "ngo@example.com", "-", 1820, "2018-06-24"],
  [1124, "Suansian Khanmung", "U Mung", "Active", "suansian@example.com", "-", 1820, "2018-06-24"],
  [1125, "Lian Khaw Cin Thang", "Thang Pi", "Inactive", "lian@example.com", "-", 0, "2018-07-22"],
  [1126, "Thang Gin Sang", "Sang Pii", "Inactive", "thang@example.com", "-", 0, "2018-07-22"],
  [1127, "Pau Khan Tuang", "Dozo Tuang", "Inactive", "pau@example.com", "-", 0, "2018-08-11"],
  [1128, "Zam Lal Niang", "Zam Niang", "Inactive", "zam@example.com", "-", 0, "2018-08-12"],
  [1129, "Cing Lam Ciang", "Jam Ciang", "Active", "cing@example.com", "-", 1780, "2018-10-14"],
  [1130, "Mang Go Lian", "Mang Lian", "Active", "mang@example.com", "-", 1780, "2018-10-14"],
  [1131, "Kam Sian Muang", "Kammuang Guite", "Inactive", "kam@example.com", "-", 0, "2018-10-14"],
  [1132, "Tracy Tennel", "-", "Inactive", "tracy@example.com", "-", 0, "2018-10-20"],
  [1133, "Abigail Tombing", "Abigail Tombing", "Inactive", "abigail@example.com", "-", 0, "2018-10-20"],
  [1134, "Zen Sian Lun", "Esther", "Active", "zen@example.com", "-", 1680, "2018-11-03"],
  [1135, "Andrewkam Sianmung Naulak", "Mungkung", "Active", "andrewkam@example.com", "-", 1700, "2018-11-18"],
  [1136, "Suan Mang", "Suan Mang Zomi", "Active", "suan@example.com", "-", 1720, "2018-11-18"],
  [1137, "Man Khawm Cing", "Nu Ciin", "Active", "man@example.com", "-", 1680, "2018-12-02"],
  [1138, "Zam Mang Naulak", "Pa Zam Mang", "Inactive", "zam@example.com", "-", 0, "2018-12-23"],
  [1139, "Cing Ngaih Lam Mang", "S/m Nuam", "Inactive", "cing@example.com", "-", 0, "2018-12-23"],
  [1140, "Suan Lam Mang", "Pa Mangsan", "Active", "suan@example.com", "-", 1680, "2018-12-25"],
  [1141, "Thang Khen Lian", "Khen Lian", "Inactive", "thang@example.com", "-", 0, "2019-05-01"],
  [1142, "Lian Sian Kiim", "Lian Kiim", "Inactive", "lian@example.com", "-", 0, "2019-05-01"],
  [1143, "Cin Thawn Tuang", "Mang Nst", "Inactive", "cin@example.com", "-", 0, "2019-05-01"],
  [1144, "Cing Sian Huai", "Nu Huaikok", "Active", "cing@example.com", "-", 1660, "2019-01-12"],
  [1145, "Ning San Dim", "Nu Santawng", "Inactive", "ning@example.com", "-", 0, "2019-01-20"],
  [1146, "Nang Suan Mung", "Mungno", "Inactive", "nang@example.com", "-", 0, "2019-01-20"],
  [1147, "Gin Suan Lal", "Muan Thang", "Inactive", "gin@example.com", "-", 0, "2019-01-26"],
  [1148, "Sing Do Tuang", "Pa Tuangpi", "Inactive", "sing@example.com", "-", 0, "2019-01-27"],
  [1149, "Cing Deih Tawi", "Tawinu", "Inactive", "cing@example.com", "-", 0, "2019-01-27"],
  [1150, "Nan Kaser Paw", "Mah Susan", "Inactive", "nan@example.com", "-", 0, "2019-01-27"],
  [1151, "Tuang SuanLian Gualnam", "Pa Lianbawi", "Active", "tuang@example.com", "-", 1640, "2019-02-16"],
  [1152, "Gin Muan Tuang", "Tuangpu", "Inactive", "gin@example.com", "-", 0, "2019-07-21"],
  [1153, "Cing San Lian", "San Lian", "Inactive", "cing@example.com", "-", 0, "2019-07-21"],
  [1154, "Zam Kim Khai", "Khaipu", "Active", "zam@example.com", "-", 1540, "2019-07-21"],
  [1155, "Khamkhan Suan Tgzomi", "Pa Suanpu", "Active", "khamkhan@example.com", "-", 1080, "2019-07-21"],
  [1156, "Manlawh Tgzomi", "Nu Manlawh", "Active", "manlawh@example.com", "-", 1080, "2019-07-21"],
  [1157, "Lian Khan Thang", "Pa Sum", "Active", "lian@example.com", "-", 1520, "2019-08-04"],
  [1158, "Niang Khan Dim", "Nu Dim", "Active", "niang@example.com", "-", 1500, "2019-09-01"],
  [1159, "Cing NeihNiang Sing", "Nu Naanu", "Active", "cing@example.com", "-", 1500, "2019-09-03"],
  [1160, "Tu Ja", "-", "Active", "tu@example.com", "-", 1500, "2019-09-21"],
  [1161, "Nang Sar", "-", "Active", "nang@example.com", "-", 1500, "2019-09-21"],
  [1162, "Kam Kim Mang", "-", "Inactive", "kam@example.com", "-", 0, "2019-10-23"],
  [1163, "Thang Khan Hau", "Pa Nang Pau", "Inactive", "thanghau402@gmail.com", "(918) 568-8567", 0, "2019-11-28"],
  [1164, "Niang Pi", "Niang Pi", "Inactive", "thanghau402@gmail.com", "(918) 404-3366", 0, "2019-11-28"],
  [1165, "Dal Za Khup", "Pa Dal Khup", "Active", "dal@example.com", "-", 1420, "2020-01-19"],
  [1166, "Kham Khan Khual", "Pa Khual", "Inactive", "kham@example.com", "-", 0, "2020-01-19"],
  [1167, "Pau Sian Khai", "U Muan Thang", "Inactive", "pau@example.com", "-", 0, "2020-02-02"],
  [1168, "Thang Biak Khai", "Tg. Biak Khai", "Active", "thang@example.com", "-", 1400, "2020-02-02"],
  [1169, "Kap Sian Dong", "Dongpi", "Inactive", "kap@example.com", "-", 0, "2020-02-02"],
  [1170, "Sing Deih Kap", "Singpu", "Active", "sing@example.com", "-", 1400, "2020-02-02"],
  [1171, "Kim Vungzam Hatzaw", "Kimkim", "Inactive", "kim@example.com", "-", 0, "2020-05-02"],
  [1172, "Zam Ngaih Lian", "Zambawi", "Inactive", "zam@example.com", "-", 0, "2020-05-02"],
  [1173, "Nuam Sian Huai", "Ruth Huaino", "Inactive", "nuam@example.com", "-", 0, "2020-05-17"],
  [1174, "Cing Hau", "Nu Hau", "Inactive", "cing@example.com", "-", 0, "2020-05-17"],
  [1175, "Dal Za Khai", "Sia Genpu", "Inactive", "dal@example.com", "-", 0, "2020-05-17"],
  [1176, "Siam Khaute", "Siamsian Khaute", "Inactive", "khsiampu@gmail.com", "(515) 988-5064", 0, "2020-08-23"],
  [1177, "Hanah L Mawi", "Zote", "Inactive", "niangremzo@gmail.com", "(918) 706-8228", 0, "2020-08-23"],
  [1178, "Suan Khan Khup", "Khuppi", "Active", "khuppib@gmail.com", "(918) 986-5575", 1360, "2020-11-22"],
  [1179, "Hau Mang", "Aungthuya", "Active", "aungthusuantak@gmail.com", "(918) 704-3786", 1180, "2021-01-10"],
  [1180, "Cing Hau Lun", "-", "Inactive", "cing85@gmail.com", "(240) 484-6857", 0, "2021-02-02"],
  [1181, "Awi Lam Ciin", "Mb EeNga", "Active", "ngek85@gmail.com", "(918) 409-7532", 1180, "2021-02-27"],
  [1182, "Kai Za Dim", "Nu Dim", "Active", "kzd381@gmail.com", "(954) 812-8156", 1160, "2021-02-28"],
  [1183, "Thang Khen Tuang", "Tuangneu", "Active", "thangtuang2024@gmail.com", "(918) 282-5120", 200, "2025-02-02"],
  [1184, "Peter Thangpi", "Suan Khan Thang", "Active", "mangtak21@gmail.com", "(206) 886-1255", 1060, "2021-07-18"],
  [1185, "Gin Don Lian", "Pau Khet Khai", "Active", "ginlian46@gmail.com", "(539) 367-8716", 1000, "2021-10-05"],
  [1186, "Luan Khan Cing", "Zuunkopnu", "Active", "zuunkopnu@gmail.com", "(704) 248-1201", 900, "2022-03-12"],
  [1187, "Kap Lian", "Nang Sian Hau", "Active", "zuunkopnu@gmail.com", "(704) 248-1201", 900, "2022-03-12"],
  [1188, "Soe Naing Oo", "Uncle Soe", "Active", "soenaingoo2008@gmail.com", "(331) 218-8764", 900, "2022-03-19"],
  [1189, "Nem Suan Man", "Nu Manno", "Active", "nsmanno@gmail.com", "(918) 928-1947", 740, "2022-11-30"],
  [1190, "Niang San Kim Buansing", "Kimpi", "Active", "estherkimpi@gmail.com", "(918) 851-5815", 700, "2023-01-21"],
  [1191, "Man Bawi", "-", "Active", "siannu29@gmail.com", "(918) 932-4274", 380, "2024-05-09"],
  [1192, "Cing Sian Lun", "-", "Active", "sanlwinlun@gmail.com", "(585) 465-7637", 380, "2024-05-14"],
  [1193, "Ko Thet", "-", "Active", "sanlwinlun@gmail.com", "(539) 235-7899", 380, "2024-05-14"],
  [1194, "Kai Suan Pau", "Paupi", "Active", "paupyi1990@gmail.com", "(918) 619-2449", 320, "2024-08-09"],
  [1195, "Vung Sum Niang", "-", "Active", "paupyi1990@gmail.com", "(214) 710-8966", 320, "2024-08-09"],
  [1196, "Man Lun Mang", "-", "Active", "masua01@gmail.com", "(918) 951-2576", 320, "2024-08-09"],
  [1197, "Niang Sian Dim", "Dimdim", "Active", "niang.dim45@gmail.com", "(918) 884-4987", 260, "2024-11-03"],
  [1198, "Ning Sian Siam", "Siamnu", "Active", "belleame.siam@gmail.com", "(918) 991-8192", 260, "2024-11-03"],
  [1199, "Leng Tong Hoih", "Cecilia", "Active", "cecilialengtonghoih@gmail.com", "(352) 317-8315", 260, "2024-11-17"],
  [1200, "Anthony Aye Lwin", "-", "Active", "anthony@example.com", "(352) 317-8315", 260, "2024-11-17"],
  [1201, "Nem Sian Dim", "Dimboih", "Active", "nem@example.com", "-", 260, "2024-11-17"],
  [1202, "Paukhannang Ralte", "Sia Nangno", "Active", "philipnangno@gmail.com", "(918) 851-5130", 240, "2024-12-15"],
  [1203, "Lami Lam Tung", "Siama Lam", "Active", "lami@example.com", "-", 240, "2024-12-15"],
  [1204, "Awi Huai Nuam", "Nuamboih", "Active", "awinuamboih@gmail.com", "(918) 398-1643", 220, "2025-01-28"],
  [1205, "Zaw Min Soe", "-", "Active", "zawminsoe.soe@gmail.com", "(918) 398-1762", 220, "2025-01-28"],
  [1206, "Huai Huai", "-", "Active", "thangtuang2024@gmail.com", "(918) 282-5120", 200, "2025-02-02"],
  [1207, "Johnthang Lian Buansing", "-", "Active", "jtun53@gmail.com", "(918) 851-8127", 200, "2025-02-09"],
  [1208, "Langh Sian Hong", "Sianno", "Active", "17sianno@gmail.com", "(918) 825-8985", 200, "2025-02-26"],
  [1209, "Pau Go Kap", "-", "Active", "thangkham97@gmail.com", "(214) 604-7481", 180, "2025-03-20"],
  [1210, "Ciin San Man", "-", "Active", "saanman12@gmail.com", "(918) 237-9219", 60, "2025-09-13"]
];

export const INITIAL_MEMBERS: Member[] = RAW_MEMBERS_DATA.map(data => ({
  id: `MC-${data[0]}`,
  name: data[1] as string,
  nickname: data[2] as string,
  beneficiary: "",
  accountStatus: data[3] as 'Active' | 'Inactive',
  email: data[4] as string,
  phone: data[5] as string === '-' ? '' : data[5] as string,
  totalContribution: Number(data[6]),
  joinDate: data[7] as string,
  activeLoanId: null,
  lastLoanPaidDate: null,
  address: "Tulsa, OK", 
  city: "Tulsa",
  state: "OK",
  zipCode: "74136",
  password: "welcome123"
}));

export const CONTRIBUTIONS_DB: Record<string, number> = INITIAL_MEMBERS.reduce((acc, member) => {
  acc[member.id] = member.totalContribution;
  return acc;
}, {} as Record<string, number>);

export const CONTRIBUTION_HISTORY_DB: Record<string, YearlyContribution> = {};

export type MemberTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export const getMemberTier = (member: Member): MemberTier => {
  const DIAMOND_IDS = ['MC-1001', 'MC-1002', 'MC-1003', 'MC-1004', 'MC-1070']; // Board members
  if (DIAMOND_IDS.includes(member.id)) return 'Diamond';

  const joinDate = new Date(member.joinDate);
  const now = new Date();
  
  // Calculate months of tenure
  const months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());

  if (months < 6) return 'Bronze';
  if (months < 36) return 'Silver'; // 3 years
  if (months < 120) return 'Gold'; // 10 years
  return 'Platinum';
};
