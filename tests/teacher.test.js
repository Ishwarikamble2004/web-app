const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Teacher Dashboard Test Cases', () => {
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

  describe('TC-TR-01 — Valid Teacher Login', () => {
    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/teacher-login')
        .send({
          teacherId: 'T001',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('TC-TR-02 — Create Attendance Session', () => {
    test('should create a new session', async () => {
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

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('sessionId');
    });
  });

  describe('TC-TR-03 — View Attendance Report', () => {
    test('should return attendance report', async () => {
      const response = await request(app)
        .post('/api/teacher/report')
        .send({
          date: '2026-01-02',
          course: 'Software Engineering',
          semester: '5',
          division: 'A'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('summary');
    });
  });
});