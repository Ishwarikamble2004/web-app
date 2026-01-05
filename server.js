const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;
// Note: For Render deployment we use plain HTTP and rely on Render's TLS.

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// MongoDB Connection
const DB_URI = process.env.NODE_ENV === 'test'
    ? (process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_test_v2')
    : (process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db_v2');

mongoose.connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB');
    if (process.env.NODE_ENV !== 'test') {
        await seedTeachers(); // Pre-load teachers
        await seedStudents(); // Pre-load students
    }
}).catch(err => console.error('MongoDB connection error:', err));

// --- SCHEMAS ---

// 1. Teacher Schema
const TeacherSchema = new mongoose.Schema({
    teacherId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    department: String,
    assignedCourses: { type: Map, of: [String] } 
});
const Teacher = mongoose.model('Teacher', TeacherSchema);

// 2. Student Schema
const StudentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    branch: String,
    semester: String,
    division: String
});
const Student = mongoose.model('Student', StudentSchema);

// 3. Session Schema
const SessionSchema = new mongoose.Schema({
    sessionId: String,
    teacherId: String,
    branch: String,
    semester: String,
    division: String,
    course: String,
    timeslot: String,
    active: Boolean,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
});
const Session = mongoose.model('Session', SessionSchema);

// 4. Attendance Schema
const AttendanceSchema = new mongoose.Schema({
    sessionId: String,
    studentId: String,
    course: String,
    branch: String,
    semester: String,
    division: String,
    timeslot: String,
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'Present' },
    ipAddress: String
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);


// --- SEED DATA ---
async function seedTeachers() {
    const teachers = [
        {
            teacherId: "T001",
            password: "password123",
            name: "John Doe",
            department: "CSE",
            assignedCourses: {
                "5": ["Software Engineering"],
                "6": ["Cloud Computing"]
            }
        },
        {
            teacherId: "T002",
            password: "password123",
            name: "Jane Smith",
            department: "ECE",
            assignedCourses: {
                "3": ["Circuit Theory"],
                "4": ["Digital Logic"]
            }
        },
         {
            teacherId: "T003",
            password: "password123",
            name: "Robert Brown",
            department: "MECH",
            assignedCourses: {
                "7": ["Thermodynamics"], 
                "8": ["Fluid Mechanics"]
            }
        }
    ];

    for (const t of teachers) {
        await Teacher.findOneAndUpdate({ teacherId: t.teacherId }, t, { upsert: true, new: true });
    }
    console.log("Teachers seeded/updated.");
}

async function seedStudents() {
    await Student.deleteMany({});
    
    const semesters = ['3', '4', '5', '6', '7', '8'];
    
    for (const sem of semesters) {
        if (sem === '5') {
            // For semester 5, use original IDs to match existing attendance records
            // Division A: 5 students
            for (let i = 410; i <= 414; i++) {
                const studentId = `02FE24BCS${i.toString().padStart(3, '0')}`;
                await Student.findOneAndUpdate({studentId}, {
                    studentId,
                    password: "password123",
                    name: `Student ${studentId}`,
                    branch: "BCS",
                    semester: sem,
                    division: "A"
                }, { upsert: true, new: true });
            }
            
            // Division B: 5 students
            for (let i = 415; i <= 419; i++) {
                const studentId = `02FE24BCS${i.toString().padStart(3, '0')}`;
                await Student.findOneAndUpdate({studentId}, {
                    studentId,
                    password: "password123",
                    name: `Student ${studentId}`,
                    branch: "BCS",
                    semester: sem,
                    division: "B"
                }, { upsert: true, new: true });
            }
        } else {
            // For other semesters, use suffixed IDs
            // Division A: 5 students per semester
            for (let i = 410; i <= 414; i++) {
                const studentId = `02FE24BCS${i.toString().padStart(3, '0')}_${sem}`;
                await Student.findOneAndUpdate({studentId}, {
                    studentId,
                    password: "password123",
                    name: `Student ${studentId}`,
                    branch: "BCS",
                    semester: sem,
                    division: "A"
                }, { upsert: true, new: true });
            }
            
            // Division B: 5 students per semester
            for (let i = 415; i <= 419; i++) {
                const studentId = `02FE24BCS${i.toString().padStart(3, '0')}_${sem}`;
                await Student.findOneAndUpdate({studentId}, {
                    studentId,
                    password: "password123",
                    name: `Student ${studentId}`,
                    branch: "BCS",
                    semester: sem,
                    division: "B"
                }, { upsert: true, new: true });
            }
        }
    }

    console.log("Students seeded.");
}


// --- ROUTES ---

// AUTH: Teacher Login
app.post('/api/teacher-login', async (req, res) => {
    const { teacherId, password } = req.body;
    try {
        const teacher = await Teacher.findOne({ teacherId });
        if (!teacher) return res.json({ success: false, message: "Teacher ID not found" });
        if (teacher.password !== password) return res.json({ success: false, message: "Invalid Password" });
        res.json({ 
            success: true, 
            message: "Login Successful", 
            teacherId: teacher.teacherId,
            name: teacher.name,
            department: teacher.department,
            assignedCourses: teacher.assignedCourses
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// AUTH: Student Login with SRN Validation
app.post('/api/student-login', async (req, res) => {
    const { studentId, password } = req.body;

    // -- START VALIDATION --
    const srnRegex = /^02FE(22|23|24|25)[A-Z]{3}\d{3}$/i; // i for case-insensitive `02fe`
    if (!srnRegex.test(studentId)) {
        return res.json({ success: false, message: "Invalid SRN format. Example: 02FE24BCS410" });
    }
    // -- END VALIDATION --

    try {
        let student = await Student.findOne({ studentId });
        if (!student) {
            // Auto-register for demo purposes
            student = new Student({ studentId, password, name: "Student " + studentId });
            await student.save();
        } else {
            if (student.password !== password) {
                return res.json({ success: false, message: "Invalid Password" });
            }
        }
        res.json({ success: true, message: "Login Successful", studentId: student.studentId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create Session
app.post('/api/create-session', async (req, res) => {
    try {
        const { branch, semester, division, course, teacherId, timeslot } = req.body;
        const sessionId = 'SES-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const newSession = new Session({ sessionId, teacherId, branch, semester, division, course, timeslot, active: true, expiresAt: new Date(Date.now() + 60000) });
        await newSession.save();
        res.json({ success: true, sessionId, expiresAt: newSession.expiresAt });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Session Info
app.get('/api/session/:sessionId', async (req, res) => {
    try {
        const session = await Session.findOne({ sessionId: req.params.sessionId });
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });
        
        // Get all students in the branch, semester, and division
        const allStudents = await Student.find({ branch: session.branch, semester: session.semester, division: session.division }).select('studentId name');
        
        // Get attendees
        const attendeesRecords = await Attendance.find({ sessionId: req.params.sessionId }).select('studentId');
        const attendees = attendeesRecords.map(a => a.studentId);
        
        // Build student list with status
        const studentList = allStudents.map(student => ({
            studentId: student.studentId,
            name: student.name,
            status: attendees.includes(student.studentId) ? 'Present' : 'Absent'
        }));
        
        const presentCount = attendees.length;
        const totalCount = allStudents.length;
        
        res.json({ success: true, session: { ...session.toObject(), studentList, presentCount, totalCount } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Mark Attendance
app.post('/api/mark-attendance', async (req, res) => {
    try {
        const { sessionId, studentId } = req.body;
        let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (ipAddress === '::1') ipAddress = '127.0.0.1';

        const session = await Session.findOne({ sessionId });
        if (!session) return res.json({ success: false, message: "Invalid Session ID" });
        if (!session.active) return res.json({ success: false, message: "Session is inactive" });
        if (new Date() > session.expiresAt) {
            session.active = false;
            await session.save();
            return res.json({ success: false, message: "Session expired" });
        }

        const existingStudent = await Attendance.findOne({ sessionId, studentId });
        if (existingStudent) return res.json({ success: true, message: "Attendance already marked", alreadyMarked: true });

        const existingIp = await Attendance.findOne({ sessionId, ipAddress });
        if (existingIp && process.env.NODE_ENV !== 'test') return res.json({ success: false, message: "Proxy Alert: This device has already marked attendance for this session!" });

        const newAttendance = new Attendance({ sessionId, studentId, course: session.course, branch: session.branch, semester: session.semester, division: session.division, timeslot: session.timeslot, date: new Date(), ipAddress: ipAddress });
        await newAttendance.save();
        res.json({ success: true, message: "Attendance marked successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Student History
app.get('/api/student-history/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const history = await Attendance.find({ studentId }).sort({ date: -1 });
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// End Session
app.post('/api/end-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        await Session.findOneAndUpdate({ sessionId }, { active: false });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Teacher Report
app.post('/api/teacher/report', async (req, res) => {
    try {
        const { date, course, timeslot, semester, division } = req.body;
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(date);
        end.setHours(23,59,59,999);
        
        // Get all students based on filters
        const studentQuery = {};
        if (semester) studentQuery.semester = semester;
        if (division) studentQuery.division = division;
        const allStudents = await Student.find(studentQuery).select('studentId name division');
        
        // Get attendance records for the date and filters
        const attendanceQuery = { date: { $gte: start, $lte: end } };
        if (course) attendanceQuery.course = course;
        if (timeslot) attendanceQuery.timeslot = timeslot;
        if (semester) attendanceQuery.semester = semester;
        if (division) attendanceQuery.division = division;
        
        const attendanceRecords = await Attendance.find(attendanceQuery);
        
        // Create a map of studentId to attendance status
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.studentId] = record.status || 'Present';
        });
        
        // Build the report with all students
        const reportData = allStudents.map(student => ({
            studentId: student.studentId,
            name: student.name,
            division: student.division,
            course: course || 'All',
            status: attendanceMap[student.studentId] || 'Absent'
        }));
        
        const presentCount = reportData.filter(s => s.status === 'Present').length;
        const absentCount = reportData.filter(s => s.status === 'Absent').length;
        
        res.json({ 
            success: true, 
            data: reportData,
            summary: {
                total: reportData.length,
                present: presentCount,
                absent: absentCount
            }
        });
    } catch (err) {
        console.error('Report error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

// Export app for testing
module.exports = app;

// Export seed functions for testing
module.exports.seedTeachers = seedTeachers;
module.exports.seedStudents = seedStudents;

// Only start server if not in test mode
if (require.main === module) {
    const http = require('http');
    // In production (Render) we listen on the provided PORT. Locally we start
    // two servers on separate ports for teacher and student so phones can
    // scan different QR codes (same machine IP, different ports).
    const localIp = getLocalIpAddress();
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        const server = http.createServer(app);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on http://0.0.0.0:${PORT}`);
        });
    } else {
        const teacherPort = parseInt(process.env.PORT_TEACHER || PORT || 3000, 10);
        const studentPort = parseInt(process.env.PORT_STUDENT || 3001, 10);

        http.createServer(app).listen(teacherPort, '0.0.0.0', () => {
            console.log(`Teacher UI: http://${localIp}:${teacherPort}/teacher.html`);
        });

        http.createServer(app).listen(studentPort, '0.0.0.0', () => {
            console.log(`Student UI: http://${localIp}:${studentPort}/student.html`);
        });
    }
}

