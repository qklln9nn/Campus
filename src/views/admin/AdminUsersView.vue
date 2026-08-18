<template>
  <div class="admin-users-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">User & Role Management</h1>
        <p class="page-subtitle">Manage registered accounts, assign administrative roles, and regulate access privileges.</p>
      </div>

      <div class="header-actions">
        <el-input v-model="searchQuery" placeholder="Search by name, email, or student ID..." style="width: 300px" clearable>
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="roleFilter" placeholder="Filter Role" clearable style="width: 140px">
          <el-option label="Student" value="student" />
          <el-option label="Organiser" value="organiser" />
          <el-option label="Admin" value="admin" />
        </el-select>
      </div>
    </div>

    <!-- Users Table Card -->
    <div class="table-container">
      <el-table :data="filteredUsers" style="width: 100%" size="large">
        <el-table-column label="User Profile" min-width="260">
          <template #default="{ row }">
            <div class="user-profile-cell">
              <div class="avatar-box" :class="row.role">
                {{ row.name.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <div class="user-name">{{ row.name }}</div>
                <div class="user-email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="studentId" label="Student/Staff ID" width="160" />

        <el-table-column prop="department" label="Department/Major" width="200" />

        <el-table-column prop="role" label="Role Tag" width="140">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" effect="dark" class="role-tag">
              {{ row.role.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Account Status" width="140">
          <template #default="{ row }">
            <span class="status-indicator" :class="row.status">
              <span class="status-dot" /> {{ row.status === 'active' ? 'Active' : 'Suspended' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" plain @click="openRoleModal(row)">
                Change Role
              </el-button>

              <el-button
                v-if="row.status === 'active'"
                type="danger"
                size="small"
                plain
                @click="toggleStatus(row)"
              >
                Suspend
              </el-button>
              <el-button
                v-else
                type="success"
                size="small"
                plain
                @click="toggleStatus(row)"
              >
                Unban
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Role Edit Dialog -->
    <el-dialog v-model="dialogVisible" title="Change User Privilege Role" width="420px">
      <div v-if="editingUser" class="dialog-body">
        <p>User: <strong>{{ editingUser.name }}</strong> ({{ editingUser.email }})</p>

        <div class="role-select-box">
          <label>Select Target Role:</label>
          <el-radio-group v-model="selectedNewRole" size="large">
            <el-radio label="student" border>Student</el-radio>
            <el-radio label="organiser" border>Event Organiser</el-radio>
            <el-radio label="admin" border>System Admin</el-radio>
          </el-radio-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="danger" @click="saveRoleChange">Save Role</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const searchQuery = ref('')
const roleFilter = ref('')
const dialogVisible = ref(false)
const editingUser = ref<any>(null)
const selectedNewRole = ref('student')

// Mock Users List
const usersList = ref([
  {
    id: 1,
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@campus.edu',
    studentId: 'FAC-202109',
    department: 'School of Computer Science',
    role: 'organiser',
    status: 'active',
  },
  {
    id: 2,
    name: 'Alexander Chen',
    email: 'alex.chen@student.campus.edu',
    studentId: '202308129',
    department: 'Software Engineering',
    role: 'student',
    status: 'active',
  },
  {
    id: 3,
    name: 'Emily Davis',
    email: 'emily.davis@campus.edu',
    studentId: 'ADM-1002',
    department: 'Student Affairs Center',
    role: 'admin',
    status: 'active',
  },
  {
    id: 4,
    name: 'Michael Scott',
    email: 'm.scott@temp.com',
    studentId: '202209441',
    department: 'Business School',
    role: 'student',
    status: 'suspended',
  },
])

const filteredUsers = computed(() => {
  return usersList.value.filter((user) => {
    if (roleFilter.value && user.role !== roleFilter.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.studentId.toLowerCase().includes(q)
      )
    }
    return true
  })
})

function getRoleTagType(role: string) {
  switch (role) {
    case 'admin': return 'danger'
    case 'organiser': return 'warning'
    case 'student': return 'info'
    default: return 'info'
  }
}

function openRoleModal(user: any) {
  editingUser.value = user
  selectedNewRole.value = user.role
  dialogVisible.value = true
}

function saveRoleChange() {
  if (editingUser.value) {
    editingUser.value.role = selectedNewRole.value
    ElMessage.success(`Updated role for ${editingUser.value.name} to ${selectedNewRole.value.toUpperCase()}.`)
    dialogVisible.value = false
  }
}

function toggleStatus(user: any) {
  const newStatus = user.status === 'active' ? 'suspended' : 'active'
  const actionText = newStatus === 'suspended' ? 'Suspend' : 'Unban'

  ElMessageBox.confirm(`Are you sure you want to ${actionText.toLowerCase()} user "${user.name}"?`, 'Confirm User Status Change', {
    confirmButtonText: actionText,
    cancelButtonText: 'Cancel',
    type: newStatus === 'suspended' ? 'warning' : 'info',
  }).then(() => {
    user.status = newStatus
    ElMessage.success(`User ${user.name} status updated to ${newStatus}.`)
  }).catch(() => {})
}
</script>

<style scoped>
.admin-users-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.table-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 8px;
}

.user-profile-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-box {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #ffffff;
  font-size: 1.1rem;
}

.avatar-box.admin { background: linear-gradient(135deg, #ef4444, #dc2626); }
.avatar-box.organiser { background: linear-gradient(135deg, #f59e0b, #d97706); }
.avatar-box.student { background: linear-gradient(135deg, #3b82f6, #2563eb); }

.user-name {
  font-weight: 700;
  color: #0f172a;
}

.user-email {
  font-size: 0.78rem;
  color: #64748b;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
}

.status-indicator.active { color: #059669; }
.status-indicator.suspended { color: #dc2626; }

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
}

.role-select-box {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-select-box label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
}
</style>
