const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fullSetup() {
  try {
    console.log('\n🚀 FULL SETUP - Creating Demo Users with Complete Profiles\n');
    console.log('='.repeat(80) + '\n');

    // Check if client exists
    let client = await prisma.client.findFirst();
    
    if (!client) {
      console.log('No client found. Creating base records...\n');
      
      // Create Enterprise Admin
      console.log('Creating Enterprise Admin...');
      const enterpriseAdmin = await prisma.enterpriseAdmin.create({
        data: {
          name: 'Enterprise Admin',
          email: 'admin@bisman.erp',
          password: await bcrypt.hash('admin123', 10),
          is_active: true,
        }
      });
      console.log('✅ Enterprise Admin created');
      
      // Create Super Admin
      console.log('Creating Super Admin...');
      const superAdmin = await prisma.superAdmin.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin@bisman.demo',
          password: await bcrypt.hash('Super@123', 10),
          created_by: enterpriseAdmin.id,
          is_active: true,
        }
      });
      console.log('✅ Super Admin created');
      
      // Create Client
      console.log('Creating Client...');
      client = await prisma.client.create({
        data: {
          name: 'Demo Company',
          email: 'demo@bisman.com',
          password: await bcrypt.hash('demo123', 10),
          super_admin_id: superAdmin.id,
          is_active: true,
        }
      });
      console.log('✅ Client created\n');
    } else {
      console.log(`✅ Using existing client: ${client.name}\n`);
    }

    // Create or get branch
    let branch = await prisma.branch.findFirst({
      where: { tenantId: client.id }
    });
    
    if (!branch) {
      console.log('Creating Headquarters Branch...');
      branch = await prisma.branch.create({
        data: {
          branchCode: 'HQ-001',
          branchName: 'Bisman Headquarters',
          branchType: 'HQ',
          addressLine1: 'DLF Cyber City, Gurgaon, Haryana',
          city: 'Gurgaon',
          state: 'Haryana',
          postalCode: '122002',
          country: 'India',
          tenantId: client.id,
          isActive: true,
        }
      });
      console.log('✅ Branch created\n');
    }

    // Complete demo users with FULL profile data
    const demoUsersData = [
      {
        auth: {
          username: 'rajesh_verma',
          email: 'rajesh.verma@bisman.demo',
          role: 'CFO',
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
            line2: 'DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122002',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'ABCPV1234F',
          aadhaarNumber: '1234-5678-9011',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Rajesh Verma',
          bankName: 'ICICI Bank',
          branchName: 'Gurgaon DLF Phase 2',
          accountNumber: '012345678901',
          ifscCode: 'ICIC0001234',
          isPrimary: true,
        },
        education: [
          {
            degree: 'MBA Finance',
            institutionName: 'IIM Ahmedabad',
            yearOfPassing: 2000,
            gradeOrPercentage: 'A Grade',
          }
        ],
        skills: [
          { skillName: 'Financial Planning', proficiencyLevel: 'EXPERT' },
          { skillName: 'Budget Management', proficiencyLevel: 'EXPERT' },
          { skillName: 'SAP FI/CO', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'Best CFO Award 2022',
            description: 'Recognized for financial optimization and cost reduction',
            achievementDate: new Date('2022-12-31'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Neha Verma',
            relationship: 'Spouse',
            phone: '+91-9876540003',
          }
        ],
      },
      {
        auth: {
          username: 'meera_singh',
          email: 'meera.singh@bisman.demo',
          role: 'FINANCE_CONTROLLER',
        },
        profile: {
          fullName: 'Meera Singh',
          employeeCode: 'BIS-FC-001',
          phone: '+91-9876541001',
          alternatePhone: '+91-9876541002',
          dateOfBirth: new Date('1985-05-15'),
          gender: 'FEMALE',
          bloodGroup: 'B+',
          fatherName: 'Harpal Singh',
          motherName: 'Gurpreet Kaur',
          maritalStatus: 'MARRIED',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'House 45, Sector 56',
            line2: 'Sohna Road',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122011',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Finance Wing',
            line2: 'DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122002',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'BCDMS5678K',
          aadhaarNumber: '2345-6789-0123',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Meera Singh',
          bankName: 'HDFC Bank',
          branchName: 'Gurgaon Sector 56',
          accountNumber: '50100234567890',
          ifscCode: 'HDFC0002345',
          isPrimary: true,
        },
        education: [
          {
            degree: 'CA (Chartered Accountant)',
            institutionName: 'ICAI',
            yearOfPassing: 2008,
            gradeOrPercentage: 'All India Rank 45',
          }
        ],
        skills: [
          { skillName: 'Financial Reporting', proficiencyLevel: 'EXPERT' },
          { skillName: 'Tally ERP', proficiencyLevel: 'EXPERT' },
          { skillName: 'GST Compliance', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'Zero Audit Findings 2023',
            description: 'Maintained error-free financial records',
            achievementDate: new Date('2023-12-31'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Rajveer Singh',
            relationship: 'Spouse',
            phone: '+91-9876541003',
          }
        ],
      },
      {
        auth: {
          username: 'vikram_reddy',
          email: 'vikram.reddy@bisman.demo',
          role: 'OPERATIONS_MANAGER',
        },
        profile: {
          fullName: 'Vikram Reddy',
          employeeCode: 'BIS-OPS-001',
          phone: '+91-9876542001',
          alternatePhone: '+91-9876542002',
          dateOfBirth: new Date('1988-11-10'),
          gender: 'MALE',
          bloodGroup: 'O+',
          fatherName: 'Ramesh Reddy',
          motherName: 'Lakshmi Reddy',
          maritalStatus: 'SINGLE',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Villa 12, Palm Springs',
            line2: 'Golf Course Extension Road',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122018',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Operations Center',
            line2: 'NH-8, Manesar',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122050',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'CDEVR9012M',
          aadhaarNumber: '3456-7890-1234',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Vikram Reddy',
          bankName: 'Axis Bank',
          branchName: 'Gurgaon Golf Course Road',
          accountNumber: '917020012345678',
          ifscCode: 'UTIB0003456',
          isPrimary: true,
        },
        education: [
          {
            degree: 'MBA Operations',
            institutionName: 'XLRI Jamshedpur',
            yearOfPassing: 2012,
            gradeOrPercentage: 'A+ Grade',
          }
        ],
        skills: [
          { skillName: 'Supply Chain Management', proficiencyLevel: 'EXPERT' },
          { skillName: 'Logistics Optimization', proficiencyLevel: 'ADVANCED' },
          { skillName: 'SAP MM', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'Operational Excellence Award',
            description: 'Reduced operational costs by 18%',
            achievementDate: new Date('2023-06-30'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Ramesh Reddy',
            relationship: 'Father',
            phone: '+91-9876542003',
          }
        ],
      },
      {
        auth: {
          username: 'arun_kumar',
          email: 'arun.kumar@bisman.demo',
          role: 'HUB_INCHARGE',
        },
        profile: {
          fullName: 'Arun Kumar',
          employeeCode: 'BIS-HUB-001',
          phone: '+91-9876543210',
          alternatePhone: '+91-9876543211',
          dateOfBirth: new Date('1990-03-25'),
          gender: 'MALE',
          bloodGroup: 'AB+',
          fatherName: 'Suresh Kumar',
          motherName: 'Savita Devi',
          maritalStatus: 'MARRIED',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Plot 89, Sector 45',
            line2: 'Near Metro Station',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122003',
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
          }
        ],
        kyc: {
          panNumber: 'ABCPK1234D',
          aadhaarNumber: '4567-8901-2345',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Arun Kumar',
          bankName: 'HDFC Bank',
          branchName: 'Gurgaon Sector 14',
          accountNumber: '50100345678901',
          ifscCode: 'HDFC0004567',
          isPrimary: true,
        },
        education: [
          {
            degree: 'B.Com',
            institutionName: 'Delhi University',
            yearOfPassing: 2010,
            gradeOrPercentage: '75%',
          }
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
          }
        ],
        emergencyContacts: [
          {
            name: 'Priya Kumar',
            relationship: 'Spouse',
            phone: '+91-9876543212',
          }
        ],
      },
      {
        auth: {
          username: 'priya_sharma',
          email: 'priya.sharma@bisman.demo',
          role: 'HR_MANAGER',
        },
        profile: {
          fullName: 'Priya Sharma',
          employeeCode: 'BIS-HR-001',
          phone: '+91-9876543001',
          alternatePhone: '+91-9876543002',
          dateOfBirth: new Date('1987-07-12'),
          gender: 'FEMALE',
          bloodGroup: 'A-',
          fatherName: 'Rajendra Sharma',
          motherName: 'Sunita Sharma',
          maritalStatus: 'SINGLE',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Flat 304, Emerald Heights',
            line2: 'MG Road',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122001',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman HR Department',
            line2: 'DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122002',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'DEFPS3456L',
          aadhaarNumber: '5678-9012-3456',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Priya Sharma',
          bankName: 'SBI',
          branchName: 'Gurgaon MG Road',
          accountNumber: '30123456789012',
          ifscCode: 'SBIN0005678',
          isPrimary: true,
        },
        education: [
          {
            degree: 'MBA HR',
            institutionName: 'Symbiosis Pune',
            yearOfPassing: 2010,
            gradeOrPercentage: 'Distinction',
          }
        ],
        skills: [
          { skillName: 'Talent Acquisition', proficiencyLevel: 'EXPERT' },
          { skillName: 'Employee Relations', proficiencyLevel: 'ADVANCED' },
          { skillName: 'Performance Management', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'HR Excellence Award',
            description: 'Reduced attrition by 25%',
            achievementDate: new Date('2023-09-30'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Rajendra Sharma',
            relationship: 'Father',
            phone: '+91-9876543003',
          }
        ],
      },
      {
        auth: {
          username: 'amit_patel',
          email: 'amit.patel@bisman.demo',
          role: 'PROCUREMENT_OFFICER',
        },
        profile: {
          fullName: 'Amit Patel',
          employeeCode: 'BIS-PRO-001',
          phone: '+91-9876544001',
          alternatePhone: '+91-9876544002',
          dateOfBirth: new Date('1989-09-18'),
          gender: 'MALE',
          bloodGroup: 'B-',
          fatherName: 'Ramesh Patel',
          motherName: 'Asha Patel',
          maritalStatus: 'MARRIED',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'House 67, Sushant Lok',
            line2: 'Phase 2',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122009',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Procurement Wing',
            line2: 'Udyog Vihar Phase 4',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122016',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'FGHPA7890N',
          aadhaarNumber: '6789-0123-4567',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Amit Patel',
          bankName: 'Kotak Mahindra Bank',
          branchName: 'Gurgaon Sushant Lok',
          accountNumber: '2311234567890',
          ifscCode: 'KKBK0006789',
          isPrimary: true,
        },
        education: [
          {
            degree: 'B.Tech Mechanical',
            institutionName: 'NIT Surat',
            yearOfPassing: 2011,
            gradeOrPercentage: '8.2 CGPA',
          }
        ],
        skills: [
          { skillName: 'Vendor Management', proficiencyLevel: 'EXPERT' },
          { skillName: 'Contract Negotiation', proficiencyLevel: 'ADVANCED' },
          { skillName: 'SAP MM', proficiencyLevel: 'INTERMEDIATE' },
        ],
        achievements: [
          {
            title: 'Cost Saver Award',
            description: 'Negotiated contracts saving ₹50L annually',
            achievementDate: new Date('2023-08-15'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Nisha Patel',
            relationship: 'Spouse',
            phone: '+91-9876544003',
          }
        ],
      },
      {
        auth: {
          username: 'suresh_yadav',
          email: 'suresh.yadav@bisman.demo',
          role: 'STORE_INCHARGE',
        },
        profile: {
          fullName: 'Suresh Yadav',
          employeeCode: 'BIS-ST-001',
          phone: '+91-9876545001',
          alternatePhone: '+91-9876545002',
          dateOfBirth: new Date('1992-01-30'),
          gender: 'MALE',
          bloodGroup: 'O-',
          fatherName: 'Ramnath Yadav',
          motherName: 'Radha Devi',
          maritalStatus: 'SINGLE',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Village Khandsa',
            line2: 'Near Old Railway Station',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122001',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Central Warehouse',
            line2: 'Industrial Area, Manesar',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122050',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'HIJSY2345P',
          aadhaarNumber: '7890-1234-5678',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Suresh Yadav',
          bankName: 'Punjab National Bank',
          branchName: 'Gurgaon Khandsa',
          accountNumber: '1234567890123456',
          ifscCode: 'PUNB0078901',
          isPrimary: true,
        },
        education: [
          {
            degree: 'B.Sc',
            institutionName: 'MDU Rohtak',
            yearOfPassing: 2012,
            gradeOrPercentage: '68%',
          }
        ],
        skills: [
          { skillName: 'Inventory Control', proficiencyLevel: 'ADVANCED' },
          { skillName: 'Warehouse Management', proficiencyLevel: 'ADVANCED' },
          { skillName: 'Stock Auditing', proficiencyLevel: 'INTERMEDIATE' },
        ],
        achievements: [
          {
            title: 'Zero Stock Variance Award',
            description: 'Maintained 100% inventory accuracy for 6 months',
            achievementDate: new Date('2023-11-30'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Ramnath Yadav',
            relationship: 'Father',
            phone: '+91-9876545003',
          }
        ],
      },
      {
        auth: {
          username: 'kavita_iyer',
          email: 'kavita.iyer@bisman.demo',
          role: 'COMPLIANCE_OFFICER',
        },
        profile: {
          fullName: 'Kavita Iyer',
          employeeCode: 'BIS-CO-001',
          phone: '+91-9876546001',
          alternatePhone: '+91-9876546002',
          dateOfBirth: new Date('1986-04-22'),
          gender: 'FEMALE',
          bloodGroup: 'A+',
          fatherName: 'Ramakrishnan Iyer',
          motherName: 'Lakshmi Iyer',
          maritalStatus: 'MARRIED',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Apartment 802, South City 2',
            line2: 'Sohna Road',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122018',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Legal & Compliance',
            line2: 'DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122002',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'KLMKI6789Q',
          aadhaarNumber: '8901-2345-6789',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Kavita Iyer',
          bankName: 'ICICI Bank',
          branchName: 'Gurgaon South City',
          accountNumber: '012389012345678',
          ifscCode: 'ICIC0008901',
          isPrimary: true,
        },
        education: [
          {
            degree: 'LLB',
            institutionName: 'Delhi University',
            yearOfPassing: 2008,
            gradeOrPercentage: '72%',
          }
        ],
        skills: [
          { skillName: 'Regulatory Compliance', proficiencyLevel: 'EXPERT' },
          { skillName: 'Legal Documentation', proficiencyLevel: 'ADVANCED' },
          { skillName: 'Audit Management', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'Zero Compliance Violations',
            description: 'Maintained 100% compliance for fiscal year',
            achievementDate: new Date('2023-03-31'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Srinivasan Iyer',
            relationship: 'Spouse',
            phone: '+91-9876546003',
          }
        ],
      },
      {
        auth: {
          username: 'deepak_mishra',
          email: 'deepak.mishra@bisman.demo',
          role: 'LEGAL_HEAD',
        },
        profile: {
          fullName: 'Deepak Mishra',
          employeeCode: 'BIS-LEG-001',
          phone: '+91-9876547001',
          alternatePhone: '+91-9876547002',
          dateOfBirth: new Date('1983-12-08'),
          gender: 'MALE',
          bloodGroup: 'B+',
          fatherName: 'Prakash Mishra',
          motherName: 'Kiran Mishra',
          maritalStatus: 'MARRIED',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Penthouse 1201, Hamilton Court',
            line2: 'DLF Phase 4',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122009',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Legal Department',
            line2: 'DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122002',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'NOPDM1234R',
          aadhaarNumber: '9012-3456-7890',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Deepak Mishra',
          bankName: 'HDFC Bank',
          branchName: 'Gurgaon DLF Phase 4',
          accountNumber: '50109012345678',
          ifscCode: 'HDFC0009012',
          isPrimary: true,
        },
        education: [
          {
            degree: 'LLM (Corporate Law)',
            institutionName: 'National Law School Bangalore',
            yearOfPassing: 2007,
            gradeOrPercentage: 'Gold Medalist',
          }
        ],
        skills: [
          { skillName: 'Corporate Law', proficiencyLevel: 'EXPERT' },
          { skillName: 'Contract Drafting', proficiencyLevel: 'EXPERT' },
          { skillName: 'Litigation Management', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'Won Landmark Case',
            description: 'Successfully defended company in major litigation',
            achievementDate: new Date('2023-07-20'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Anjali Mishra',
            relationship: 'Spouse',
            phone: '+91-9876547003',
          }
        ],
      },
      {
        auth: {
          username: 'rohit_desai',
          email: 'rohit.desai@bisman.demo',
          role: 'ACCOUNTS_PAYABLE',
        },
        profile: {
          fullName: 'Rohit Desai',
          employeeCode: 'BIS-AP-001',
          phone: '+91-9876548001',
          alternatePhone: '+91-9876548002',
          dateOfBirth: new Date('1991-06-14'),
          gender: 'MALE',
          bloodGroup: 'AB-',
          fatherName: 'Mahesh Desai',
          motherName: 'Sujata Desai',
          maritalStatus: 'SINGLE',
        },
        addresses: [
          {
            type: 'PERMANENT',
            line1: 'Flat 205, Orchid Gardens',
            line2: 'Sector 54',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122003',
            country: 'India',
            isDefault: true,
          },
          {
            type: 'OFFICE',
            line1: 'Bisman Accounts Department',
            line2: 'DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            postalCode: '122002',
            country: 'India',
            isDefault: false,
          }
        ],
        kyc: {
          panNumber: 'QRSRD5678S',
          aadhaarNumber: '0123-4567-8901',
          kycStatus: 'VERIFIED',
        },
        bankAccount: {
          accountHolderName: 'Rohit Desai',
          bankName: 'Axis Bank',
          branchName: 'Gurgaon Sector 54',
          accountNumber: '917010123456789',
          ifscCode: 'UTIB0000123',
          isPrimary: true,
        },
        education: [
          {
            degree: 'B.Com (Hons)',
            institutionName: 'St. Stephens College Delhi',
            yearOfPassing: 2013,
            gradeOrPercentage: '82%',
          }
        ],
        skills: [
          { skillName: 'Accounts Payable Management', proficiencyLevel: 'EXPERT' },
          { skillName: 'Tally ERP', proficiencyLevel: 'ADVANCED' },
          { skillName: 'Excel Advanced', proficiencyLevel: 'ADVANCED' },
        ],
        achievements: [
          {
            title: 'Fastest Payment Processor',
            description: 'Processed 500+ invoices with 100% accuracy',
            achievementDate: new Date('2023-10-31'),
          }
        ],
        emergencyContacts: [
          {
            name: 'Mahesh Desai',
            relationship: 'Father',
            phone: '+91-9876548003',
          }
        ],
      },
    ];

    console.log('Creating 10 Demo Users with Complete Profiles...\n');
    
    const password = await bcrypt.hash('Demo@123', 10);
    
    for (const userData of demoUsersData) {
      // Create user
      const user = await prisma.user.upsert({
        where: { email: userData.auth.email },
        update: {},
        create: {
          username: userData.auth.username,
          email: userData.auth.email,
          password: password,
          role: userData.auth.role,
          is_active: true,
          productType: 'BUSINESS_ERP',
          tenant_id: client.id,
        }
      });

      // Create profile
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          ...userData.profile,
        }
      });

      // Create addresses
      for (const address of userData.addresses) {
        await prisma.userAddress.create({
          data: {
            userId: user.id,
            ...address,
          }
        });
      }

      // Create KYC
      await prisma.userKYC.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          ...userData.kyc,
        }
      });

      // Create bank account
      await prisma.userBankAccount.create({
        data: {
          userId: user.id,
          ...userData.bankAccount,
        }
      });

      // Create education records
      for (const edu of userData.education) {
        await prisma.userEducation.create({
          data: {
            userId: user.id,
            ...edu,
          }
        });
      }

      // Create skills
      for (const skill of userData.skills) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            ...skill,
          }
        });
      }

      // Create achievements
      for (const achievement of userData.achievements) {
        await prisma.userAchievement.create({
          data: {
            userId: user.id,
            ...achievement,
          }
        });
      }

      // Create emergency contacts
      for (const contact of userData.emergencyContacts) {
        await prisma.userEmergencyContact.create({
          data: {
            userId: user.id,
            ...contact,
          }
        });
      }

      // Assign to branch
      await prisma.userBranch.upsert({
        where: {
          userId_branchId: {
            userId: user.id,
            branchId: branch.id,
          }
        },
        update: {},
        create: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
        }
      });

      console.log(`  ✅ ${userData.profile.fullName} (${userData.auth.email})`);
      console.log(`     - Profile, 2 Addresses, KYC, Bank, Education, Skills, Achievements, Emergency Contacts`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 COMPLETE SETUP SUCCESSFUL!\n');
    console.log('📊 Created:');
    console.log(`  - Client: ${client.name}`);
    console.log(`  - Branch: ${branch.branchName}`);
    console.log(`  - 10 Demo users with FULL profiles`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`  All Demo Users: [any @bisman.demo email] / Demo@123\n`);
    console.log(`\n✅ Each user has:`);
    console.log(`  - Profile (personal details)`);
    console.log(`  - 2 Addresses (permanent + office)`);
    console.log(`  - KYC (PAN + Aadhaar)`);
    console.log(`  - Bank Account`);
    console.log(`  - Education`);
    console.log(`  - Skills`);
    console.log(`  - Achievements`);
    console.log(`  - Emergency Contacts`);
    console.log(`\n🧪 Test Now:`);
    console.log(`  1. Go to http://localhost:3000/auth/login`);
    console.log(`  2. Login with any demo user!`);
    console.log(`  3. Run: node verify-seed.js (to see full details)\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fullSetup();
