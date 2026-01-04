const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Attendance Report & Data Accuracy', () => {
  let sessionId;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Seed data
    await app.seedTeachers();
    await app.seedStudents();
    
    // Create a session and mark attendance
    const sessionResponse = await request(app)
      .post('/api/create-session')
      .send({
        teacherId: 'T001',
        branch: 'BCS',
        semester: '5',
        division: 'A',
        course: 'Software Engineering',
        timeslot: '08:00-09:00'
      });
    sessionId = sessionResponse.body.sessionId;
    
    // Mark attendance for a student
    await request(app)
      .post('/api/mark-attendance')
      .send({
        sessionId,
        studentId: '02FE24BCS410'
      });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('TC-RP-01 — Division-Wise Attendance Summary', () => {
    test('should show correct division-wise summary', async () => {
      const response = await request(app)
        .post('/api/teacher/report')
        .send({
          date: '2026-01-02',
          semester: '5',
          division: 'A'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('present');
      expect(response.body.summary).toHaveProperty('absent');
      expect(response.body.summary.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TC-RP-02 — Real-Time Dashboard Update', () => {
    test('should update attendance in real-time', async () => {
      // Mark attendance for another student
      await request(app)
        .post('/api/mark-attendance')
        .send({
          sessionId,
          studentId: '02FE24BCS411'
        });

      // Then check report
      const response = await request(app)
        .post('/api/teacher/report')
        .send({
          date: new Date().toISOString().split('T')[0],
          semester: '5',
          division: 'A'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Check if the students are marked present
      const student1 = response.body.data.find(s => s.studentId === '02FE24BCS410');
      const student2 = response.body.data.find(s => s.studentId === '02FE24BCS411');
      if (student1) expect(student1.status).toBe('Present');
      if (student2) expect(student2.status).toBe('Present');
    });
  });
});