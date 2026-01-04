// FRONTEND LOGIC CONNECTED TO NODE.JS BACKEND
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const path = window.location.pathname;
    
    if (path.includes('teacher.html')) {
        setupTeacherPage();
    } else if (path.includes('student.html') || path === '/' || path.includes('index.html')) {
        setupStudentPage();
    }
});

function setupTeacherPage() {
    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('teacher-login-form');
    
    const dashboardSection = document.getElementById('dashboard-section');
    const setupSection = document.getElementById('setup-section');
    const reportSection = document.getElementById('report-section');
    
    const sessionForm = document.getElementById('session-form');
    const liveSection = document.getElementById('live-section');
    
    // Elements to populate with teacher data
    const teacherNameSpan = document.getElementById('teacher-name');
    const teacherDeptSpan = document.getElementById('teacher-dept');
    const branchInput = document.getElementById('branch');
    const courseSelect = document.getElementById('course');
    const semesterSelect = document.getElementById('semester');
    const divisionSelect = document.getElementById('division');
    const reportCourseSelect = document.getElementById('report-course');
    const reportSemesterSelect = document.getElementById('report-semester');
    const reportDivisionSelect = document.getElementById('report-division');
    const timeslotSelect = document.getElementById('timeslot');
    const reportTimeslotSelect = document.getElementById('report-timeslot');
    
    // View Buttons
    const btnCreateView = document.getElementById('btn-create-view');
    const btnReportView = document.getElementById('btn-report-view');
    
    // Report Elements
    const fetchReportBtn = document.getElementById('fetch-report');
    const reportDateInput = document.getElementById('report-date');
    const reportTableBody = document.getElementById('report-table-body');
    const reportTotalDisplay = document.getElementById('report-total');
    const reportPresentDisplay = document.getElementById('report-present');
    const reportAbsentDisplay = document.getElementById('report-absent'); 
    
    // Live Session Elements
    const sessionCodeDisplay = document.getElementById('session-code');
    const liveCourseNameDisplay = document.getElementById('live-course-name');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const timerDisplay = document.getElementById('timer');
    const attendeeList = document.getElementById('attendee-list');
    const presentCount = document.getElementById('present-count');
    const endSessionBtn = document.getElementById('end-session');

    let currentTeacherId = '';
    let currentAssignedCourses = {}; // Store the course map { "5": ["Soft Eng"], ... }
    let sessionInterval;
    let updateInterval;
    let currentSessionId = null;

    // 1. LOGIN
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('teacher-id').value;
        const pass = document.getElementById('teacher-password').value;

        try {
            const response = await fetch(`${API_URL}/teacher-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId: id, password: pass })
            });
            const data = await response.json();
            
            if (data.success) {
                currentTeacherId = data.teacherId;
                currentAssignedCourses = data.assignedCourses || {};

                // Populate Dashboard
                teacherNameSpan.textContent = data.name;
                teacherDeptSpan.textContent = data.department;
                branchInput.value = data.department; // Auto-set branch/dept
                
                // Reset fields
                semesterSelect.value = "";
                divisionSelect.value = "";
                courseSelect.innerHTML = '<option value="">Select Course</option>';

                // Populate Report Course Dropdown (All possible courses for this teacher)
                populateReportDropdown(currentAssignedCourses);

                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                dashboardSection.classList.add('fade-in');
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Login Failed: Server Error");
        }
    });

    // Handle Semester Change -> Populate Courses
    semesterSelect.addEventListener('change', () => {
        const selectedSem = semesterSelect.value;
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        
        if (selectedSem && currentAssignedCourses[selectedSem]) {
            const courses = currentAssignedCourses[selectedSem];
            courses.forEach(courseName => {
                const opt = document.createElement('option');
                opt.value = courseName;
                opt.textContent = courseName;
                courseSelect.appendChild(opt);
            });
        }
    });

    function populateReportDropdown(assignedCoursesMap) {
        reportCourseSelect.innerHTML = '<option value="">All Courses</option>';
        reportSemesterSelect.innerHTML = '<option value="">All Semesters</option>';
        // Iterate over all semesters in the map
        for (const sem in assignedCoursesMap) {
            if (assignedCoursesMap.hasOwnProperty(sem)) {
                const courses = assignedCoursesMap[sem];
                // Add semester option (if not present)
                let semExists = false;
                for (let i = 0; i < reportSemesterSelect.options.length; i++) {
                    if (reportSemesterSelect.options[i].value === sem) semExists = true;
                }
                if (!semExists) {
                    const sopt = document.createElement('option');
                    sopt.value = sem;
                    sopt.textContent = sem;
                    reportSemesterSelect.appendChild(sopt);
                }
                courses.forEach(c => {
                    // Avoid duplicates in the dropdown if same course exists in multiple sems (unlikely but safe)
                    // Check if option already exists
                    let exists = false;
                    for(let i=0; i<reportCourseSelect.options.length; i++) {
                        if(reportCourseSelect.options[i].value === c) exists = true;
                    }
                    
                    if(!exists) {
                        const opt = document.createElement('option');
                        opt.value = c;
                        opt.textContent = c;
                        reportCourseSelect.appendChild(opt);
                    }
                });
            }
        }
    }

    // TIMESLOT HELPERS
    function generateHourlyTimeslots(startHour = 8, endHour = 18) {
        const slots = [];
        for (let h = startHour; h < endHour; h++) {
            const s = String(h).padStart(2, '0') + ':00';
            const e = String(h + 1).padStart(2, '0') + ':00';
            slots.push(`${s}-${e}`);
        }
        return slots;
    }

    function populateTimeslotSelect(selectEl, includePlaceholder = true) {
        if (!selectEl) return;
        const slots = generateHourlyTimeslots(8, 20); // 08:00-20:00
        selectEl.innerHTML = '';
        if (includePlaceholder) {
            const ph = document.createElement('option');
            ph.value = '';
            ph.textContent = selectEl.id === 'report-timeslot' ? 'All Time Slots' : 'Select Time Slot';
            selectEl.appendChild(ph);
        }
        slots.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            selectEl.appendChild(opt);
        });
    }

    // Populate timeslot selects immediately
    populateTimeslotSelect(timeslotSelect, true);
    populateTimeslotSelect(reportTimeslotSelect, true);

    // 2. NAVIGATION TABS
    btnCreateView.addEventListener('click', () => {
        setupSection.style.display = 'block';
        reportSection.style.display = 'none';
        liveSection.style.display = 'none';
        btnCreateView.style.background = ''; 
        btnReportView.style.background = '#ccc';
    });

    btnReportView.addEventListener('click', () => {
        setupSection.style.display = 'none';
        liveSection.style.display = 'none';
        reportSection.style.display = 'block';
        btnReportView.style.background = ''; 
        btnCreateView.style.background = '#ccc';
        
        reportDateInput.valueAsDate = new Date();
    });

    // 3. CREATE SESSION
    sessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const branch = document.getElementById('branch').value; 
        const semester = document.getElementById('semester').value;
        const division = document.getElementById('division').value;
        const course = document.getElementById('course').value;
        const timeslot = timeslotSelect ? timeslotSelect.value : '';

        if (!course) {
            alert("Please select a course.");
            return;
        }
        if (!division) {
            alert("Please select a division.");
            return;
        }
        if (!timeslot) {
            alert('Please select a time slot for this session.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/create-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    branch, semester, division, course, timeslot,
                    teacherId: currentTeacherId 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentSessionId = data.sessionId;
                
                setupSection.style.display = 'none';
                liveSection.style.display = 'block';
                liveSection.classList.add('fade-in');
                sessionCodeDisplay.textContent = currentSessionId;
                liveCourseNameDisplay.textContent = course;
                
                qrPlaceholder.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentSessionId}" alt="QR Code">`;
                qrPlaceholder.classList.remove('qr-placeholder');

                // Start Timer
                let timeLeft = 60;
                sessionInterval = setInterval(() => {
                    timeLeft--;
                    timerDisplay.textContent = timeLeft;
                    if (timeLeft <= 0) {
                        clearInterval(sessionInterval);
                        clearInterval(updateInterval);
                        timerDisplay.textContent = "Expired";
                        timerDisplay.style.color = "red";
                    }
                }, 1000);

                // Poll for attendees
                updateInterval = setInterval(() => {
                    updateAttendeeList(currentSessionId);
                }, 2000); 
            } else {
                alert('Failed to create session: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Server error');
        }
    });

    async function updateAttendeeList(sessionId) {
        try {
            const response = await fetch(`${API_URL}/session/${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.session) {
                const studentList = data.session.studentList || [];
                attendeeList.innerHTML = '';
                studentList.forEach(student => {
                    const li = document.createElement('li');
                    const statusColor = student.status === 'Present' ? 'green' : 'red';
                    li.innerHTML = `<span>${student.studentId} - ${student.name}</span> <span style="color:${statusColor}">● ${student.status}</span>`;
                    attendeeList.appendChild(li);
                });
                presentCount.textContent = `${data.session.presentCount}/${data.session.totalCount}`;
                
                if (!data.session.active && timerDisplay.textContent !== "Expired") {
                     clearInterval(sessionInterval);
                     clearInterval(updateInterval);
                     timerDisplay.textContent = "Expired";
                     timerDisplay.style.color = "red";
                }
            }
        } catch (error) {
            console.error('Error fetching attendees:', error);
        }
    }

    // 4. REPORTS
    fetchReportBtn.addEventListener('click', async () => {
        const date = reportDateInput.value;
        const selectedCourse = reportCourseSelect.value;
        const selectedTimeslot = reportTimeslotSelect ? reportTimeslotSelect.value : '';
        const selectedSemester = reportSemesterSelect ? reportSemesterSelect.value : '';
        const selectedDivision = reportDivisionSelect ? reportDivisionSelect.value : '';

        if (!date) {
            alert("Please select a date");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/teacher/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    date,
                    course: selectedCourse, // Can be empty string (All Courses)
                    timeslot: selectedTimeslot, // optional filter
                    semester: selectedSemester,
                    division: selectedDivision
                })
            });
            const data = await response.json();

            reportTableBody.innerHTML = '';
            if (data.success) {
                const summary = data.summary;
                reportTotalDisplay.textContent = summary.total;
                reportPresentDisplay.textContent = summary.present;
                reportAbsentDisplay.textContent = summary.absent;

                if (data.data.length === 0) {
                    reportTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:10px;">No records found.</td></tr>';
                } else {
                    data.data.forEach(record => {
                        const tr = document.createElement('tr');
                        const statusColor = record.status === 'Present' ? 'green' : 'red';
                        tr.innerHTML = `
                            <td style="padding:8px; border-bottom:1px solid #ddd;">${record.studentId}</td>
                            <td style="padding:8px; border-bottom:1px solid #ddd;">${record.name}</td>
                            <td style="padding:8px; border-bottom:1px solid #ddd;">${record.division}</td>
                            <td style="padding:8px; border-bottom:1px solid #ddd; color:${statusColor};">${record.status}</td>
                        `;
                        reportTableBody.appendChild(tr);
                    });
                }
            } else {
                alert("Failed to fetch report");
            }
        } catch (err) {
            console.error(err);
            alert("Error fetching report");
        }
    });

    endSessionBtn.addEventListener('click', async () => {
        if (currentSessionId) {
            await fetch(`${API_URL}/end-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId })
            });
        }
        clearInterval(sessionInterval);
        clearInterval(updateInterval);
        location.reload();
    });
}

function setupStudentPage() {
    const loginForm = document.getElementById('student-login-form');
    const loginSection = document.getElementById('login-section');
    const scanSection = document.getElementById('scan-section');
    const scanStatus = document.getElementById('scan-status');
    const manualSubmitBtn = document.getElementById('manual-submit');
    const manualInput = document.getElementById('scan-input');
    
    let currentStudentId = '';
    let html5QrcodeScanner;

    // LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('student-id').value;
            const pass = document.getElementById('student-password').value;

            try {
                const response = await fetch(`${API_URL}/student-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: id, password: pass })
                });
                const data = await response.json();

                if (data.success) {
                    currentStudentId = data.studentId;
                    loginSection.style.display = 'none';
                    scanSection.style.display = 'block';
                    scanSection.classList.add('fade-in');
                    startScanner();
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Server Error");
            }
        });
    }

    function startScanner() {
        scanStatus.textContent = "Starting Camera...";
        
        const onScanSuccess = (decodedText, decodedResult) => {
            if(html5QrcodeScanner) {
                html5QrcodeScanner.clear().then(() => {
                    markAttendance(decodedText);
                }).catch(err => {
                    markAttendance(decodedText);
                });
            } else {
                markAttendance(decodedText);
            }
        };

        const onScanFailure = (error) => {};

        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            false);
            
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        scanStatus.textContent = "Camera Active. Please Scan.";
    }

    // MANUAL FALLBACK
    if (manualSubmitBtn) {
        manualSubmitBtn.addEventListener('click', () => {
            const code = manualInput.value.trim();
            if(code) markAttendance(code);
        });
    }

    async function markAttendance(sessionId) {
        scanStatus.textContent = "Processing...";
        
        try {
            const response = await fetch(`${API_URL}/mark-attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sessionId: sessionId, 
                    studentId: currentStudentId 
                })
            });
            
            const data = await response.json();
            
            if (data.success || data.alreadyMarked) {
                alert(data.message);
                // Redirect to dashboard immediately - PREVENTS RESCANNING
                window.location.href = `student_dashboard.html?studentId=${currentStudentId}`;
            } else {
                alert("Error: " + data.message);
                location.reload(); 
            }
            
        } catch (error) {
            console.error('Error marking attendance:', error);
            alert('Server connection failed');
        }
    }
}