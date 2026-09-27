SmartClassX 🚀

AI + IoT Based Smart Classroom & Smart Campus Management System

SmartClassX is an AI and IoT-powered platform designed to make classrooms and campuses smarter, safer, and more efficient.

The system combines Artificial Intelligence, Computer Vision, IoT, and Web Technologies to provide smart attendance, classroom occupancy monitoring, automatic light/fan control, security alerts, cleanliness monitoring, student complaints, class notes, and notifications.

🌟 Features

- 👨‍🎓 Smart Attendance
  
  - Camera-based student attendance
  - Date and time-based attendance records
  - Teacher review for uncertain matches

- 💡 Smart Light & Fan Automation
  
  - Detects classroom occupancy
  - Automatically controls lights and fans
  - Zone-based appliance control
  - Teacher/HOD manual override

- 🔐 Unauthorized Entry Detection
  
  - Detects students entering another classroom
  - Sends alerts to the class teacher

- 🗑️ Smart Cleanliness Monitoring
  
  - AI-based garbage event detection
  - Student and teacher notifications
  - Location and time-based event records

- 📝 Student Complaint System
  
  - Students can submit complaints
  - Teachers can review and respond
  - Complaint status tracking

- 📚 Smart Class Notes
  
  - Teachers can upload notes
  - Supports text, PDFs, images, links, and smart-board snapshots
  - Students receive notifications for new notes

- 🔔 Central Notification System
  
  - Attendance and security alerts
  - Complaint updates
  - Cleanliness alerts
  - New class-note notifications

- 👥 Dual Login
  
  - Student Login
  - Teacher Login
  - College-email authentication
  - Password recovery

🏗️ System Architecture

Camera / CCTV / Smart Board / ESP32
                ↓
       AI / Computer Vision
                ↓
 Backend API + Authentication
                ↓
      Database + File Storage
                ↓
       Notification Service
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Student Portal        Teacher Portal

🛠️ Technology Stack

Frontend

- React.js
- HTML
- CSS
- JavaScript

Backend

- Python
- FastAPI / Flask
- REST API

AI & Computer Vision

- Python
- OpenCV
- YOLO

IoT

- ESP32
- Relay Module
- Sensors / Camera

Database

- MySQL / PostgreSQL / Firebase

👥 User Roles

Role| Main Responsibilities
Student| Attendance, complaints, class notes, notifications
Subject Teacher| Class notes, subjects, attendance
Class Teacher| Student data, complaints, alerts, attendance
HOD/Admin| Department data and system controls
System Admin| Users, cameras, devices and configuration

📌 MVP / Competition Version

The initial version will demonstrate:

- Student and Teacher login
- Student dashboard
- Teacher dashboard
- Smart attendance
- Classroom occupancy detection
- Automatic light/fan control using ESP32
- Unauthorized-entry detection
- Garbage detection
- Complaint management
- Smart class-note publishing
- Central notification system

🔒 Privacy & Security

SmartClassX is designed with security and privacy in mind.

- Role-based access control
- Secure authentication
- Encrypted connections
- Secure password storage
- Restricted access to camera/biometric data
- Human review of AI-generated alerts
- Limited data retention

🚀 Project Status

Status: 🚧 Under Development

SmartClassX is currently being developed as a smart campus project combining software, AI, and IoT technologies.

👨‍💻 Contributors

Built with ❤️ by the SmartClassX Team.

---

📄 Project Documentation

The complete Product Requirements Document (PRD) contains the detailed functional requirements, system flow, database entities, technology stack, MVP requirements, and privacy considerations.
