const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Student Dashboard Test Cases', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Seed data
    await app.seedTeachers();
    await app.seedStudents();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('TC-ST-01 — Valid Login', () => {
    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/student-login')
        .send({
          studentId: '02FE24BCS410',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message', 'Login Successful');
    });
  });

  describe('TC-ST-02 — Invalid Login', () => {
    test('should fail login with wrong credentials', async () => {
      const response = await request(app)
        .post('/api/student-login')
        .send({
          studentId: '02FE24BCS410',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('TC-ST-03 — QR Scan Attendance Marking', () => {
    let sessionId;
    beforeAll(async () => {
      // Create a session first
      const response = await request(app)
        .post('/api/create-session')
        .send({
          teacherId: 'T001',
          branch: 'BCS',
          semester: '5',
          division: 'A',
          course: 'Software Engineering',
          timeslot: '08:00-09:00'
        });
      sessionId = response.body.sessionId;
    });

    test('should mark attendance via QR scan', async () => {
      const response = await request(app)
        .post('/api/mark-attendance')
        .send({
          sessionId,
          studentId: '02FE24BCS410'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('TC-ST-04 — Manual Session ID Entry (Valid)', () => {
    let sessionId;
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/create-session')
        .send({
          teacherId: 'T001',
          branch: 'BCS',
          semester: '5',
          division: 'A',
          course: 'Software Engineering',
          timeslot: '08:00-09:00'
        });
      sessionId = response.body.sessionId;
    });

    test('should mark attendance with valid session ID', async () => {
      const response = await request(app)
        .post('/api/mark-attendance')
        .send({
          sessionId,
          studentId: '02FE24BCS410'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('TC-ST-05 — Manual Session ID Entry (Invalid)', () => {
    test('should fail with invalid session ID', async () => {
      const response = await request(app)
        .post('/api/mark-attendance')
        .send({
          sessionId: 'invalid-session-id',
          studentId: '02FE24BCS410'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });
});