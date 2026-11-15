const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('ccrs_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`
      
      // FIX: Properly parse FastAPI validation errors
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map(err => err.msg).join(', ')
        } else {
          errorMsg = data.detail
        }
      } else if (data.message) {
        errorMsg = data.message
      }
      
      throw new Error(errorMsg)
    }

    return data
  } catch (err) {
    console.warn(`[CCRS API] ${endpoint} failed:`, err.message)
    throw err
  }
}

// Authentication API
export const authAPI = {
  register: async (userData) => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  login: async (identifier, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      // FIX: Send 'identifier' to match backend schema
      body: JSON.stringify({ identifier: identifier, password: password }), 
    })
    if (data.access_token) {
      localStorage.setItem('ccrs_token', data.access_token)
      localStorage.setItem('ccrs_user', JSON.stringify(data.user))
    }
    return data
  },
  getMe: () => request('/auth/me'),
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  sendOTP: (email) =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyOTP: (email, otp) =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  verifyEmail: (email, code) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  resendVerification: (email) =>
    request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: ({ email, otp, new_password, confirm_password }) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password, confirm_password }),
    }),
  logout: () => {
    localStorage.removeItem('ccrs_token')
    localStorage.removeItem('ccrs_user')
  },
  getCurrentUser: () => {
    try {
      const u = localStorage.getItem('ccrs_user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  },
}

// Metadata API
export const metaAPI = {
  streams: () => request('/meta/streams'),
  term: () => request('/meta/term'),
}

// Student Operations API
export const studentAPI = {
  getDashboard: () => request('/student/dashboard'),
  getCourses: (params = {}) => {
    const q = new URLSearchParams()
    if (params.department && params.department !== 'All') q.append('department', params.department)
    if (params.search) q.append('search', params.search)
    return request(`/student/courses?${q.toString()}`)
  },
  getCourseDetail: (courseCode) => request(`/student/courses/${courseCode}`),
  checkCart: (courseCodes) =>
    request('/student/cart/check', {
      method: 'POST',
      body: JSON.stringify({ course_codes: courseCodes }),
    }),
  registerCourses: (courseCodes) =>
    request('/student/register', {
      method: 'POST',
      body: JSON.stringify({ course_codes: courseCodes }),
    }),
  dropCourse: (courseCode) =>
    request('/student/drop', {
      method: 'POST',
      body: JSON.stringify({ course_code: courseCode }),
    }),
  getRegistrations: () => request('/student/registrations'),
  getTimetable: (selectedCodes = []) => {
    const sel = Array.isArray(selectedCodes) ? selectedCodes.join(',') : selectedCodes || ''
    return request(`/student/timetable${sel ? `?selected=${encodeURIComponent(sel)}` : ''}`)
  },
  getPreviewSlot: (courseCode, selectedCodes = []) => {
    const sel = Array.isArray(selectedCodes) ? selectedCodes.join(',') : selectedCodes || ''
    return request(`/courses/${courseCode}/preview-slot${sel ? `?selected=${encodeURIComponent(sel)}` : ''}`)
  },
  getWaitlist: () => request('/student/waitlist'),
  joinWaitlist: (courseCode, selectedCodes = []) =>
    request('/student/waitlist', {
      method: 'POST',
      body: JSON.stringify({
        course_code: courseCode,
        selected_codes: Array.isArray(selectedCodes) ? selectedCodes : [],
      }),
    }),
  leaveWaitlist: (courseCode) =>
    request(`/student/waitlist/${courseCode}`, {
      method: 'DELETE',
    }),
  acceptOffer: (courseCode) =>
    request(`/student/offers/${courseCode}/accept`, {
      method: 'POST',
    }),
  declineOffer: (courseCode) =>
    request(`/student/offers/${courseCode}/decline`, {
      method: 'POST',
    }),
  getOffers: () => request('/student/offers'),
  respondToOffer: (courseCode, action) =>
    request('/student/offers/action', {
      method: 'POST',
      body: JSON.stringify({ course_code: courseCode, action }),
    }),
  getAcademicRecord: () => request('/student/academic-record'),
}

// Admin Operations API
export const adminAPI = {
  getDashboard: () => request('/admin/dashboard'),
  getWaitlists: () => request('/admin/waitlists'),
  releaseWaitlistSeat: (courseCode) =>
    request(`/admin/waitlists/${courseCode}/release`, {
      method: 'POST',
    }),
  removeWaitlistEntry: (courseCode, studentId) =>
    request(`/admin/waitlists/${courseCode}/entries/${studentId}`, {
      method: 'DELETE',
    }),
  deleteEnrollment: (courseCode, studentId) =>
    request(`/admin/courses/${courseCode}/enrollments/${studentId}`, {
      method: 'DELETE',
    }),
  getCourses: (params = {}) => {
    const q = new URLSearchParams()
    if (params.department && params.department !== 'All') q.append('department', params.department)
    if (params.status && params.status !== 'all') q.append('status', params.status)
    if (params.search) q.append('search', params.search)
    return request(`/admin/courses?${q.toString()}`)
  },
  createCourse: (courseData) =>
    request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),
  updateCourse: (courseCode, updateData) =>
    request(`/admin/courses/${courseCode}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),
  deleteCourse: (courseCode) =>
    request(`/admin/courses/${courseCode}`, {
      method: 'DELETE',
    }),
  toggleCourseStatus: (courseCode) =>
    request(`/admin/courses/${courseCode}/toggle-status`, {
      method: 'POST',
    }),
  getCourseWaitlist: (courseCode) => request(`/admin/courses/${courseCode}/waitlist`),
  getLogs: (limit = 50) => request(`/admin/logs?limit=${limit}`),
  listFaculty: () => request('/admin/faculty'),
  createFaculty: (facultyData) =>
    request('/admin/faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData),
    }),
  updateFaculty: (facultyId, updateData) =>
    request(`/admin/faculty/${facultyId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    }),
  resendFacultyCredentials: (facultyId) =>
    request(`/admin/faculty/${facultyId}/resend-credentials`, {
      method: 'POST',
    }),
}

// Faculty Operations API
export const facultyAPI = {
  getMyCourses: () => request('/faculty/courses'),
  getTimetable: () => request('/faculty/timetable'),
  getCourseRoster: (courseCode) => request(`/faculty/courses/${courseCode}/students`),
  updateCourse: (courseCode, payload) =>
    request(`/faculty/courses/${courseCode}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateStudentGrade: (courseCode, studentId, grade) =>
    request(`/faculty/courses/${courseCode}/students/${studentId}/grade`, {
      method: 'POST',
      body: JSON.stringify({ grade }),
    }),
}

export default {
  auth: authAPI,
  meta: metaAPI,
  student: studentAPI,
  admin: adminAPI,
  faculty: facultyAPI,
}

