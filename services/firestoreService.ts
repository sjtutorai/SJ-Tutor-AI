
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export interface StudentData {
  name: string;
  institution: string;
  grade: string;
  phone: string;
  photoURL?: string;
  registrationNumber: string;
  id: string; // The ID used for the QR code
}

export const FirestoreService = {
  async addStudent(student: StudentData) {
    try {
      await setDoc(doc(db, 'students', student.id), {
        name: student.name,
        institution: student.institution,
        grade: student.grade,
        phone: student.phone,
        photoURL: student.photoURL || '',
        registrationNumber: student.registrationNumber,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error("Error adding student:", error);
      throw error;
    }
  },

  async seedDemoData() {
    const demoStudents: StudentData[] = [
      {
        id: "SJT-2026-001",
        registrationNumber: "SJT-2026-001",
        name: "Ankit Sharma",
        institution: "Delhi Public School",
        grade: "12th Science",
        phone: "+91 98765 43210",
        photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop"
      },
      {
        id: "SJT-2026-002",
        registrationNumber: "SJT-2026-002",
        name: "Priya Gupta",
        institution: "Ryan International",
        grade: "10th",
        phone: "+91 99887 76655",
        photoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop"
      },
      {
        id: "SJT-2026-003",
        registrationNumber: "SJT-2026-003",
        name: "Rahul Verma",
        institution: "Amity International",
        grade: "11th Commerce",
        phone: "+91 91234 56789",
        photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
      },
      {
        id: "SJT-DEMO-ANKIT", // Keep the demo one too
        registrationNumber: "SJT-DEMO-ANKIT",
        name: "Ankit Sharma",
        institution: "Delhi Public School",
        grade: "12th Science",
        phone: "+91 98765 43210",
        photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop"
      }
    ];

    for (const student of demoStudents) {
      await this.addStudent(student);
    }
  }
};
