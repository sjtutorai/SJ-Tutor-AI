/**
 * Comprehensive Geographic, Country, State, District, and Reverse Geocoding Services
 * Used for detailed address capture and Google Maps / GPS integration in SJ Tutor AI
 */

export interface CountryItem {
  code: string;
  name: string;
  phonePrefix: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: 'IN', name: 'India', phonePrefix: '+91' },
  { code: 'US', name: 'United States', phonePrefix: '+1' },
  { code: 'GB', name: 'United Kingdom', phonePrefix: '+44' },
  { code: 'CA', name: 'Canada', phonePrefix: '+1' },
  { code: 'AU', name: 'Australia', phonePrefix: '+61' },
  { code: 'AE', name: 'United Arab Emirates', phonePrefix: '+971' },
  { code: 'SG', name: 'Singapore', phonePrefix: '+65' },
  { code: 'DE', name: 'Germany', phonePrefix: '+49' },
  { code: 'FR', name: 'France', phonePrefix: '+33' },
  { code: 'JP', name: 'Japan', phonePrefix: '+81' },
  { code: 'MY', name: 'Malaysia', phonePrefix: '+60' },
  { code: 'NZ', name: 'New Zealand', phonePrefix: '+64' },
  { code: 'SA', name: 'Saudi Arabia', phonePrefix: '+966' },
  { code: 'ZA', name: 'South Africa', phonePrefix: '+27' },
  { code: 'BR', name: 'Brazil', phonePrefix: '+55' },
  { code: 'MX', name: 'Mexico', phonePrefix: '+52' },
  { code: 'ES', name: 'Spain', phonePrefix: '+34' },
  { code: 'IT', name: 'Italy', phonePrefix: '+39' },
  { code: 'NL', name: 'Netherlands', phonePrefix: '+31' },
  { code: 'SE', name: 'Sweden', phonePrefix: '+46' },
  { code: 'CH', name: 'Switzerland', phonePrefix: '+41' },
  { code: 'IE', name: 'Ireland', phonePrefix: '+353' },
  { code: 'NG', name: 'Nigeria', phonePrefix: '+234' },
  { code: 'KE', name: 'Kenya', phonePrefix: '+254' },
  { code: 'PH', name: 'Philippines', phonePrefix: '+63' },
  { code: 'ID', name: 'Indonesia', phonePrefix: '+62' },
  { code: 'BD', name: 'Bangladesh', phonePrefix: '+880' },
  { code: 'PK', name: 'Pakistan', phonePrefix: '+92' },
  { code: 'LK', name: 'Sri Lanka', phonePrefix: '+94' },
  { code: 'NP', name: 'Nepal', phonePrefix: '+977' },
  { code: 'KR', name: 'South Korea', phonePrefix: '+82' },
  { code: 'CN', name: 'China', phonePrefix: '+86' },
  { code: 'RU', name: 'Russia', phonePrefix: '+7' },
  { code: 'TR', name: 'Turkey', phonePrefix: '+90' },
  { code: 'EG', name: 'Egypt', phonePrefix: '+20' },
  { code: 'OTHER', name: 'Other International', phonePrefix: '+1' },
];

export const INDIAN_STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool',
    'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram',
    'West Godavari', 'YSR Kadapa', 'Tirupati', 'Kakinada', 'Vijayawada'
  ],
  'Arunachal Pradesh': [
    'Tawang', 'West Kameng', 'East Kameng', 'Papum Pare', 'Kurung Kumey',
    'Kra Daadi', 'Lower Subansiri', 'Upper Subansiri', 'West Siang', 'East Siang',
    'Siang', 'Upper Siang', 'Lower Siang', 'Lower Dibang Valley', 'Dibang Valley',
    'Anjaw', 'Lohit', 'Namsai', 'Changlang', 'Tirap', 'Longding', 'Itanagar'
  ],
  'Assam': [
    'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo',
    'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara',
    'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan (Guwahati)',
    'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon',
    'Nagaon', 'Nalbari', 'Dima Hasao', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar',
    'Tinsukia', 'Udalguri', 'West Karbi Anglong'
  ],
  'Bihar': [
    'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur',
    'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj',
    'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj',
    'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda',
    'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
    'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul',
    'Vaishali', 'West Champaran'
  ],
  'Chhattisgarh': [
    'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur',
    'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa',
    'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya',
    'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon',
    'Sukma', 'Surajpur', 'Surguja'
  ],
  'Goa': [
    'North Goa (Panaji)', 'South Goa (Margao)'
  ],
  'Gujarat': [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
    'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
    'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
    'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
    'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
    'Tapi', 'Vadodara', 'Valsad'
  ],
  'Haryana': [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
    'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra',
    'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari',
    'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu',
    'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'
  ],
  'Jharkhand': [
    'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum (Jamshedpur)',
    'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara',
    'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
    'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
  ],
  'Karnataka': [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Mangaluru (Dakshina Kannada)',
    'Belagavi', 'Hubballi-Dharwad', 'Shivamogga', 'Tumakuru', 'Ballari',
    'Bagalkote', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru',
    'Chitradurga', 'Davanagere', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi',
    'Kodagu (Madikeri)', 'Kolar', 'Koppal', 'Mandya', 'Raichur', 'Ramanagara',
    'Udupi', 'Uttara Kannada (Karwar)', 'Vijayapura', 'Yadgir', 'Vijayanagara'
  ],
  'Kerala': [
    'Alappuzha', 'Ernakulam (Kochi)', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
    'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad'
  ],
  'Madhya Pradesh': [
    'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
    'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara',
    'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior',
    'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni',
    'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur',
    'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar',
    'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri',
    'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
  ],
  'Maharashtra': [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad (Chhatrapati Sambhajinagar)', 'Beed', 'Bhandara',
    'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
    'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban',
    'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad (Dharashiv)', 'Palghar',
    'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
    'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
  ],
  'Manipur': [
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
    'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl',
    'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
  ],
  'Meghalaya': [
    'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills (Shillong)',
    'North Garo Hills', 'Ribhoi', 'South Garo Hills', 'South West Garo Hills',
    'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'
  ],
  'Mizoram': [
    'Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit',
    'Saiha', 'Serchhip', 'Hnahthial', 'Khawzawl', 'Saitual'
  ],
  'Nagaland': [
    'Chumukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung',
    'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyu',
    'Tuensang', 'Wokha', 'Zunheboto'
  ],
  'Odisha': [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
    'Khordha (Bhubaneswar)', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur',
    'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ],
  'Punjab': [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
    'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
    'Mansa', 'Moga', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala',
    'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)', 'Sangrur', 'Tarn Taran'
  ],
  'Rajasthan': [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur',
    'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
    'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore',
    'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur',
    'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi',
    'Sri Ganganagar', 'Tonk', 'Udaipur'
  ],
  'Sikkim': [
    'East Sikkim (Gangtok)', 'North Sikkim (Mangan)', 'South Sikkim (Namchi)', 'West Sikkim (Gyalshing)', 'Pakyong', 'Soreng'
  ],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
    'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
    'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
    'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
    'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
    'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
    'Viluppuram', 'Virudhunagar'
  ],
  'Telangana': [
    'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon',
    'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
    'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak',
    'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet',
    'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy',
    'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Hanamkonda', 'Yadadri Bhuvanagiri'
  ],
  'Tripura': [
    'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura (Agartala)'
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya',
    'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki',
    'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli',
    'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad',
    'Gautam Buddha Nagar (Noida)', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur',
    'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi',
    'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri',
    'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri',
    'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
    'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur',
    'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar',
    'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
  ],
  'Uttarakhand': [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
    'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
    'Udham Singh Nagar', 'Uttarkashi'
  ],
  'West Bengal': [
    'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
    'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
    'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman',
    'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia',
    'South 24 Parganas', 'Uttar Dinajpur'
  ],
  'Delhi (NCT)': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
  ],
  'Jammu and Kashmir': [
    'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu',
    'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri',
    'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'
  ],
  'Ladakh': [
    'Leh', 'Kargil'
  ],
  'Chandigarh': [
    'Chandigarh'
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Mahe', 'Yanam'
  ]
};

export const US_STATES: Record<string, string[]> = {
  'California': ['Los Angeles County', 'San Diego County', 'Orange County', 'Santa Clara County', 'San Francisco', 'Alameda County', 'Sacramento County', 'Other Area'],
  'New York': ['New York County (Manhattan)', 'Kings County (Brooklyn)', 'Queens', 'Bronx', 'Richmond (Staten Island)', 'Nassau County', 'Westchester County', 'Suffolk County', 'Erie County (Buffalo)', 'Other Area'],
  'Texas': ['Harris County (Houston)', 'Dallas County', 'Tarrant County (Fort Worth)', 'Bexar County (San Antonio)', 'Travis County (Austin)', 'Collin County', 'El Paso County', 'Other Area'],
  'Florida': ['Miami-Dade County', 'Broward County', 'Palm Beach County', 'Hillsborough County (Tampa)', 'Orange County (Orlando)', 'Duval County (Jacksonville)', 'Pinellas County', 'Other Area'],
  'Washington': ['King County (Seattle)', 'Pierce County (Tacoma)', 'Snohomish County', 'Spokane County', 'Clark County', 'Thurston County', 'Other Area'],
  'Illinois': ['Cook County (Chicago)', 'DuPage County', 'Lake County', 'Will County', 'Kane County', 'McHenry County', 'Other Area'],
  'New Jersey': ['Bergen County', 'Middlesex County', 'Essex County', 'Hudson County (Jersey City)', 'Monmouth County', 'Ocean County', 'Other Area'],
  'Massachusetts': ['Suffolk County (Boston)', 'Middlesex County (Cambridge)', 'Worcester County', 'Essex County', 'Norfolk County', 'Other Area'],
  'Georgia': ['Fulton County (Atlanta)', 'Gwinnett County', 'Cobb County', 'DeKalb County', 'Chatham County (Savannah)', 'Other Area'],
  'Pennsylvania': ['Philadelphia County', 'Allegheny County (Pittsburgh)', 'Montgomery County', 'Bucks County', 'Delaware County', 'Other Area'],
  'Other US State': ['Major County / District', 'Metro Area', 'Other Area']
};

export const GENERIC_REGIONS: Record<string, string[]> = {
  'Ontario (Canada)': ['Toronto Metro', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Other Area'],
  'British Columbia (Canada)': ['Metro Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Other Area'],
  'Greater London (UK)': ['City of London', 'Westminster', 'Camden', 'Kensington and Chelsea', 'Greenwich', 'Southwark', 'Tower Hamlets', 'Other Borough'],
  'Manchester / North West (UK)': ['City of Manchester', 'Salford', 'Bolton', 'Liverpool', 'Other Area'],
  'New South Wales (Australia)': ['Sydney City', 'Parramatta', 'Canterbury-Bankstown', 'Northern Beaches', 'Wollongong', 'Newcastle', 'Other Area'],
  'Victoria (Australia)': ['Melbourne City', 'Monash', 'Whitehorse', 'Greater Dandenong', 'Geelong', 'Other Area'],
  'Dubai (UAE)': ['Deira', 'Bur Dubai', 'Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Al Barsha', 'Business Bay', 'Other Area'],
  'Abu Dhabi (UAE)': ['Abu Dhabi City', 'Al Ain', 'Al Dhafra', 'Saadiyat', 'Yas Island', 'Other Area'],
  'Singapore (Central/East/West)': ['Central Region', 'East Region', 'West Region', 'North Region', 'North-East Region']
};

export interface GeocodedAddress {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  streetAddress?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

/**
 * Reverse geocode latitude and longitude to structured address data
 */
export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<GeocodedAddress> {
  const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SJTutorAI-EducationPlatform/1.0',
      },
    });
    if (!res.ok) {
      return {
        latitude: lat,
        longitude: lng,
        googleMapsUrl,
      };
    }
    const data = await res.json();
    const addr = data.address || {};

    const country = addr.country || 'India';
    const state = addr.state || addr.province || addr.region || '';
    const district = addr.state_district || addr.county || addr.district || addr.suburb || addr.city_district || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
    const zipCode = addr.postcode || '';

    const roadParts = [
      addr.house_number,
      addr.road || addr.pedestrian || addr.footway || addr.path,
      addr.neighbourhood || addr.suburb,
      city,
    ].filter(Boolean);

    const streetAddress = roadParts.join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || '';

    return {
      country,
      state,
      district,
      city,
      streetAddress,
      zipCode,
      latitude: lat,
      longitude: lng,
      googleMapsUrl,
    };
  } catch (err) {
    console.warn('Geocoding service error:', err);
    return {
      latitude: lat,
      longitude: lng,
      googleMapsUrl,
    };
  }
}
