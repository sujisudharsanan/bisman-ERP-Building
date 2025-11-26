import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Comprehensive demo users with complete profiles
const demoUsers = [
  {
    // 1. Hub Incharge (Template provided by user)
    auth: {
      username: 'arun_kumar',
      email: 'arun.kumar@bisman.demo',
      password: 'Demo@123',
      role: 'HUB_INCHARGE',
      is_active: true,
      productType: 'PUMP_ERP',
    },
    profile: {
      fullName: 'Arun Kumar',
      employeeCode: 'BIS-HUB-001',
      phone: '+91-9876543210',
      alternatePhone: '+91-9876543211',
      dateOfBirth: new Date('1988-05-15'),
      gender: 'MALE',
      bloodGroup: 'O+',
      fatherName: 'Rajesh Kumar',
      motherName: 'Sunita Devi',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'H.No. 45, Sector 12',
        line2: 'Near City Mall',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122001',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Fuel Station',
        line2: 'NH-48, Sector 18',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122015',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'ABCPK1234D',
      aadhaarNumber: '1234-5678-9012',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Arun Kumar',
      bankName: 'HDFC Bank',
      branchName: 'Gurgaon Sector 14',
      accountNumber: '50100123456789',
      ifscCode: 'HDFC0001234',
      isPrimary: true,
    },
    education: [
      {
        degree: 'B.Com',
        institutionName: 'Delhi University',
        yearOfPassing: 2010,
        gradeOrPercentage: '75%',
      },
    ],
    skills: [
      { skillName: 'Inventory Management', proficiencyLevel: 'EXPERT' },
      { skillName: 'Fuel Quality Testing', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Team Leadership', proficiencyLevel: 'ADVANCED' },
    ],
    achievements: [
      {
        title: 'Best Hub Manager 2023',
        description: 'Achieved highest sales growth in Q4 2023',
        achievementDate: new Date('2023-12-15'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Priya Kumar',
        relationship: 'Spouse',
        phone: '+91-9876543212',
      },
    ],
  },

  {
    // 2. CFO (Chief Financial Officer)
    auth: {
      username: 'rajesh_verma',
      email: 'rajesh.verma@bisman.demo',
      password: 'Demo@123',
      role: 'CFO',
      is_active: true,
      productType: 'BUSINESS_ERP',
    },
    profile: {
      fullName: 'Rajesh Verma',
      employeeCode: 'BIS-CFO-001',
      phone: '+91-9876540001',
      alternatePhone: '+91-9876540002',
      dateOfBirth: new Date('1975-08-20'),
      gender: 'MALE',
      bloodGroup: 'A+',
      fatherName: 'Mohan Lal Verma',
      motherName: 'Kamla Devi',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'Apartment 502, DLF Phase 3',
        line2: 'Golf Course Road',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Corporate Office',
        line2: 'Cyber City, Tower B, 10th Floor',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'AEFPV5678K',
      aadhaarNumber: '2345-6789-0123',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Rajesh Verma',
      bankName: 'ICICI Bank',
      branchName: 'Cyber City Gurgaon',
      accountNumber: '002001234567890',
      ifscCode: 'ICIC0000020',
      isPrimary: true,
    },
    education: [
      {
        degree: 'CA (Chartered Accountant)',
        institutionName: 'ICAI',
        yearOfPassing: 1998,
        gradeOrPercentage: 'Rank 45',
      },
      {
        degree: 'MBA Finance',
        institutionName: 'IIM Ahmedabad',
        yearOfPassing: 2002,
        gradeOrPercentage: 'CGPA 8.5',
      },
    ],
    skills: [
      { skillName: 'Financial Planning & Analysis', proficiencyLevel: 'EXPERT' },
      { skillName: 'Risk Management', proficiencyLevel: 'EXPERT' },
      { skillName: 'Corporate Finance', proficiencyLevel: 'EXPERT' },
      { skillName: 'SAP ERP', proficiencyLevel: 'ADVANCED' },
    ],
    achievements: [
      {
        title: 'CFO of the Year 2022',
        description: 'Awarded by Finance Leadership Forum India',
        achievementDate: new Date('2022-11-10'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Sunita Verma',
        relationship: 'Spouse',
        phone: '+91-9876540003',
      },
    ],
  },

  {
    // 3. Finance Controller
    auth: {
      username: 'meera_singh',
      email: 'meera.singh@bisman.demo',
      password: 'Demo@123',
      role: 'FINANCE_CONTROLLER',
      is_active: true,
      productType: 'BUSINESS_ERP',
    },
    profile: {
      fullName: 'Meera Singh',
      employeeCode: 'BIS-FC-001',
      phone: '+91-9876541001',
      alternatePhone: '+91-9876541002',
      dateOfBirth: new Date('1985-03-12'),
      gender: 'FEMALE',
      bloodGroup: 'B+',
      fatherName: 'Jaswant Singh',
      motherName: 'Harpreet Kaur',
      maritalStatus: 'SINGLE',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'Flat 301, Green Park Apartments',
        line2: 'Sector 21',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201301',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Corporate Office',
        line2: 'Cyber City, Tower B, 9th Floor',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'BCDPS6789M',
      aadhaarNumber: '3456-7890-1234',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Meera Singh',
      bankName: 'Axis Bank',
      branchName: 'Noida Sector 18',
      accountNumber: '912010012345678',
      ifscCode: 'UTIB0000912',
      isPrimary: true,
    },
    education: [
      {
        degree: 'B.Com (Hons)',
        institutionName: 'Delhi University',
        yearOfPassing: 2006,
        gradeOrPercentage: '82%',
      },
      {
        degree: 'CA (Chartered Accountant)',
        institutionName: 'ICAI',
        yearOfPassing: 2010,
        gradeOrPercentage: 'Rank 120',
      },
    ],
    skills: [
      { skillName: 'Financial Accounting', proficiencyLevel: 'EXPERT' },
      { skillName: 'Budgeting & Forecasting', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Tally ERP', proficiencyLevel: 'EXPERT' },
      { skillName: 'GST Compliance', proficiencyLevel: 'ADVANCED' },
    ],
    achievements: [
      {
        title: 'Best Finance Professional 2021',
        description: 'Implemented automated financial reporting system',
        achievementDate: new Date('2021-09-01'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Jaswant Singh',
        relationship: 'Father',
        phone: '+91-9876541003',
      },
    ],
  },

  {
    // 4. Operations Manager
    auth: {
      username: 'vikram_reddy',
      email: 'vikram.reddy@bisman.demo',
      password: 'Demo@123',
      role: 'OPERATIONS_MANAGER',
      is_active: true,
      productType: 'PUMP_ERP',
    },
    profile: {
      fullName: 'Vikram Reddy',
      employeeCode: 'BIS-OPS-001',
      phone: '+91-9876542001',
      alternatePhone: '+91-9876542002',
      dateOfBirth: new Date('1982-11-25'),
      gender: 'MALE',
      bloodGroup: 'AB+',
      fatherName: 'Ravi Reddy',
      motherName: 'Lakshmi Reddy',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'Villa 12, Hyderabad Heights',
        line2: 'Banjara Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500034',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Regional Office',
        line2: 'HITEC City, Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500081',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'CRDPV7890N',
      aadhaarNumber: '4567-8901-2345',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Vikram Reddy',
      bankName: 'State Bank of India',
      branchName: 'Banjara Hills Hyderabad',
      accountNumber: '30123456789012',
      ifscCode: 'SBIN0001234',
      isPrimary: true,
    },
    education: [
      {
        degree: 'B.Tech Mechanical Engineering',
        institutionName: 'NIT Warangal',
        yearOfPassing: 2004,
        gradeOrPercentage: 'CGPA 8.2',
      },
      {
        degree: 'MBA Operations Management',
        institutionName: 'ISB Hyderabad',
        yearOfPassing: 2008,
        gradeOrPercentage: 'CGPA 3.6/4.0',
      },
    ],
    skills: [
      { skillName: 'Supply Chain Management', proficiencyLevel: 'EXPERT' },
      { skillName: 'Process Optimization', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Lean Six Sigma', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Project Management', proficiencyLevel: 'EXPERT' },
    ],
    achievements: [
      {
        title: 'Operations Excellence Award 2023',
        description: 'Reduced operational costs by 15% across 20 locations',
        achievementDate: new Date('2023-06-15'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Anitha Reddy',
        relationship: 'Spouse',
        phone: '+91-9876542003',
      },
    ],
  },

  {
    // 5. HR Manager
    auth: {
      username: 'priya_sharma',
      email: 'priya.sharma@bisman.demo',
      password: 'Demo@123',
      role: 'HR_MANAGER',
      is_active: true,
      productType: 'BUSINESS_ERP',
    },
    profile: {
      fullName: 'Priya Sharma',
      employeeCode: 'BIS-HR-001',
      phone: '+91-9876543001',
      alternatePhone: '+91-9876543002',
      dateOfBirth: new Date('1990-07-08'),
      gender: 'FEMALE',
      bloodGroup: 'O-',
      fatherName: 'Ashok Sharma',
      motherName: 'Rekha Sharma',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'B-45, Vasant Vihar',
        line2: 'Near Select Citywalk',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110057',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Corporate Office',
        line2: 'Cyber City, Tower B, 8th Floor',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'DSHPS8901P',
      aadhaarNumber: '5678-9012-3456',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Priya Sharma',
      bankName: 'HDFC Bank',
      branchName: 'Vasant Vihar Delhi',
      accountNumber: '50200123456789',
      ifscCode: 'HDFC0002345',
      isPrimary: true,
    },
    education: [
      {
        degree: 'MBA HR Management',
        institutionName: 'XLRI Jamshedpur',
        yearOfPassing: 2012,
        gradeOrPercentage: 'CGPA 3.8/4.0',
      },
      {
        degree: 'BA Psychology',
        institutionName: 'Miranda House, Delhi University',
        yearOfPassing: 2010,
        gradeOrPercentage: '85%',
      },
    ],
    skills: [
      { skillName: 'Talent Acquisition', proficiencyLevel: 'EXPERT' },
      { skillName: 'Employee Relations', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Performance Management', proficiencyLevel: 'ADVANCED' },
      { skillName: 'HR Analytics', proficiencyLevel: 'INTERMEDIATE' },
    ],
    achievements: [
      {
        title: 'Best HR Initiative 2022',
        description: 'Launched employee wellness program reducing attrition by 20%',
        achievementDate: new Date('2022-03-15'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Rahul Sharma',
        relationship: 'Spouse',
        phone: '+91-9876543003',
      },
    ],
  },

  {
    // 6. Procurement Officer
    auth: {
      username: 'amit_patel',
      email: 'amit.patel@bisman.demo',
      password: 'Demo@123',
      role: 'PROCUREMENT_OFFICER',
      is_active: true,
      productType: 'PUMP_ERP',
    },
    profile: {
      fullName: 'Amit Patel',
      employeeCode: 'BIS-PRO-001',
      phone: '+91-9876544001',
      alternatePhone: '+91-9876544002',
      dateOfBirth: new Date('1987-01-18'),
      gender: 'MALE',
      bloodGroup: 'B-',
      fatherName: 'Ramesh Patel',
      motherName: 'Savita Patel',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'C-102, Patel Nagar',
        line2: 'Satellite Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '380015',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Procurement Center',
        line2: 'SG Highway, Bodakdev',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '380054',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'EPAPP9012Q',
      aadhaarNumber: '6789-0123-4567',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Amit Patel',
      bankName: 'Bank of Baroda',
      branchName: 'Satellite Ahmedabad',
      accountNumber: '12340123456789',
      ifscCode: 'BARB0SATELL',
      isPrimary: true,
    },
    education: [
      {
        degree: 'B.E. Industrial Engineering',
        institutionName: 'LD College of Engineering',
        yearOfPassing: 2009,
        gradeOrPercentage: '78%',
      },
      {
        degree: 'Diploma in Supply Chain Management',
        institutionName: 'Indian Institute of Materials Management',
        yearOfPassing: 2012,
        gradeOrPercentage: 'Distinction',
      },
    ],
    skills: [
      { skillName: 'Vendor Management', proficiencyLevel: 'EXPERT' },
      { skillName: 'Contract Negotiation', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Procurement Analytics', proficiencyLevel: 'INTERMEDIATE' },
      { skillName: 'ERP Systems', proficiencyLevel: 'ADVANCED' },
    ],
    achievements: [
      {
        title: 'Cost Savings Champion 2023',
        description: 'Negotiated contracts saving ₹50 lakhs annually',
        achievementDate: new Date('2023-08-10'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Neha Patel',
        relationship: 'Spouse',
        phone: '+91-9876544003',
      },
    ],
  },

  {
    // 7. Store Incharge
    auth: {
      username: 'suresh_yadav',
      email: 'suresh.yadav@bisman.demo',
      password: 'Demo@123',
      role: 'STORE_INCHARGE',
      is_active: true,
      productType: 'PUMP_ERP',
    },
    profile: {
      fullName: 'Suresh Yadav',
      employeeCode: 'BIS-ST-001',
      phone: '+91-9876545001',
      alternatePhone: '+91-9876545002',
      dateOfBirth: new Date('1992-09-30'),
      gender: 'MALE',
      bloodGroup: 'A-',
      fatherName: 'Ram Prakash Yadav',
      motherName: 'Sushila Devi',
      maritalStatus: 'SINGLE',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'Ward 12, Krishna Nagar',
        line2: 'Near Railway Station',
        city: 'Jaipur',
        state: 'Rajasthan',
        postalCode: '302006',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Warehouse',
        line2: 'RIICO Industrial Area, Sitapura',
        city: 'Jaipur',
        state: 'Rajasthan',
        postalCode: '302022',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'FYDPS0123R',
      aadhaarNumber: '7890-1234-5678',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Suresh Yadav',
      bankName: 'Punjab National Bank',
      branchName: 'MI Road Jaipur',
      accountNumber: '1234567890123456',
      ifscCode: 'PUNB0123400',
      isPrimary: true,
    },
    education: [
      {
        degree: 'B.Sc.',
        institutionName: 'Rajasthan University',
        yearOfPassing: 2013,
        gradeOrPercentage: '68%',
      },
    ],
    skills: [
      { skillName: 'Inventory Control', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Warehouse Management', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Stock Auditing', proficiencyLevel: 'INTERMEDIATE' },
    ],
    achievements: [
      {
        title: 'Zero Discrepancy Award 2023',
        description: 'Maintained 100% inventory accuracy for 12 months',
        achievementDate: new Date('2023-12-31'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Ram Prakash Yadav',
        relationship: 'Father',
        phone: '+91-9876545003',
      },
    ],
  },

  {
    // 8. Compliance Officer
    auth: {
      username: 'kavita_iyer',
      email: 'kavita.iyer@bisman.demo',
      password: 'Demo@123',
      role: 'COMPLIANCE_OFFICER',
      is_active: true,
      productType: 'BUSINESS_ERP',
    },
    profile: {
      fullName: 'Kavita Iyer',
      employeeCode: 'BIS-CO-001',
      phone: '+91-9876546001',
      alternatePhone: '+91-9876546002',
      dateOfBirth: new Date('1986-04-22'),
      gender: 'FEMALE',
      bloodGroup: 'O+',
      fatherName: 'Venkatesh Iyer',
      motherName: 'Lalitha Iyer',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'Flat 701, Prestige Towers',
        line2: 'Indiranagar',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman South Zone Office',
        line2: 'Brigade Road, MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'GIYPS1234S',
      aadhaarNumber: '8901-2345-6789',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Kavita Iyer',
      bankName: 'ICICI Bank',
      branchName: 'Indiranagar Bangalore',
      accountNumber: '002101234567890',
      ifscCode: 'ICIC0000021',
      isPrimary: true,
    },
    education: [
      {
        degree: 'LLB',
        institutionName: 'Bangalore University',
        yearOfPassing: 2008,
        gradeOrPercentage: '72%',
      },
      {
        degree: 'Diploma in Corporate Law',
        institutionName: 'National Law School, Bangalore',
        yearOfPassing: 2010,
        gradeOrPercentage: 'Distinction',
      },
    ],
    skills: [
      { skillName: 'Regulatory Compliance', proficiencyLevel: 'EXPERT' },
      { skillName: 'Risk Assessment', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Legal Documentation', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Audit Management', proficiencyLevel: 'INTERMEDIATE' },
    ],
    achievements: [
      {
        title: 'Compliance Excellence 2022',
        description: 'Zero regulatory violations across all audits',
        achievementDate: new Date('2022-12-01'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Aditya Iyer',
        relationship: 'Spouse',
        phone: '+91-9876546003',
      },
    ],
  },

  {
    // 9. Legal Head
    auth: {
      username: 'deepak_mishra',
      email: 'deepak.mishra@bisman.demo',
      password: 'Demo@123',
      role: 'LEGAL_HEAD',
      is_active: true,
      productType: 'BUSINESS_ERP',
    },
    profile: {
      fullName: 'Deepak Mishra',
      employeeCode: 'BIS-LEG-001',
      phone: '+91-9876547001',
      alternatePhone: '+91-9876547002',
      dateOfBirth: new Date('1978-12-05'),
      gender: 'MALE',
      bloodGroup: 'AB-',
      fatherName: 'Om Prakash Mishra',
      motherName: 'Saraswati Mishra',
      maritalStatus: 'MARRIED',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'Bungalow 23, Judicial Colony',
        line2: 'Civil Lines',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        postalCode: '226001',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Corporate Office',
        line2: 'Cyber City, Tower B, 11th Floor',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'HMIPS2345T',
      aadhaarNumber: '9012-3456-7890',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Deepak Mishra',
      bankName: 'State Bank of India',
      branchName: 'Hazratganj Lucknow',
      accountNumber: '10123456789012',
      ifscCode: 'SBIN0005678',
      isPrimary: true,
    },
    education: [
      {
        degree: 'LLB',
        institutionName: 'Lucknow University',
        yearOfPassing: 2000,
        gradeOrPercentage: '78%',
      },
      {
        degree: 'LLM Corporate Law',
        institutionName: 'Delhi University',
        yearOfPassing: 2002,
        gradeOrPercentage: '82%',
      },
    ],
    skills: [
      { skillName: 'Corporate Litigation', proficiencyLevel: 'EXPERT' },
      { skillName: 'Contract Drafting', proficiencyLevel: 'EXPERT' },
      { skillName: 'Mergers & Acquisitions', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Intellectual Property Law', proficiencyLevel: 'ADVANCED' },
    ],
    achievements: [
      {
        title: 'Legal Excellence Award 2021',
        description: 'Successfully defended 15 high-value corporate cases',
        achievementDate: new Date('2021-10-15'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Anita Mishra',
        relationship: 'Spouse',
        phone: '+91-9876547003',
      },
    ],
  },

  {
    // 10. Accounts Payable
    auth: {
      username: 'rohit_desai',
      email: 'rohit.desai@bisman.demo',
      password: 'Demo@123',
      role: 'ACCOUNTS_PAYABLE',
      is_active: true,
      productType: 'BUSINESS_ERP',
    },
    profile: {
      fullName: 'Rohit Desai',
      employeeCode: 'BIS-AP-001',
      phone: '+91-9876548001',
      alternatePhone: '+91-9876548002',
      dateOfBirth: new Date('1994-06-14'),
      gender: 'MALE',
      bloodGroup: 'B+',
      fatherName: 'Mahesh Desai',
      motherName: 'Varsha Desai',
      maritalStatus: 'SINGLE',
    },
    addresses: [
      {
        type: 'PERMANENT',
        line1: 'D-304, Shivaji Park',
        line2: 'Dadar West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400028',
        country: 'India',
        isDefault: true,
      },
      {
        type: 'OFFICE',
        line1: 'Bisman Finance Center',
        line2: 'BKC, G Block, 5th Floor',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400051',
        country: 'India',
        isDefault: false,
      },
    ],
    kyc: {
      panNumber: 'JDEPS3456U',
      aadhaarNumber: '0123-4567-8901',
      kycStatus: 'VERIFIED',
    },
    bankAccount: {
      accountHolderName: 'Rohit Desai',
      bankName: 'HDFC Bank',
      branchName: 'Dadar Mumbai',
      accountNumber: '50300123456789',
      ifscCode: 'HDFC0003456',
      isPrimary: true,
    },
    education: [
      {
        degree: 'B.Com',
        institutionName: 'Mumbai University',
        yearOfPassing: 2015,
        gradeOrPercentage: '70%',
      },
    ],
    skills: [
      { skillName: 'Accounts Payable Management', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Invoice Processing', proficiencyLevel: 'EXPERT' },
      { skillName: 'Vendor Reconciliation', proficiencyLevel: 'ADVANCED' },
      { skillName: 'Tally & QuickBooks', proficiencyLevel: 'INTERMEDIATE' },
    ],
    achievements: [
      {
        title: 'Process Efficiency Award 2023',
        description: 'Reduced invoice processing time by 40%',
        achievementDate: new Date('2023-07-20'),
      },
    ],
    emergencyContacts: [
      {
        name: 'Mahesh Desai',
        relationship: 'Father',
        phone: '+91-9876548003',
      },
    ],
  },
];

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Get existing super admin and client for tenant association
  const superAdmin = await prisma.superAdmin.findFirst({
    orderBy: { id: 'asc' }
  });

  if (!superAdmin) {
    console.error('❌ Super Admin not found! Please ensure the database has a super admin.');
    return;
  }

  const client = await prisma.client.findFirst({
    where: { super_admin_id: superAdmin.id },
  });

  if (!client) {
    console.error('❌ No client found! Please create a client first.');
    return;
  }

  console.log(`✅ Using Super Admin: ${superAdmin.email}`);
  console.log(`✅ Using Client: ${client.name} (${client.id})`);

  // Create a sample branch for user-branch assignments
  const branch = await prisma.branch.upsert({
    where: { branchCode: 'BIS-HQ-001' },
    update: {},
    create: {
      tenantId: client.id,
      branchCode: 'BIS-HQ-001',
      branchName: 'Bisman Headquarters',
      addressLine1: 'Cyber City, Tower B',
      addressLine2: '10th Floor',
      city: 'Gurgaon',
      state: 'Haryana',
      postalCode: '122002',
      country: 'India',
      isActive: true,
    },
  });

  console.log(`✅ Branch created: ${branch.branchName}`);

  // Create each demo user with complete profile
  for (const userData of demoUsers) {
    console.log(`\n📝 Creating user: ${userData.profile.fullName} (${userData.auth.role})`);

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.auth.password, 10);

      // Upsert user
      const user = await prisma.user.upsert({
        where: { email: userData.auth.email },
        update: {
          is_active: userData.auth.is_active,
          role: userData.auth.role,
        },
        create: {
          username: userData.auth.username,
          email: userData.auth.email,
          password: hashedPassword,
          role: userData.auth.role,
          is_active: userData.auth.is_active,
          productType: userData.auth.productType,
          tenant_id: client.id,
          super_admin_id: superAdmin.id,
        },
      });

      console.log(`  ✅ User created: ${user.email}`);

      // Create profile
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: userData.profile,
        create: {
          userId: user.id,
          ...userData.profile,
        },
      });
      console.log(`    ✅ Profile created`);

      // Create addresses
      for (const addressData of userData.addresses) {
        await prisma.userAddress.upsert({
          where: {
            id: (await prisma.userAddress.findFirst({
              where: { userId: user.id, type: addressData.type },
            }))?.id || 0,
          },
          update: addressData,
          create: {
            userId: user.id,
            ...addressData,
          },
        });
      }
      console.log(`    ✅ ${userData.addresses.length} addresses created`);

      // Create KYC
      await prisma.userKYC.upsert({
        where: { userId: user.id },
        update: userData.kyc,
        create: {
          userId: user.id,
          ...userData.kyc,
        },
      });
      console.log(`    ✅ KYC created`);

      // Create bank account
      await prisma.userBankAccount.upsert({
        where: {
          id: (await prisma.userBankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          }))?.id || 0,
        },
        update: userData.bankAccount,
        create: {
          userId: user.id,
          ...userData.bankAccount,
        },
      });
      console.log(`    ✅ Bank account created`);

      // Create education records
      for (const eduData of userData.education) {
        await prisma.userEducation.create({
          data: {
            userId: user.id,
            ...eduData,
          },
        });
      }
      console.log(`    ✅ ${userData.education.length} education records created`);

      // Create skills
      for (const skillData of userData.skills) {
        await prisma.userSkill.upsert({
          where: {
            id: (await prisma.userSkill.findFirst({
              where: { userId: user.id, skillName: skillData.skillName },
            }))?.id || 0,
          },
          update: skillData,
          create: {
            userId: user.id,
            ...skillData,
          },
        });
      }
      console.log(`    ✅ ${userData.skills.length} skills created`);

      // Create achievements
      for (const achievementData of userData.achievements) {
        await prisma.userAchievement.create({
          data: {
            userId: user.id,
            ...achievementData,
          },
        });
      }
      console.log(`    ✅ ${userData.achievements.length} achievements created`);

      // Create emergency contacts
      for (const contactData of userData.emergencyContacts) {
        await prisma.userEmergencyContact.upsert({
          where: {
            id: (await prisma.userEmergencyContact.findFirst({
              where: { userId: user.id, phone: contactData.phone },
            }))?.id || 0,
          },
          update: contactData,
          create: {
            userId: user.id,
            ...contactData,
          },
        });
      }
      console.log(`    ✅ ${userData.emergencyContacts.length} emergency contacts created`);

      // Assign to branch
      await prisma.userBranch.upsert({
        where: {
          userId_branchId: {
            userId: user.id,
            branchId: branch.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
        },
      });
      console.log(`    ✅ Branch assigned`);

      console.log(`✅ Completed: ${userData.profile.fullName}`);
    } catch (error) {
      console.error(`❌ Error creating ${userData.profile.fullName}:`, error);
    }
  }

  console.log('\n\n🎉 Comprehensive seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${demoUsers.length} demo users created`);
  console.log(`  - Each with: profile, addresses, KYC, bank account, education, skills, achievements, emergency contacts`);
  console.log(`  - All assigned to branch: ${branch.branchName}`);
  console.log('\n🔐 All demo users have password: Demo@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
