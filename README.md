# 📚 Student Management Web App

A full-stack web application designed to streamline academic workflows for teachers and students. The system handles attendance, assignments, marks, and query management with strict role-based access control and batch-level isolation.

---

## 🚀 Features

### 🔐 Authentication & Role Management
- Secure login using JWT authentication  
- Role-based access: **Teacher** and **Student**  
- Batch-scoped data access (teachers can only manage their assigned batch)  

---

### 📊 Attendance Module
- Students can mark attendance → saved as **pending**  
- Teachers can:
  - Approve or deny attendance  
  - Cancel already approved entries  

#### Proxy Detection System
- Flags suspicious activity (same IP/device usage)  

---

### 📝 Assignments Module
- Teachers can:
  - Create assignments with title, description, deadline  

- Students can:
  - Upload files before deadline → status = **submitted**  

- After deadline:
  - Upload disabled (**server-enforced**)  

- Teachers can:
  - Manually mark submission (even after deadline)  

#### Status Tracking
- Not Submitted  
- Submitted (File Upload)  
- Submitted (Manual)  

---

### 📈 Marks & Query Module
- Teachers:
  - Enter marks per student per assessment  
  - View and respond to student queries  

- Students:
  - View only their marks  
  - Raise queries regarding marks  
  
