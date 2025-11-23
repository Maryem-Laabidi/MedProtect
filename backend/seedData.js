// backend/seedData.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Patient from "./models/Patient.js";
import Department from "./models/Department.js";

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/medProtect", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Department.deleteMany({});

    console.log("🗑️ Old data cleared");

    // Create Departments
    const departments = [
      { name: "Cardiology", description: "Heart and cardiovascular diseases" },
      { name: "Neurology", description: "Brain and nervous system disorders" },
      { name: "Pediatrics", description: "Medical care for children" },
      { name: "Orthopedics", description: "Bones and musculoskeletal system" },
      { name: "Dermatology", description: "Skin diseases and conditions" }
    ];

    const createdDepartments = await Department.insertMany(departments);
    console.log("🏥 Departments created");

    // Create Admin User
    const adminPassword = await bcrypt.hash("admin123", 12);
    const admin = new User({
      username: "admin",
      password: adminPassword,
      role: "admin",
      profile: {
        firstName: "Mariem",
        lastName: "Laabidi",
        email: "admin@medprotect.ma",
        phone: "+212-600-000000"
      }
    });
    await admin.save();
    console.log("👨‍💼 Admin user created - Username: admin, Password: admin123");

    // Create Head Doctors
    const headDoctors = [
      {
        username: "dr.khalid",
        password: await bcrypt.hash("doctor123", 12),
        role: "head_doctor",
        profile: {
          firstName: "Khalid",
          lastName: "Benani",
          email: "k.benani@medprotect.ma",
          phone: "+212-600-111111",
          specialization: "Cardiologist",
          department: "Cardiology"
        }
      },
      {
        username: "dr.fatima",
        password: await bcrypt.hash("doctor123", 12),
        role: "head_doctor",
        profile: {
          firstName: "Fatima",
          lastName: "Zahra",
          email: "f.zahra@medprotect.ma",
          phone: "+212-600-222222",
          specialization: "Neurologist",
          department: "Neurology"
        }
      },
      {
        username: "dr.amine",
        password: await bcrypt.hash("doctor123", 12),
        role: "head_doctor",
        profile: {
          firstName: "Amine",
          lastName: "Mansouri",
          email: "a.mansouri@medprotect.ma",
          phone: "+212-600-333333",
          specialization: "Pediatrician",
          department: "Pediatrics"
        }
      }
    ];

    const createdHeadDoctors = await User.insertMany(headDoctors);
    console.log("👨‍⚕️ Head doctors created");

    // Create Regular Doctors
    const doctors = [
      {
        username: "dr.hiba",
        password: await bcrypt.hash("doctor123", 12),
        role: "doctor",
        profile: {
          firstName: "Hiba",
          lastName: "Rahmani",
          email: "h.rahmani@medprotect.ma",
          phone: "+212-600-444444",
          specialization: "Cardiologist",
          department: "Cardiology"
        }
      },
      {
        username: "dr.youssef",
        password: await bcrypt.hash("doctor123", 12),
        role: "doctor",
        profile: {
          firstName: "Youssef",
          lastName: "El Fassi",
          email: "y.elfassi@medprotect.ma",
          phone: "+212-600-555555",
          specialization: "Neurologist",
          department: "Neurology"
        }
      },
      {
        username: "dr.sara",
        password: await bcrypt.hash("doctor123", 12),
        role: "doctor",
        profile: {
          firstName: "Sara",
          lastName: "Bennani",
          email: "s.bennani@medprotect.ma",
          phone: "+212-600-666666",
          specialization: "Pediatrician",
          department: "Pediatrics"
        }
      },
      {
        username: "dr.omar",
        password: await bcrypt.hash("doctor123", 12),
        role: "doctor",
        profile: {
          firstName: "Omar",
          lastName: "Tazi",
          email: "o.tazi@medprotect.ma",
          phone: "+212-600-777777",
          specialization: "Orthopedic Surgeon",
          department: "Orthopedics"
        }
      },
      {
        username: "dr.nadia",
        password: await bcrypt.hash("doctor123", 12),
        role: "doctor",
        profile: {
          firstName: "Nadia",
          lastName: "Cherkaoui",
          email: "n.cherkaoui@medprotect.ma",
          phone: "+212-600-888888",
          specialization: "Dermatologist",
          department: "Dermatology"
        }
      }
    ];

    const createdDoctors = await User.insertMany(doctors);
    console.log("👩‍⚕️ Regular doctors created");

    // Create Patients
    const patients = [
      {
        username: "patient.ahmed",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Ahmed",
          lastName: "Alaoui",
          email: "ahmed.alaoui@email.com",
          phone: "+212-600-123456",
          dateOfBirth: new Date("1985-03-15"),
          address: "123 Avenue Hassan II, Casablanca"
        }
      },
      {
        username: "patient.fatima",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Fatima",
          lastName: "Benjelloun",
          email: "fatima.b@email.com",
          phone: "+212-600-234567",
          dateOfBirth: new Date("1978-07-22"),
          address: "45 Rue Mohammed V, Rabat"
        }
      },
      {
        username: "patient.mohamed",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Mohamed",
          lastName: "Chraibi",
          email: "m.chraibi@email.com",
          phone: "+212-600-345678",
          dateOfBirth: new Date("1992-11-08"),
          address: "78 Boulevard Moulay Youssef, Marrakech"
        }
      },
      {
        username: "patient.amina",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Amina",
          lastName: "El Khattabi",
          email: "amina.ek@email.com",
          phone: "+212-600-456789",
          dateOfBirth: new Date("1988-12-30"),
          address: "22 Avenue des FAR, Fès"
        }
      },
      {
        username: "patient.rachid",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Rachid",
          lastName: "Bouzoubaa",
          email: "r.bouzoubaa@email.com",
          phone: "+212-600-567890",
          dateOfBirth: new Date("1975-05-14"),
          address: "56 Rue Palestine, Tanger"
        }
      },
      {
        username: "patient.zineb",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Zineb",
          lastName: "Mouline",
          email: "z.mouline@email.com",
          phone: "+212-600-678901",
          dateOfBirth: new Date("1995-09-03"),
          address: "89 Avenue Moulay Ismail, Meknès"
        }
      },
      {
        username: "patient.hassan",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Hassan",
          lastName: "Qasri",
          email: "h.qasri@email.com",
          phone: "+212-600-789012",
          dateOfBirth: new Date("1982-01-25"),
          address: "34 Rue Jabal Al Ayachi, Agadir"
        }
      },
      {
        username: "patient.noura",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Noura",
          lastName: "Saidi",
          email: "n.saidi@email.com",
          phone: "+212-600-890123",
          dateOfBirth: new Date("1990-06-18"),
          address: "67 Boulevard Mohammed VI, Oujda"
        }
      },
      {
        username: "patient.karim",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Karim",
          lastName: "Berrada",
          email: "k.berrada@email.com",
          phone: "+212-600-901234",
          dateOfBirth: new Date("1970-08-12"),
          address: "11 Avenue Hassan I, Tétouan"
        }
      },
      {
        username: "patient.laila",
        password: await bcrypt.hash("patient123", 12),
        role: "patient",
        profile: {
          firstName: "Laila",
          lastName: "Mernissi",
          email: "l.mernissi@email.com",
          phone: "+212-600-012345",
          dateOfBirth: new Date("1987-04-07"),
          address: "90 Rue Moulay Rachid, Safi"
        }
      }
    ];

    const createdPatients = await User.insertMany(patients);
    console.log("👥 Patients created");

    // Create Patient Records with Medical Information
    const patientRecords = [
      // Cardiology Patients
      {
        user: createdPatients[0]._id,
        personalInfo: {
          firstName: "Ahmed",
          lastName: "Alaoui",
          dateOfBirth: new Date("1985-03-15"),
          gender: "Male",
          bloodType: "A+"
        },
        medicalInfo: {
          allergies: ["Penicillin", "Shellfish"],
          chronicConditions: ["Hypertension", "High Cholesterol"],
          medications: ["Atorvastatin 20mg", "Lisinopril 10mg"]
        },
        department: "Cardiology",
        assignedDoctors: [
          {
            doctorId: createdHeadDoctors[0]._id, // Dr. Khalid Benani
            department: "Cardiology",
            assignedBy: admin._id
          },
          {
            doctorId: createdDoctors[0]._id, // Dr. Hiba Rahmani
            department: "Cardiology",
            assignedBy: admin._id
          }
        ]
      },
      {
        user: createdPatients[1]._id,
        personalInfo: {
          firstName: "Fatima",
          lastName: "Benjelloun",
          dateOfBirth: new Date("1978-07-22"),
          gender: "Female",
          bloodType: "O+"
        },
        medicalInfo: {
          allergies: ["Aspirin"],
          chronicConditions: ["Type 2 Diabetes", "Heart Arrhythmia"],
          medications: ["Metformin 500mg", "Metoprolol 25mg"]
        },
        department: "Cardiology",
        assignedDoctors: [
          {
            doctorId: createdHeadDoctors[0]._id,
            department: "Cardiology",
            assignedBy: admin._id
          }
        ]
      },

      // Neurology Patients
      {
        user: createdPatients[2]._id,
        personalInfo: {
          firstName: "Mohamed",
          lastName: "Chraibi",
          dateOfBirth: new Date("1992-11-08"),
          gender: "Male",
          bloodType: "B+"
        },
        medicalInfo: {
          allergies: ["Ibuprofen"],
          chronicConditions: ["Migraine", "Anxiety Disorder"],
          medications: ["Sumatriptan 50mg", "Sertraline 50mg"]
        },
        department: "Neurology",
        assignedDoctors: [
          {
            doctorId: createdHeadDoctors[1]._id, // Dr. Fatima Zahra
            department: "Neurology",
            assignedBy: admin._id
          },
          {
            doctorId: createdDoctors[1]._id, // Dr. Youssef El Fassi
            department: "Neurology",
            assignedBy: admin._id
          }
        ]
      },
      {
        user: createdPatients[3]._id,
        personalInfo: {
          firstName: "Amina",
          lastName: "El Khattabi",
          dateOfBirth: new Date("1988-12-30"),
          gender: "Female",
          bloodType: "AB+"
        },
        medicalInfo: {
          allergies: ["Latex"],
          chronicConditions: ["Epilepsy"],
          medications: ["Levetiracetam 500mg"]
        },
        department: "Neurology",
        assignedDoctors: [
          {
            doctorId: createdHeadDoctors[1]._id,
            department: "Neurology",
            assignedBy: admin._id
          }
        ]
      },

      // Pediatrics Patients
      {
        user: createdPatients[4]._id,
        personalInfo: {
          firstName: "Rachid",
          lastName: "Bouzoubaa",
          dateOfBirth: new Date("1975-05-14"),
          gender: "Male",
          bloodType: "A-"
        },
        medicalInfo: {
          allergies: ["Peanuts"],
          chronicConditions: ["Asthma"],
          medications: ["Albuterol Inhaler"]
        },
        department: "Pediatrics",
        assignedDoctors: [
          {
            doctorId: createdHeadDoctors[2]._id, // Dr. Amine Mansouri
            department: "Pediatrics",
            assignedBy: admin._id
          },
          {
            doctorId: createdDoctors[2]._id, // Dr. Sara Bennani
            department: "Pediatrics",
            assignedBy: admin._id
          }
        ]
      },
      {
        user: createdPatients[5]._id,
        personalInfo: {
          firstName: "Zineb",
          lastName: "Mouline",
          dateOfBirth: new Date("1995-09-03"),
          gender: "Female",
          bloodType: "O-"
        },
        medicalInfo: {
          allergies: ["Dust Mites"],
          chronicConditions: [],
          medications: []
        },
        department: "Pediatrics",
        assignedDoctors: [
          {
            doctorId: createdHeadDoctors[2]._id,
            department: "Pediatrics",
            assignedBy: admin._id
          }
        ]
      },

      // Orthopedics Patients
      {
        user: createdPatients[6]._id,
        personalInfo: {
          firstName: "Hassan",
          lastName: "Qasri",
          dateOfBirth: new Date("1982-01-25"),
          gender: "Male",
          bloodType: "B+"
        },
        medicalInfo: {
          allergies: [],
          chronicConditions: ["Osteoarthritis"],
          medications: ["Acetaminophen 500mg"]
        },
        department: "Orthopedics",
        assignedDoctors: [
          {
            doctorId: createdDoctors[3]._id, // Dr. Omar Tazi
            department: "Orthopedics",
            assignedBy: admin._id
          }
        ]
      },

      // Dermatology Patients
      {
        user: createdPatients[7]._id,
        personalInfo: {
          firstName: "Noura",
          lastName: "Saidi",
          dateOfBirth: new Date("1990-06-18"),
          gender: "Female",
          bloodType: "A+"
        },
        medicalInfo: {
          allergies: ["Nickel"],
          chronicConditions: ["Psoriasis"],
          medications: ["Topical Corticosteroids"]
        },
        department: "Dermatology",
        assignedDoctors: [
          {
            doctorId: createdDoctors[4]._id, // Dr. Nadia Cherkaoui
            department: "Dermatology",
            assignedBy: admin._id
          }
        ]
      },

      // Additional patients for variety
      {
        user: createdPatients[8]._id,
        personalInfo: {
          firstName: "Karim",
          lastName: "Berrada",
          dateOfBirth: new Date("1970-08-12"),
          gender: "Male",
          bloodType: "O+"
        },
        medicalInfo: {
          allergies: ["Sulfa Drugs"],
          chronicConditions: ["COPD"],
          medications: ["Tiotropium Inhaler"]
        },
        department: "Cardiology",
        assignedDoctors: [
          {
            doctorId: createdDoctors[0]._id,
            department: "Cardiology",
            assignedBy: admin._id
          }
        ]
      },
      {
        user: createdPatients[9]._id,
        personalInfo: {
          firstName: "Laila",
          lastName: "Mernissi",
          dateOfBirth: new Date("1987-04-07"),
          gender: "Female",
          bloodType: "AB-"
        },
        medicalInfo: {
          allergies: ["Bee Stings"],
          chronicConditions: ["Hypothyroidism"],
          medications: ["Levothyroxine 75mcg"]
        },
        department: "Neurology",
        assignedDoctors: [
          {
            doctorId: createdDoctors[1]._id,
            department: "Neurology",
            assignedBy: admin._id
          }
        ]
      }
    ];

    await Patient.insertMany(patientRecords);
    console.log("📋 Patient medical records created");

    console.log("\n🎉 Sample data successfully created!");
    console.log("\n📋 Login Credentials:");
    console.log("👨‍💼 Admin: username='admin', password='admin123'");
    console.log("👨‍⚕️ Head Doctors: username='dr.khalid', password='doctor123'");
    console.log("👩‍⚕️ Regular Doctors: username='dr.hiba', password='doctor123'");
    console.log("👥 Patients: username='patient.ahmed', password='patient123'");
    
    console.log("\n🏥 Departments created:");
    departments.forEach(dept => console.log(`   - ${dept.name}`));

    process.exit(0);

  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();