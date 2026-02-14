// Global variables
let currentTaskId = null;
let selectedColor = "#6366f1";
let selectedPriority = "medium";
let selectedStatus = "not-started";
let currentCategory = "all";
let currentStatus = "all";

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadTasks();
    loadStats();
});

function initializeEventListeners() {
    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = option.dataset.color;
            document.getElementById('taskColor').value = selectedColor;
        });
    });

    // Priority selector
    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.priority-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedPriority = option.dataset.priority;
            document.getElementById('taskPriority').value = selectedPriority;
        });
    });

    // Status selector
    document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedStatus = option.dataset.status;
            document.getElementById('taskStatus').value = selectedStatus;
        });
    });

    // Category filter
    document.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadTasks();
        });
    });

    // Status filter
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatus = btn.dataset.status;
            loadTasks();
        });
    });

    // All tasks filter
    document.querySelector('[data-filter="all"]').addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        currentCategory = 'all';
        loadTasks();
    });

    // Form submission
    document.getElementById('taskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTask();
    });

    // Cancel edit
    document.getElementById('cancelBtn').addEventListener('click', resetForm);

    // Search input
    document.getElementById('searchInput').addEventListener('input', debounce(loadTasks, 300));
}

async function saveTask() {
    const taskData = {
        name: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        category: document.getElementById('taskCategory').value,
        color: selectedColor,
        priority: selectedPriority,
        status: selectedStatus
    };

    if (!taskData.name) {
        showAlert('Task title is required!', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loader"></span> Saving...';
    submitBtn.disabled = true;

    try {
        let response;
        if (currentTaskId) {
            response = await fetch(`/api/items/${currentTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            response = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }

        const result = await response.json();
        
        if (response.ok) {
            showAlert(
                currentTaskId ? 'Task updated successfully!' : 'Task created successfully!',
                'success'
            );
            resetForm();
            await loadTasks();
            await loadStats();
        } else {
            showAlert(result.error || 'Failed to save task', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadTasks() {
    const searchTerm = document.getElementById('searchInput').value;
    let url = '/api/items';
    const params = [];
    
    if (searchTerm) {
        params.push(`search=${encodeURIComponent(searchTerm)}`);
    }
    if (currentCategory !== 'all') {
        params.push(`category=${currentCategory}`);
    }
    if (currentStatus !== 'all') {
        params.push(`status=${currentStatus}`);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }

    try {
        const response = await fetch(url);
        const result = await response.json();
        
        const tasksContainer = document.getElementById('tasksContainer');
        
        if (result.items && result.items.length > 0) {
            // Update header stats
            const totalTasks = result.total || result.items.length;
            const inProgress = result.items.filter(item => item.status === 'in-progress').length;
            const completed = result.items.filter(item => item.status === 'completed').length;
            
            document.getElementById('totalTasks').textContent = totalTasks;
            document.getElementById('activeTasks').textContent = inProgress;
            document.getElementById('completedTasks').textContent = completed;
            
            tasksContainer.innerHTML = result.items.map(item => createTaskCard(item)).join('');
        } else {
            tasksContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <h3 class="empty-title">No tasks found</h3>
                    <p class="empty-description">
                        ${searchTerm || currentCategory !== 'all' || currentStatus !== 'all'
                            ? 'Try changing your filters' 
                            : 'Create your first task using the form!'}
                    </p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showAlert('Failed to load tasks', 'error');
    }
}

function createTaskCard(item) {
    const priorityClasses = {
        low: 'priority-low-bg',
        medium: 'priority-medium-bg',
        high: 'priority-high-bg'
    };
    
    const statusClasses = {
        'not-started': 'status-not-started-bg',
        'in-progress': 'status-in-progress-bg',
        'completed': 'status-completed-bg'
    };
    
    const statusIcons = {
        'not-started': 'far fa-circle',
        'in-progress': 'fas fa-spinner',
        'completed': 'fas fa-check-circle'
    };
    
    const statusText = {
        'not-started': 'Not Started',
        'in-progress': 'In Progress',
        'completed': 'Completed'
    };
    
    const priorityText = {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
    };
    
    const categoryIcons = {
        work: '💼',
        personal: '👤',
        shopping: '🛒',
        health: '🏥',
        learning: '📚',
        finance: '💰',
        home: '🏠',
        other: '🔮'
    };

    return `
        <div class="task-card" style="border-left: 4px solid ${item.color || '#6366f1'}">
            <div class="task-header">
                <h3 class="task-title">${escapeHtml(item.name)}</h3>
                <div class="task-badges">
                    <span class="task-priority ${priorityClasses[item.priority || 'medium']}">
                        ${priorityText[item.priority || 'medium']}
                    </span>
                    <span class="task-status-badge ${statusClasses[item.status || 'not-started']}">
                        <i class="${statusIcons[item.status || 'not-started']}"></i>
                        ${statusText[item.status || 'not-started']}
                    </span>
                </div>
            </div>
            ${item.description ? `
                <p class="task-description">${escapeHtml(item.description)}</p>
            ` : ''}
            <div class="task-footer">
                <div class="task-meta">
                    <span class="task-meta-item">
                        <i class="fas fa-tag"></i>
                        ${categoryIcons[item.category] || '🔮'} ${item.category}
                    </span>
                    <span class="task-meta-item">
                        <i class="far fa-calendar"></i>
                        ${formatDate(item.createdAt)}
                    </span>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit-btn" onclick="editTask('${item._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTask('${item._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function editTask(id) {
    try {
        const response = await fetch(`/api/items/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const task = result.item;
            currentTaskId = id;
            
            // Fill form
            document.getElementById('taskTitle').value = task.name;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskCategory').value = task.category || 'work';
            
            // Set priority
            selectedPriority = task.priority || 'medium';
            document.getElementById('taskPriority').value = selectedPriority;
            document.querySelectorAll('.priority-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.priority === selectedPriority) {
                    opt.classList.add('selected');
                }
            });
            
            // Set status
            selectedStatus = task.status || 'not-started';
            document.getElementById('taskStatus').value = selectedStatus;
            document.querySelectorAll('.status-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.status === selectedStatus) {
                    opt.classList.add('selected');
                }
            });
            
            // Set color
            selectedColor = task.color || '#6366f1';
            document.getElementById('taskColor').value = selectedColor;
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.color === selectedColor) {
                    opt.classList.add('selected');
                }
            });
            
            // Update UI
            document.getElementById('formTitle').textContent = 'Edit Task';
            document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Update Task';
            document.getElementById('cancelBtn').style.display = 'block';
            
            // Scroll to form
            document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
            
            showAlert('Editing task...', 'success');
        }
    } catch (error) {
        showAlert('Failed to load task for editing', 'error');
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`/api/items/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Task deleted successfully!', 'success');
            await loadTasks();
            await loadStats();
        } else {
            showAlert(result.error || 'Failed to delete task', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        
        if (result.success) {
            const statsContainer = document.getElementById('statsContainer');
            
            // Status stats
            const statusStats = result.statusStats || [];
            const statusMap = {
                'not-started': 'Not Started',
                'in-progress': 'In Progress',
                'completed': 'Completed'
            };
            
            const statusHtml = statusStats.map(stat => `
                <div class="stat-mini-item">
                    <span class="stat-mini-label">
                        <i class="fas ${stat._id === 'not-started' ? 'fa-circle' : stat._id === 'in-progress' ? 'fa-spinner' : 'fa-check-circle'}"></i>
                        ${statusMap[stat._id] || stat._id}
                    </span>
                    <span class="stat-mini-value">${stat.count}</span>
                </div>
            `).join('');
            
            // Category stats
            const categoryHtml = result.categories.map(cat => `
                <div class="stat-mini-item">
                    <span class="stat-mini-label">
                        <i class="fas fa-folder" style="color: ${getCategoryColor(cat._id)}"></i>
                        ${cat._id}
                    </span>
                    <span class="stat-mini-value">${cat.count}</span>
                </div>
            `).join('');
            
            statsContainer.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h4 style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.8rem;">BY STATUS</h4>
                    ${statusHtml}
                </div>
                <div>
                    <h4 style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.8rem;">BY CATEGORY</h4>
                    ${categoryHtml}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function resetForm() {
    document.getElementById('taskForm').reset();
    document.getElementById('taskCategory').value = 'work';
    
    // Reset priority
    selectedPriority = "medium";
    document.getElementById('taskPriority').value = selectedPriority;
    document.querySelectorAll('.priority-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.priority === 'medium') {
            opt.classList.add('selected');
        }
    });
    
    // Reset status
    selectedStatus = "not-started";
    document.getElementById('taskStatus').value = selectedStatus;
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.status === 'not-started') {
            opt.classList.add('selected');
        }
    });
    
    // Reset color
    selectedColor = "#6366f1";
    document.getElementById('taskColor').value = selectedColor;
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === '#6366f1') {
            opt.classList.add('selected');
        }
    });
    
    // Reset UI
    currentTaskId = null;
    document.getElementById('formTitle').textContent = 'Create New Task';
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> Create Task';
    document.getElementById('cancelBtn').style.display = 'none';
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.id = alertId;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} alert-icon"></i>
        <div>${message}</div>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateX(100%)';
            setTimeout(() => alertElement.remove(), 300);
        }
    }, 3000);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
}

function getCategoryColor(category) {
    const colors = {
        work: '#7c93ff',
        personal: '#34d399',
        shopping: '#fbbf24',
        health: '#f87171',
        learning: '#c084fc',
        finance: '#60a5fa',
        home: '#f472b6',
        other: '#9aa8b9'
    };
    return colors[category] || '#7c93ff';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}