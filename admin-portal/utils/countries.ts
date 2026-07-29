export interface Country {
  code: string;
  name: string;
  states?: string[];
}

export const countries: Country[] = [
  {
    code: 'US',
    name: 'United States',
    states: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
      'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
      'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    states: [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon'
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    states: [
      'England', 'Scotland', 'Wales', 'Northern Ireland'
    ]
  },
  {
    code: 'NG',
    name: 'Nigeria',
    states: [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
      'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
      'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
      'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
      'Yobe', 'Zamfara'
    ]
  },
  {
    code: 'GH',
    name: 'Ghana',
    states: [
      'Ashanti', 'Brong Ahafo', 'Central', 'Eastern', 'Greater Accra', 'Northern', 'Upper East',
      'Upper West', 'Volta', 'Western', 'Western North'
    ]
  },
  {
    code: 'KE',
    name: 'Kenya',
    states: [
      'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay',
      'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii',
      'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
      'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi', 'Nakuru', 'Nandi',
      'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
      'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ]
  },
  {
    code: 'ZA',
    name: 'South Africa',
    states: [
      'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga',
      'Northern Cape', 'North West', 'Western Cape'
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    states: [
      'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
      'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
    ]
  },
  {
    code: 'IN',
    name: 'India',
    states: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
      'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ]
  },
  {
    code: 'FR',
    name: 'France',
    states: [
      'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire',
      'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine',
      'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    states: [
      'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse',
      'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate',
      'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
    ]
  },
  {
    code: 'BJ',
    name: 'Benin',
    states: [
      'Alibori', 'Atakora', 'Atlantique', 'Borgou', 'Collines', 'Couffo', 'Donga', 'Littoral', 'Mono', 'Ouémé', 'Plateau', 'Zou'
    ]
  },
  {
    code: 'EG',
    name: 'Egypt',
    states: [
      'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef', 'Cairo', 'Dakahlia', 'Damietta',
      'Faiyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr El Sheikh', 'Luxor', 'Matruh', 'Minya',
      'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea',
      'Sharqia', 'Sohag', 'South Sinai', 'Suez'
    ]
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    states: [
      'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela', 'Harari',
      'Oromia', 'Somali', 'Southern Nations, Nationalities, and Peoples', 'Tigray'
    ]
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    states: [
      'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma',
      'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza',
      'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga',
      'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Unguja North', 'Unguja South'
    ]
  },
  {
    code: 'UG',
    name: 'Uganda',
    states: [
      'Central', 'Eastern', 'Northern', 'Western'
    ]
  },
  {
    code: 'RW',
    name: 'Rwanda',
    states: [
      'Eastern Province', 'Kigali', 'Northern Province', 'Southern Province', 'Western Province'
    ]
  },
  {
    code: 'ZM',
    name: 'Zambia',
    states: [
      'Central', 'Copperbelt', 'Eastern', 'Luapula', 'Lusaka', 'Muchinga', 'Northern',
      'North-Western', 'Southern', 'Western'
    ]
  },
  {
    code: 'ZW',
    name: 'Zimbabwe',
    states: [
      'Bulawayo', 'Harare', 'Manicaland', 'Mashonaland Central', 'Mashonaland East',
      'Mashonaland West', 'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands'
    ]
  },
  {
    code: 'PK',
    name: 'Pakistan',
    states: [
      'Azad Jammu and Kashmir', 'Balochistan', 'Gilgit-Baltistan', 'Islamabad', 'Khyber Pakhtunkhwa',
      'Punjab', 'Sindh'
    ]
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    states: [
      'Barisal', 'Chittagong', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'
    ]
  },
  {
    code: 'LK',
    name: 'Sri Lanka',
    states: [
      'Central', 'Eastern', 'North Central', 'Northern', 'North Western', 'Sabaragamuwa',
      'Southern', 'Uva', 'Western'
    ]
  },
  {
    code: 'SG',
    name: 'Singapore',
    states: []
  },
  {
    code: 'MY',
    name: 'Malaysia',
    states: [
      'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Malacca', 'Negeri Sembilan',
      'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
    ]
  },
  {
    code: 'PH',
    name: 'Philippines',
    states: [
      'Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao',
      'Aurora', 'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol',
      'Bukidnon', 'Bulacan', 'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin',
      'Capiz', 'Catanduanes', 'Cavite', 'Cebu', 'Compostela Valley', 'Cotabato', 'Davao del Norte',
      'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands', 'Eastern Samar',
      'Guimaras', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Iloilo', 'Isabela', 'Kalinga',
      'La Union', 'Laguna', 'Lanao del Norte', 'Lanao del Sur', 'Leyte', 'Maguindanao',
      'Marinduque', 'Masbate', 'Metro Manila', 'Misamis Occidental', 'Misamis Oriental',
      'Mountain Province', 'Negros Occidental', 'Negros Oriental', 'Northern Samar', 'Nueva Ecija',
      'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Pampanga',
      'Pangasinan', 'Quezon', 'Quirino', 'Rizal', 'Romblon', 'Samar', 'Sarangani', 'Siquijor',
      'Sorsogon', 'South Cotabato', 'Southern Leyte', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte',
      'Surigao del Sur', 'Tarlac', 'Tawi-Tawi', 'Zambales', 'Zamboanga del Norte', 'Zamboanga del Sur',
      'Zamboanga Sibugay'
    ]
  },
  {
    code: 'ID',
    name: 'Indonesia',
    states: [
      'Aceh', 'Bali', 'Bangka Belitung', 'Banten', 'Bengkulu', 'Central Java', 'Central Kalimantan',
      'Central Sulawesi', 'East Java', 'East Kalimantan', 'East Nusa Tenggara', 'Gorontalo',
      'Jakarta', 'Jambi', 'Lampung', 'Maluku', 'North Kalimantan', 'North Maluku', 'North Sulawesi',
      'North Sumatra', 'Papua', 'Riau', 'Riau Islands', 'South Kalimantan', 'South Sulawesi',
      'South Sumatra', 'Southeast Sulawesi', 'West Java', 'West Kalimantan', 'West Nusa Tenggara',
      'West Papua', 'West Sulawesi', 'West Sumatra', 'Yogyakarta'
    ]
  },
  {
    code: 'TH',
    name: 'Thailand',
    states: [
      'Amnat Charoen', 'Ang Thong', 'Bangkok', 'Bueng Kan', 'Buriram', 'Chachoengsao', 'Chai Nat',
      'Chaiyaphum', 'Chanthaburi', 'Chiang Mai', 'Chiang Rai', 'Chonburi', 'Chumphon', 'Kalasin',
      'Kamphaeng Phet', 'Kanchanaburi', 'Khon Kaen', 'Krabi', 'Lampang', 'Lamphun', 'Loei',
      'Lopburi', 'Mae Hong Son', 'Maha Sarakham', 'Mukdahan', 'Nakhon Nayok', 'Nakhon Pathom',
      'Nakhon Phanom', 'Nakhon Ratchasima', 'Nakhon Sawan', 'Nakhon Si Thammarat', 'Nan',
      'Narathiwat', 'Nong Bua Lamphu', 'Nong Khai', 'Nonthaburi', 'Pathum Thani', 'Pattani',
      'Phang Nga', 'Phatthalung', 'Phayao', 'Phetchabun', 'Phetchaburi', 'Phichit', 'Phitsanulok',
      'Phra Nakhon Si Ayutthaya', 'Phrae', 'Phuket', 'Prachinburi', 'Prachuap Khiri Khan',
      'Ranong', 'Ratchaburi', 'Rayong', 'Roi Et', 'Sa Kaeo', 'Sakon Nakhon', 'Samut Prakan',
      'Samut Sakhon', 'Samut Songkhram', 'Saraburi', 'Satun', 'Si Sa Ket', 'Sing Buri',
      'Songkhla', 'Sukhothai', 'Suphan Buri', 'Surat Thani', 'Surin', 'Tak', 'Trang', 'Trat',
      'Ubon Ratchathani', 'Udon Thani', 'Uthai Thani', 'Uttaradit', 'Yala', 'Yasothon'
    ]
  },
  {
    code: 'VN',
    name: 'Vietnam',
    states: [
      'An Giang', 'Bà Rịa-Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre',
      'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng',
      'Đà Nẵng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
      'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh', 'Hải Dương', 'Hải Phòng', 'Hậu Giang',
      'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
      'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận',
      'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
      'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên-Huế',
      'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
    ]
  },
  {
    code: 'CN',
    name: 'China',
    states: [
      'Anhui', 'Beijing', 'Chongqing', 'Fujian', 'Gansu', 'Guangdong', 'Guangxi', 'Guizhou',
      'Hainan', 'Hebei', 'Heilongjiang', 'Henan', 'Hong Kong', 'Hubei', 'Hunan', 'Inner Mongolia',
      'Jiangsu', 'Jiangxi', 'Jilin', 'Liaoning', 'Macau', 'Ningxia', 'Qinghai', 'Shaanxi',
      'Shandong', 'Shanghai', 'Shanxi', 'Sichuan', 'Tianjin', 'Tibet', 'Xinjiang', 'Yunnan', 'Zhejiang'
    ]
  },
  {
    code: 'JP',
    name: 'Japan',
    states: [
      'Aichi', 'Akita', 'Aomori', 'Chiba', 'Ehime', 'Fukui', 'Fukuoka', 'Fukushima', 'Gifu',
      'Gunma', 'Hiroshima', 'Hokkaido', 'Hyogo', 'Ibaraki', 'Ishikawa', 'Iwate', 'Kagawa',
      'Kagoshima', 'Kanagawa', 'Kochi', 'Kumamoto', 'Kyoto', 'Mie', 'Miyagi', 'Miyazaki',
      'Nagano', 'Nagasaki', 'Nara', 'Niigata', 'Oita', 'Okayama', 'Okinawa', 'Osaka', 'Saga',
      'Saitama', 'Shiga', 'Shimane', 'Shizuoka', 'Tochigi', 'Tokushima', 'Tokyo', 'Tottori',
      'Toyama', 'Wakayama', 'Yamagata', 'Yamaguchi', 'Yamanashi'
    ]
  },
  {
    code: 'KR',
    name: 'South Korea',
    states: [
      'Busan', 'Chungcheongbuk-do', 'Chungcheongnam-do', 'Daegu', 'Daejeon', 'Gangwon-do',
      'Gwangju', 'Gyeonggi-do', 'Gyeongsangbuk-do', 'Gyeongsangnam-do', 'Incheon', 'Jeju-do',
      'Jeollabuk-do', 'Jeollanam-do', 'Seoul', 'Ulsan'
    ]
  },
  {
    code: 'BR',
    name: 'Brazil',
    states: [
      'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
      'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba',
      'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
      'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
    ]
  },
  {
    code: 'MX',
    name: 'Mexico',
    states: [
      'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
      'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México',
      'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
      'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
      'Yucatán', 'Zacatecas'
    ]
  },
  {
    code: 'AR',
    name: 'Argentina',
    states: [
      'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
      'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
      'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
      'Tierra del Fuego', 'Tucumán'
    ]
  },
  {
    code: 'ES',
    name: 'Spain',
    states: [
      'Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands',
      'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Extremadura', 'Galicia',
      'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencia'
    ]
  },
  {
    code: 'IT',
    name: 'Italy',
    states: [
      'Abruzzo', 'Aosta Valley', 'Apulia', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
      'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont',
      'Sardinia', 'Sicily', 'Trentino-Alto Adige', 'Tuscany', 'Umbria', 'Veneto'
    ]
  },
  {
    code: 'NL',
    name: 'Netherlands',
    states: [
      'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'North Brabant',
      'North Holland', 'Overijssel', 'South Holland', 'Utrecht', 'Zeeland'
    ]
  },
  {
    code: 'BE',
    name: 'Belgium',
    states: [
      'Antwerp', 'Brussels', 'East Flanders', 'Flemish Brabant', 'Hainaut', 'Liège', 'Limburg',
      'Luxembourg', 'Namur', 'Walloon Brabant', 'West Flanders'
    ]
  },
  {
    code: 'CH',
    name: 'Switzerland',
    states: [
      'Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt',
      'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel',
      'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau',
      'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zürich'
    ]
  },
  {
    code: 'AT',
    name: 'Austria',
    states: [
      'Burgenland', 'Carinthia', 'Lower Austria', 'Salzburg', 'Styria', 'Tyrol', 'Upper Austria',
      'Vienna', 'Vorarlberg'
    ]
  },
  {
    code: 'SE',
    name: 'Sweden',
    states: [
      'Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland', 'Jämtland', 'Jönköping',
      'Kalmar', 'Kronoberg', 'Norrbotten', 'Örebro', 'Östergötland', 'Skåne', 'Södermanland',
      'Stockholm', 'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland'
    ]
  },
  {
    code: 'NO',
    name: 'Norway',
    states: [
      'Agder', 'Innlandet', 'Møre og Romsdal', 'Nordland', 'Oslo', 'Rogaland', 'Troms og Finnmark',
      'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken'
    ]
  },
  {
    code: 'DK',
    name: 'Denmark',
    states: [
      'Capital Region', 'Central Denmark Region', 'North Denmark Region', 'Region of Southern Denmark',
      'Region Zealand'
    ]
  },
  {
    code: 'FI',
    name: 'Finland',
    states: [
      'Åland', 'Central Finland', 'Central Ostrobothnia', 'Finland Proper', 'Kainuu', 'Kymenlaakso',
      'Lapland', 'North Karelia', 'North Ostrobothnia', 'North Savo', 'Ostrobothnia', 'Päijät-Häme',
      'Pirkanmaa', 'Satakunta', 'South Karelia', 'South Ostrobothnia', 'South Savo', 'Southwest Finland',
      'Tavastia Proper', 'Uusimaa'
    ]
  },
  {
    code: 'PL',
    name: 'Poland',
    states: [
      'Greater Poland', 'Kuyavian-Pomeranian', 'Lesser Poland', 'Łódź', 'Lower Silesian', 'Lublin',
      'Lubusz', 'Masovian', 'Opole', 'Podlaskie', 'Pomeranian', 'Silesian', 'Subcarpathian',
      'Świętokrzyskie', 'Warmian-Masurian', 'West Pomeranian'
    ]
  },
  {
    code: 'PT',
    name: 'Portugal',
    states: [
      'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro',
      'Guarda', 'Leiria', 'Lisbon', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo',
      'Vila Real', 'Viseu', 'Azores', 'Madeira'
    ]
  },
  {
    code: 'IE',
    name: 'Ireland',
    states: [
      'Carlow', 'Cavan', 'Clare', 'Cork', 'Donegal', 'Dublin', 'Galway', 'Kerry', 'Kildare',
      'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath', 'Monaghan',
      'Offaly', 'Roscommon', 'Sligo', 'Tipperary', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow'
    ]
  },
  {
    code: 'GR',
    name: 'Greece',
    states: [
      'Attica', 'Central Greece', 'Central Macedonia', 'Crete', 'East Macedonia and Thrace',
      'Epirus', 'Ionian Islands', 'North Aegean', 'Peloponnese', 'South Aegean', 'Thessaly',
      'West Greece', 'West Macedonia'
    ]
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    states: [
      'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'
    ]
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    states: [
      'Al Bahah', 'Al Jawf', 'Al Madinah', 'Al Qassim', 'Eastern Province', 'Ha\'il',
      'Jazan', 'Makkah', 'Najran', 'Northern Borders', 'Riyadh', 'Tabuk'
    ]
  },
  {
    code: 'KW',
    name: 'Kuwait',
    states: [
      'Al Ahmadi', 'Al Farwaniyah', 'Al Jahra', 'Capital', 'Hawalli', 'Mubarak Al-Kabeer'
    ]
  },
  {
    code: 'QA',
    name: 'Qatar',
    states: [
      'Ad Dawhah', 'Al Khawr wa adh Dhakhirah', 'Al Rayyan', 'Al Wakrah', 'Ash Shamal',
      'Az Za\'ayin', 'Umm Salal'
    ]
  },
  {
    code: 'BH',
    name: 'Bahrain',
    states: [
      'Capital', 'Muharraq', 'Northern', 'Southern'
    ]
  },
  {
    code: 'OM',
    name: 'Oman',
    states: [
      'Ad Dakhiliyah', 'Ad Dhahirah', 'Al Batinah North', 'Al Batinah South', 'Al Buraimi',
      'Al Wusta', 'Ash Sharqiyah North', 'Ash Sharqiyah South', 'Dhofar', 'Musandam', 'Muscat'
    ]
  },
  {
    code: 'JO',
    name: 'Jordan',
    states: [
      'Ajloun', 'Amman', 'Aqaba', 'Balqa', 'Irbid', 'Jerash', 'Karak', 'Ma\'an', 'Madaba',
      'Mafraq', 'Tafilah', 'Zarqa'
    ]
  },
  {
    code: 'LB',
    name: 'Lebanon',
    states: [
      'Akkar', 'Baalbek-Hermel', 'Beirut', 'Beqaa', 'Mount Lebanon', 'Nabatieh', 'North',
      'South'
    ]
  },
  {
    code: 'IL',
    name: 'Israel',
    states: [
      'Central', 'Haifa', 'Jerusalem', 'Northern', 'Southern', 'Tel Aviv'
    ]
  },
  {
    code: 'CL',
    name: 'Chile',
    states: [
      'Aisén', 'Antofagasta', 'Araucanía', 'Arica y Parinacota', 'Atacama', 'Bío Bío',
      'Coquimbo', 'Los Lagos', 'Los Ríos', 'Magallanes', 'Maule', 'Ñuble', 'O\'Higgins',
      'Santiago', 'Tarapacá', 'Valparaíso'
    ]
  },
  {
    code: 'CO',
    name: 'Colombia',
    states: [
      'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá',
      'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
      'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo',
      'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
      'Valle del Cauca', 'Vaupés', 'Vichada'
    ]
  },
  {
    code: 'PE',
    name: 'Peru',
    states: [
      'Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
      'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
      'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín',
      'Tacna', 'Tumbes', 'Ucayali'
    ]
  },
  {
    code: 'VE',
    name: 'Venezuela',
    states: [
      'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
      'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda',
      'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas',
      'Yaracuy', 'Zulia'
    ]
  },
  {
    code: 'EC',
    name: 'Ecuador',
    states: [
      'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas',
      'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona-Santiago',
      'Napo', 'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas',
      'Sucumbíos', 'Tungurahua', 'Zamora-Chinchipe'
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    states: [
      'Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', 'Hawke\'s Bay', 'Manawatu-Wanganui',
      'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman',
      'Waikato', 'Wellington', 'West Coast'
    ]
  },
  {
    code: 'FJ',
    name: 'Fiji',
    states: [
      'Central', 'Eastern', 'Northern', 'Western'
    ]
  },
  {
    code: 'PG',
    name: 'Papua New Guinea',
    states: [
      'Bougainville', 'Central', 'Chimbu', 'East New Britain', 'East Sepik', 'Eastern Highlands',
      'Enga', 'Gulf', 'Madang', 'Manus', 'Milne Bay', 'Morobe', 'New Ireland', 'Northern',
      'Southern Highlands', 'West New Britain', 'West Sepik', 'Western', 'Western Highlands'
    ]
  },
  {
    code: 'MM',
    name: 'Myanmar',
    states: [
      'Ayeyarwady', 'Bago', 'Chin', 'Kachin', 'Kayah', 'Kayin', 'Magway', 'Mandalay', 'Mon',
      'Naypyidaw', 'Rakhine', 'Sagaing', 'Shan', 'Tanintharyi', 'Yangon'
    ]
  },
  {
    code: 'KH',
    name: 'Cambodia',
    states: [
      'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Speu',
      'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey',
      'Pailin', 'Phnom Penh', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri',
      'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tbong Khmum'
    ]
  },
  {
    code: 'LA',
    name: 'Laos',
    states: [
      'Attapeu', 'Bokeo', 'Bolikhamsai', 'Champasak', 'Houaphanh', 'Khammouane', 'Luang Namtha',
      'Luang Prabang', 'Oudomxay', 'Phongsaly', 'Salavan', 'Savannakhet', 'Sekong', 'Vientiane',
      'Vientiane Capital', 'Xaisomboun', 'Xiangkhouang'
    ]
  },
  {
    code: 'TW',
    name: 'Taiwan',
    states: [
      'Changhua', 'Chiayi', 'Chiayi', 'Hsinchu', 'Hualien', 'Kaohsiung', 'Keelung', 'Kinmen',
      'Lienchiang', 'Miaoli', 'Nantou', 'New Taipei', 'Penghu', 'Pingtung', 'Taichung', 'Tainan',
      'Taipei', 'Taitung', 'Taoyuan', 'Yilan', 'Yunlin'
    ]
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    states: []
  },
];

export const getCountryStates = (countryCode: string): string[] => {
  const country = countries.find(c => c.code === countryCode);
  return country?.states || [];
};

export const getCountryName = (countryCode: string): string => {
  const country = countries.find(c => c.code === countryCode);
  return country?.name || countryCode;
};

