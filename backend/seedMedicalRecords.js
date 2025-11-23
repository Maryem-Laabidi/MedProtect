// backend/seedMedicalRecords.js
import mongoose from "mongoose";
import MedicalRecord from "./models/MedicalRecord.js";
import Patient from "./models/Patient.js";
import User from "./models/User.js";

mongoose.connect("mongodb://127.0.0.1:27017/medProtect");

const seedMedicalRecords = async () => {
  try {
    await MedicalRecord.deleteMany({});
    
    const patients = await Patient.find().populate("user");
    const doctors = await User.find({ role: { $in: ["doctor", "head_doctor"] } });

    const sampleRecords = [
      {
        recordType: "consultation",
        title: "Initial Cardiology Consultation",
        description: "Patient presented with chest pain and high blood pressure",
        content: "Patient reports intermittent chest pain for 2 weeks. BP: 150/95. ECG shows normal sinus rhythm. Recommended lifestyle changes and started on Lisinopril 10mg daily. Follow-up in 2 weeks.",
        department: "Cardiology"
      },
      {
        recordType: "lab_result",
        title: "Blood Test Results",
        description: "Complete blood count and lipid panel",
        content: "Cholesterol: 240 mg/dL (High)\nLDL: 160 mg/dL (High)\nHDL: 35 mg/dL (Low)\nTriglycerides: 200 mg/dL\nWBC: 7.2 K/μL (Normal)\nRBC: 4.8 M/μL (Normal)",
        department: "Cardiology"
      },
      {
        recordType: "prescription",
        title: "Medication Prescription",
        description: "Hypertension and cholesterol management",
        content: "Lisinopril 10mg - Take 1 tablet daily\nAtorvastatin 20mg - Take 1 tablet at bedtime\nAspirin 81mg - Take 1 tablet daily",
        department: "Cardiology"
      },
      {
        recordType: "consultation",
        title: "Neurology Follow-up",
        description: "Migraine management follow-up",
        content: "Patient reports reduced migraine frequency from 4x/week to 1x/week with current medication. No significant side effects. Continue current treatment plan.",
        department: "Neurology"
      },
      {
        recordType: "radiology",
        title: "MRI Brain Scan",
        description: "Routine MRI for epilepsy monitoring",
        content: "MRI shows no structural abnormalities. No evidence of new lesions. Stable compared to previous scan 6 months ago.",
        department: "Neurology"
      }
    ];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const doctor = doctors[i % doctors.length];
      const recordTemplate = sampleRecords[i % sampleRecords.length];

      const record = new MedicalRecord({
        patient: patient._id,
        recordType: recordTemplate.recordType,
        title: `${recordTemplate.title} - ${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`,
        description: recordTemplate.description,
        content: recordTemplate.content,
        createdBy: doctor._id,
        department: patient.department
      });

      await record.save();
    }

    console.log("📄 Sample medical records created!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating medical records:", error);
    process.exit(1);
  }
};

seedMedicalRecords();