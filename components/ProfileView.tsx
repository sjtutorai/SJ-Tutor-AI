
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  User, 
  Phone, 
  School, 
  Camera, 
  Edit2, 
  Mail, 
  Zap, 
  GraduationCap, 
  CheckCircle, 
  Calendar, 
  Briefcase, 
  Layers, 
  BookOpen, 
  ArrowRight 
} from 'lucide-react';
import { validateAndParsePhone, CountryPhone } from '../utils/phoneUtils';
import { calculateProfileCompletion, generateRegistrationNumber, calculateGradeFromAge, getMissingProfileFields } from '../utils/profileUtils';

interface ProfileViewProps {
  profile: UserProfile;
  email: string | null;
  onSave: (profile: UserProfile, redirect?: boolean) => void;
  isOnboarding?: boolean;
}

const STATE_DISTRICT_MAPPING: Record<string, string[]> = {
  'Andhra Pradesh': ['Alluri Sitharama Raju', 'Anakapalli', 'Anantapur', 'Annamayya', 'Bapatla', 'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'Eluru', 'Guntur', 'Kakinada', 'Krishna', 'Kurnool', 'NTR', 'Nandyal', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
  'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
  'Assam': ['Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
  'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
  'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Manendragarh-Bharatpur-Chirmiri', 'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja'],
  'Goa': ['North Goa', 'South Goa'],
  'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udepur', 'Dahod', 'Dang', 'Devbhumi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
  'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', ' सिरसा', 'Sonipat', 'Yamunanagar'],
  'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
  'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadgir'],
  'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
  'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
  'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
  'Mizoram': ['Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'],
  'Nagaland': ['Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyü', 'Tuensang', 'Wokha', 'Zunheboto'],
  'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Sonepur', 'Sundargarh'],
  'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandur', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Tarn Taran'],
  'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
  'Sikkim': ['East Sikkim', 'North Sikkim', 'Pakyong', 'Soreng', 'South Sikkim', 'West Sikkim'],
  'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
  'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddh Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
  'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
  'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
  'Ladakh': ['Kargil', 'Leh'],
  'Lakshadweep': ['Lakshadweep'],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
};

const INDIAN_STATES = Object.keys(STATE_DISTRICT_MAPPING).sort();

const INDIAN_SCHOOL_BOARDS = [
  'CBSE (Central Board of Secondary Education)',
  'ICSE (Council for the Indian School Certificate Examinations)',
  'State Board (Andhra Pradesh)',
  'State Board (Assam)',
  'State Board (Bihar)',
  'State Board (Gujarat)',
  'State Board (Haryana)',
  'State Board (Karnataka)',
  'State Board (Kerala)',
  'State Board (Maharashtra)',
  'State Board (Madhya Pradesh)',
  'State Board (Rajasthan)',
  'State Board (Tamil Nadu)',
  'State Board (Telangana)',
  'State Board (Uttar Pradesh)',
  'State Board (West Bengal)',
  'International Baccalaureate (IB)',
  'IGCSE (Cambridge)',
  'NIOS (National Institute of Open Schooling)'
];

const COMMON_SCHOOL_TYPES = [
  // Major Government School Chains
  'Kendriya Vidyalaya (KV)',
  'Jawahar Navodaya Vidyalaya (JNV)',
  'Kasturba Gandhi Balika Vidyalaya',
  'Government Senior Secondary School',
  'Government Model Sr. Sec. School',
  'Sainik School',
  'Army Public School',
  'Air Force School',
  'Navy Children School',
  'Railway Senior Secondary School',
  'Eklavya Model Residential School',
  'Atomic Energy Central School',
  
  // State Government & Local Bodies
  'Municipal Corporation School (MCD/BMC/etc.)',
  'Nagar Palika School',
  'Zilla Parishad School',
  'Prathmik Vidyalaya (Primary Government School)',
  'Madhyamik Vidyalaya (Secondary Government School)',
  
  // Famous Private/Semi-Private Chains
  'Delhi Public School (DPS)',
  'DAV Public School',
  'Ryan International School',
  'Amity International School',
  'St. Xavier\'s High School',
  'Loyola School',
  'Don Bosco School',
  'Carmel Convent School',
  'Vishwa Bharati Public School',
  'Podar International School',
  'The Heritage School',
  'Mount Carmel School',
  'Orchids The International School',
  
  // Institutional/Aided
  'Private Aided School',
  'Private Unaided School',
  'University Departmental School'
];

const ProfileView: React.FC<ProfileViewProps> = ({ profile, email, onSave, isOnboarding = false }) => {
  const [isEditing, setIsEditing] = useState(isOnboarding);
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [filteredSchools, setFilteredSchools] = useState<string[]>(COMMON_SCHOOL_TYPES);
  const [phoneInfo, setPhoneInfo] = useState<{ country?: CountryPhone, isValid: boolean, error?: string }>({ isValid: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOnboarding) {
      setIsEditing(true);
    }
    // Update local form state if prop changes
    setFormData(profile);
    
    // Initial validation of phone number
    if (profile.phoneNumber) {
      const result = validateAndParsePhone(profile.phoneNumber);
      setPhoneInfo({
        country: result.country,
        isValid: result.isValid,
        error: result.error
      });
    }
  }, [isOnboarding, profile]);

  const ALL_SCHOOLS = [
    ...COMMON_SCHOOL_TYPES,
    ...INDIAN_SCHOOL_BOARDS
  ];

  // Sample mapping for district-specific schools to demonstrate contextual filtering
  const DISTRICT_SCHOOLS: Record<string, string[]> = {
    'New Delhi': ['Sanskriti School', 'Modern School Barakhamba', 'Springdales School', 'Mount St Mary\'s', 'Vasant Valley School', 'DPS RK Puram', 'The Mother\'s International School'],
    'Mumbai City': ['Cathedral and John Connon School', 'Jamnabai Narsee School', 'Campion School', 'Don Bosco High School', 'St. Mary\'s School', 'The Cathedral & John Connon School'],
    'Bengaluru Urban': ['The Valley School', 'Mallya Aditi International School', 'Bishop Cotton Boys\' High School', 'National Public School Indiranagar', 'Inventure Academy'],
    'Patna': ['St. Michael\'s High School', 'Loyola High School', 'Notre Dame Academy', 'Delhi Public School Patna', 'Don Bosco Academy'],
    'Jaipur': ['Maharani Gayatri Devi Girls\' Public School', 'St. Xavier\'s Senior Secondary School', 'Sanskar School', 'Neerja Modi School'],
    'Pune': ['The Bishop\'s School', 'St. Mary\'s School', 'Loyola High School', 'Symbiosis International School'],
    'Hyderabad': ['The Hyderabad Public School', 'Chirec International School', 'Gitanjali Senior School'],
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate or update registration number
      if (field === 'displayName' || field === 'dob') {
        updated.registrationNumber = generateRegistrationNumber(updated);
      }
      
      // Auto-calculate grade based on age
      if (field === 'dob' && value) {
        const calculatedGrade = calculateGradeFromAge(value);
        if (calculatedGrade) {
          updated.grade = calculatedGrade;
        }
      }

      // Reset district if state changes
      if (field === 'state') {
        updated.district = '';
      }

      // School filtering logic
      if (field === 'institution' || field === 'district') {
        const currentDistrict = field === 'district' ? value : updated.district;
        const currentInput = field === 'institution' ? value : (field === 'district' ? '' : updated.institution);

        let contextSchools = [...ALL_SCHOOLS];
        if (currentDistrict && DISTRICT_SCHOOLS[currentDistrict]) {
          contextSchools = [...DISTRICT_SCHOOLS[currentDistrict], ...ALL_SCHOOLS];
        }

        if (currentInput.length > 0) {
          const searchTerm = currentInput.toUpperCase();
          const filtered = contextSchools.filter(school => 
            school.toUpperCase().includes(searchTerm)
          );
          setFilteredSchools(filtered.length > 0 ? filtered : contextSchools);
        } else {
          setFilteredSchools(contextSchools);
        }
      }
      
      return updated;
    });
    
    if (field === 'phoneNumber') {
      const result = validateAndParsePhone(value);
      setPhoneInfo({
        country: result.country,
        isValid: result.isValid,
        error: result.error
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(formData, true);
    if (!isOnboarding) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  const isPremium = formData.planType && formData.planType !== 'Free';
  const completionPercentage = calculateProfileCompletion(formData);
  const incompletePercentage = 100 - completionPercentage;
  const missingFields = getMissingProfileFields(formData);

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isOnboarding ? 'py-4' : ''}`}>
      
      {isOnboarding && (
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to SJ Tutor AI!</h1>
          <p className="text-slate-500 max-w-lg mx-auto">Let&apos;s build your academic profile to personalize your AI tutor and study materials.</p>
        </div>
      )}

      {/* Completion Banner */}
      {incompletePercentage > 0 && !isOnboarding && (
        <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center bg-white dark:bg-slate-900 relative">
               <svg className="w-10 h-10 -rotate-90">
                <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-800" />
                <circle
                  cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" 
                  strokeDasharray={113}
                  strokeDashoffset={113 - (113 * completionPercentage) / 100}
                  className="text-primary-500"
                />
               </svg>
               <span className="absolute text-[10px] font-bold text-primary-700 dark:text-primary-400">{completionPercentage}%</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Perfect your profile!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your profile is <span className="font-bold text-primary-600 dark:text-primary-400">{incompletePercentage}% incomplete</span>. Fill in all details for better AI personalization.</p>
              
              {missingFields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                   <span className="text-[10px] text-slate-400 font-medium">Missing:</span>
                   {missingFields.slice(0, 3).map((field) => (
                     <span key={field} className="text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                       {field}
                     </span>
                   ))}
                   {missingFields.length > 3 && (
                     <span className="text-[10px] text-slate-400">+{missingFields.length - 3} more</span>
                   )}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/20"
          >
            Complete Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Identity Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center lg:sticky lg:top-24">
           <div className="relative group mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-primary-50 shadow-md bg-slate-50 flex items-center justify-center overflow-hidden relative">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-12 h-12 text-slate-300" />
                )}
                
                {/* Completion Progress Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-slate-100/30"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * completionPercentage) / 100}
                      className={`${completionPercentage === 100 ? 'text-emerald-500' : 'text-primary-500'} transition-all duration-1000 ease-out`}
                    />
                  </svg>
                  <div className="absolute bottom-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">
                    <span className={`text-[10px] font-bold ${completionPercentage === 100 ? 'text-emerald-600' : 'text-primary-600'}`}>
                      {completionPercentage}%
                    </span>
                  </div>
                </div>
              </div>
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 shadow-md transition-colors transform hover:scale-110"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800">{formData.displayName || 'Scholar'}</h2>
            {formData.registrationNumber && (
              <div className="mt-1 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1.5">ID:</span>
                <code className="text-xs font-bold text-slate-600 font-mono tracking-tighter">{formData.registrationNumber}</code>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-2 mb-4">
               <Mail className="w-3.5 h-3.5" />
               <span className="truncate max-w-[200px]">{email}</span>
            </div>

            <div className="w-full border-t border-slate-100 pt-4 mb-4">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-500">Status</span>
                 <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">Active</span>
               </div>
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-500">Plan</span>
                 <span className={`font-semibold px-2 py-0.5 rounded text-xs ${!isPremium ? 'text-slate-600 bg-slate-100' : 'text-primary-600 bg-primary-50'}`}>
                    {formData.planType || 'Free'}
                 </span>
               </div>
               <div className="flex justify-between text-sm items-center">
                 <span className="text-slate-500">Credits</span>
                 <div className="flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                    <Zap className="w-3 h-3 fill-amber-400 text-amber-500" />
                    {formData.credits} / 100
                 </div>
               </div>
               
            </div>

            {!isOnboarding && !isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : isEditing && !isOnboarding && (
              <div className="w-full grid grid-cols-2 gap-3">
                 <button 
                  onClick={handleCancel}
                  className="py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-md"
                >
                  Save
                </button>
              </div>
            )}
        </div>

        {/* Right Column: Details Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Personal Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
               <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                 <User className="w-5 h-5 text-blue-600" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">Personal Details</h3>
                  <p className="text-sm text-slate-400">Your basic information</p>
               </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                  <div className="relative">
                     <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <input
                       type="date"
                       disabled={!isEditing}
                       value={formData.dob || ''}
                       onChange={(e) => handleInputChange('dob', e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                     />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</label>
                  <div className="relative">
                     <Layers className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <input
                      type="text"
                      list="states-list"
                      disabled={!isEditing}
                      value={formData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                      placeholder="Select or type your State"
                    />
                    <datalist id="states-list">
                      {INDIAN_STATES.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">District</label>
                  <div className="relative">
                     <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <input
                      type="text"
                      list="districts-list"
                      disabled={!isEditing}
                      value={formData.district || ''}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                      placeholder={formData.state ? "Select or type your District" : "Select State first"}
                    />
                    <datalist id="districts-list">
                      {(formData.state && STATE_DISTRICT_MAPPING[formData.state]) ? (
                        STATE_DISTRICT_MAPPING[formData.state].map(d => <option key={d} value={d} />)
                      ) : (
                        <option value="Please select a state first" />
                      )}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">About Me (Bio)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                    placeholder="e.g. Aspiring Physicist"
                  />
                </div>
             </div>
          </div>

          {/* Section 2: Account & Academic */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
               <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                 <Briefcase className="w-5 h-5 text-purple-600" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">Academic & Contact</h3>
                  <p className="text-sm text-slate-400">School and communication info</p>
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                    School Selection
                    <span className="text-[10px] text-primary-500 lowercase font-normal">Search by name ↓</span>
                  </label>
                  <div className="relative">
                     <School className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <input
                      type="text"
                      list="school-list"
                      disabled={!isEditing}
                      value={formData.institution}
                      onChange={(e) => handleInputChange('institution', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                      placeholder="Type School name... (If not present, type yours)"
                    />
                    <datalist id="school-list">
                      {filteredSchools.map((type, idx) => (
                        <option key={`type-${idx}`} value={type} />
                      ))}
                    </datalist>
                  </div>
                  {!formData.institution && isEditing && (
                    <p className="text-[10px] text-slate-400 px-1 italic">
                      Type the first letter to see suggestions. If your school isn&apos;t listed, feel free to type its full name.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class / Grade</label>
                  <div className="relative">
                     <GraduationCap className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.grade || ''}
                      onChange={(e) => handleInputChange('grade', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                      placeholder="e.g. 10th Grade"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-3.5 flex items-center gap-2 pointer-events-none">
                        {phoneInfo.country ? (
                           <span className="text-lg leading-none">{phoneInfo.country.flag}</span>
                        ) : (
                           <Phone className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <input
                        type="tel"
                        disabled={!isEditing}
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900 ${
                          formData.phoneNumber && !phoneInfo.isValid ? 'border-red-300 focus:ring-red-200' : 'border-slate-200'
                        }`}
                        placeholder="e.g. +91 9876543210"
                      />
                      {phoneInfo.isValid && (
                        <CheckCircle className="absolute right-3 top-3.5 w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {formData.phoneNumber && (
                    <div className="flex items-center justify-between mt-1 px-1">
                      {phoneInfo.country ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{phoneInfo.country.name}</span>
                          <span>•</span>
                          <span>{phoneInfo.country.callingCode}</span>
                          <span>•</span>
                          <span>{phoneInfo.country.minDigits}-{phoneInfo.country.maxDigits} digits</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Type country code (e.g. +91)</div>
                      )}
                      
                      {!phoneInfo.isValid && (
                        <span className="text-xs text-red-500 font-medium">Invalid number format</span>
                      )}
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Section 3: Learning Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                   <Layers className="w-5 h-5 text-amber-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Learning Preferences</h3>
                    <p className="text-sm text-slate-400">Customize your AI experience</p>
                 </div>
               </div>
               
               {/* Learning Preference Completion Badge */}
               <div className={`flex flex-col items-end gap-1 ${isOnboarding ? 'hidden' : ''}`}>
                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${formData.learningGoal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    {formData.learningGoal ? 'Preference Complete' : 'Preference Incomplete'}
                 </span>
                 {!formData.learningGoal && (
                   <span className="text-[10px] font-medium text-primary-500 animate-pulse">
                     +{(!formData.learningGoal ? 5 : 0)}% Gain available
                   </span>
                 )}
               </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Learning Goal</label>
                  <textarea
                    disabled={!isEditing}
                    value={formData.learningGoal || ''}
                    onChange={(e) => handleInputChange('learningGoal', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 resize-none min-h-[80px] text-slate-900"
                    placeholder="e.g. Prepare for finals and improve my understanding of Quantum Physics."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Learning Style</label>
                  <div className="relative">
                     <BookOpen className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <select
                        disabled={!isEditing}
                        value={formData.learningStyle || 'Visual'}
                        onChange={(e) => handleInputChange('learningStyle', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 appearance-none text-slate-900"
                      >
                        <option value="Visual">Visual (Images, Diagrams)</option>
                        <option value="Auditory">Auditory (Listening, Discussing)</option>
                        <option value="Reading/Writing">Reading & Writing</option>
                        <option value="Kinesthetic">Kinesthetic (Hands-on)</option>
                      </select>
                  </div>
                </div>
             </div>
          </div>

          {isOnboarding && (
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                className="px-8 py-3.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2"
              >
                Complete Setup
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfileView;

