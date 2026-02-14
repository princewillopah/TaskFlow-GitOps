// Global variables
let currentTaskId = null;
let selectedColor = "#6366f1";
let selectedPriority = "medium";
let selectedStatus = "not-started";
let currentCategory = "all";
let currentStatusFilter = "all";

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TaskFlow initialized');
    initializeEventListeners();
    loadTasks();
    loadStats();
});

function initializeEventListeners() {
    console.log('Setting up event listeners...');
    
    // Color picker
    document.querySelectorAll('.color-swatch').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = option.dataset.color;
            document.getElementById('taskColor').value = selectedColor;
        });
    });

    // Priority selector
    document.querySelectorAll('.priority-btn').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.priority-btn').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedPriority = option.dataset.priority;
            document.getElementById('taskPriority').value = selectedPriority;
        });
    });

    // Status selector
    document.querySelectorAll('.status-btn').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.status-btn').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedStatus = option.dataset.status;
            document.getElementById('taskStatus').value = selectedStatus;
        });
    });

    // Category filter
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadTasks();
        });
    });

    // Status filter
    document.querySelectorAll('.status-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.status-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatusFilter = btn.dataset.statusFilter;
            loadTasks();
        });
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
    
    console.log('✅ Event listeners set up');
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
    submitBtn.innerHTML = '<span class="loader"></span> <span>Saving...</span>';
    submitBtn.disabled = true;

    try {
        let response;
        if (currentTaskId) {
            // Update existing task
            console.log(`Updating task ${currentTaskId}...`);
            response = await fetch(`/api/items/${currentTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            // Create new task
            console.log('Creating new task...');
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
        console.error('Save task error:', error);
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
    if (currentStatusFilter !== 'all') {
        params.push(`status=${currentStatusFilter}`);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }

    console.log(`Loading tasks from: ${url}`);

    try {
        const response = await fetch(url);
        const result = await response.json();
        
        console.log('Tasks loaded:', result);
        
        const tasksContainer = document.getElementById('tasksContainer');
        
        if (result.items && result.items.length > 0) {
            // Update header stats
            document.getElementById('totalTasks').textContent = result.total || result.items.length;
            
            // Count tasks by status
            const notStartedCount = result.items.filter(item => item.status === 'not-started' || !item.status).length;
            const inProgressCount = result.items.filter(item => item.status === 'in-progress').length;
            const completedCount = result.items.filter(item => item.status === 'completed').length;
            document.getElementById('notStartedTasks').textContent = notStartedCount;
            document.getElementById('inProgressTasks').textContent = inProgressCount;
            document.getElementById('completedTasks').textContent = completedCount;
            
            // Count unique categories
            const uniqueCategories = [...new Set(result.items.map(item => item.category))];
            document.getElementById('categoriesCount').textContent = uniqueCategories.length;
            
            tasksContainer.innerHTML = result.items.map(item => createTaskCard(item)).join('');
        } else {
            // Reset stats if no tasks
            document.getElementById('totalTasks').textContent = '0';
            document.getElementById('notStartedTasks').textContent = '0';
            document.getElementById('inProgressTasks').textContent = '0';
            document.getElementById('completedTasks').textContent = '0';
            document.getElementById('categoriesCount').textContent = '0';
            
            tasksContainer.innerHTML = `
                <div class="empty-placeholder">
                    <div class="placeholder-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3>${searchTerm || currentCategory !== 'all' || currentStatusFilter !== 'all' ? 'No tasks found' : 'No Tasks Yet'}</h3>
                    <p>
                        ${searchTerm || currentCategory !== 'all' || currentStatusFilter !== 'all'
                            ? 'Try changing your search or filter criteria' 
                            : 'Start by creating your first task using the panel on the left'}
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
    
    const priorityText = {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
    };
    
    const statusText = {
        'not-started': 'Not Started',
        'in-progress': 'In Progress',
        'completed': 'Completed'
    };
    
    const statusIcons = {
        'not-started': 'fa-circle',
        'in-progress': 'fa-spinner',
        'completed': 'fa-check-circle'
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

    const taskStatus = item.status || 'not-started';
    const completedClass = taskStatus === 'completed' ? 'completed' : '';

    return `
        <div class="task-card ${completedClass}" style="border-left-color: ${item.color || '#6366f1'}">
            <div class="task-header">
                <h3 class="task-title">${escapeHtml(item.name)}</h3>
                <div class="task-badges">
                    <span class="task-status-badge ${taskStatus}">
                        <i class="fas ${statusIcons[taskStatus]}"></i>
                        ${statusText[taskStatus]}
                    </span>
                    <span class="task-priority ${priorityClasses[item.priority || 'medium']}">
                        ${priorityText[item.priority || 'medium']}
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
                    <button class="action-btn toggle-btn" onclick="toggleTaskStatus('${item._id}', '${taskStatus}')" title="Toggle Status">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editTask('${item._id}')" title="Edit Task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTask('${item._id}')" title="Delete Task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function toggleTaskStatus(id, currentStatus) {
    console.log(`Toggling task ${id} from ${currentStatus}`);
    
    // Cycle through statuses: not-started -> in-progress -> completed -> not-started
    let newStatus;
    if (currentStatus === 'not-started' || !currentStatus) {
        newStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
        newStatus = 'completed';
    } else {
        newStatus = 'not-started';
    }
    
    try {
        const response = await fetch(`/api/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const statusMessages = {
                'not-started': 'Task marked as not started!',
                'in-progress': 'Task marked as in progress!',
                'completed': 'Task marked as completed!'
            };
            showAlert(statusMessages[newStatus], 'success');
            await loadTasks();
            await loadStats();
        } else {
            showAlert(result.error || 'Failed to update task status', 'error');
        }
    } catch (error) {
        console.error('Toggle status error:', error);
        showAlert('Network error. Please try again.', 'error');
    }
}

async function editTask(id) {
    console.log(`Editing task ${id}`);
    
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
            
            // Set status
            selectedStatus = task.status || 'not-started';
            document.getElementById('taskStatus').value = selectedStatus;
            document.querySelectorAll('.status-btn').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.status === selectedStatus) {
                    opt.classList.add('selected');
                }
            });
            
            // Set priority
            selectedPriority = task.priority || 'medium';
            document.getElementById('taskPriority').value = selectedPriority;
            document.querySelectorAll('.priority-btn').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.priority === selectedPriority) {
                    opt.classList.add('selected');
                }
            });
            
            // Set color
            selectedColor = task.color || '#6366f1';
            document.getElementById('taskColor').value = selectedColor;
            document.querySelectorAll('.color-swatch').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.color === selectedColor) {
                    opt.classList.add('selected');
                }
            });
            
            // Update UI
            document.getElementById('formTitle').textContent = 'Edit Task';
            document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> <span>Update Task</span>';
            document.getElementById('cancelBtn').style.display = 'flex';
            
            // Scroll to form
            document.querySelector('.control-panel').scrollIntoView({ behavior: 'smooth' });
            
            showAlert('Editing task...', 'success');
        }
    } catch (error) {
        console.error('Edit task error:', error);
        showAlert('Failed to load task for editing', 'error');
    }
}

async function deleteTask(id) {
    console.log(`Attempting to delete task ${id}`);
    
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
        console.error('Delete task error:', error);
        showAlert('Network error. Please try again.', 'error');
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        
        console.log('Stats loaded:', result);
        
        if (result.success) {
            // Load status stats
            const statusStatsContainer = document.getElementById('statusStatsContainer');
            if (result.statusStats && result.statusStats.length > 0) {
                const statusColors = {
                    'not-started': '#64748b',
                    'in-progress': '#f59e0b',
                    'completed': '#10b981'
                };
                const statusIcons = {
                    'not-started': 'fa-circle',
                    'in-progress': 'fa-spinner',
                    'completed': 'fa-check-circle'
                };
                const statusLabels = {
                    'not-started': 'Not Started',
                    'in-progress': 'In Progress',
                    'completed': 'Completed'
                };
                
                const statusHtml = result.statusStats.map(stat => `
                    <div class="stat-card" style="border-left-color: ${statusColors[stat._id] || '#6366f1'}">
                        <div class="stat-icon" style="background: ${statusColors[stat._id]}20; color: ${statusColors[stat._id]}">
                            <i class="fas ${statusIcons[stat._id]}"></i>
                        </div>
                        <div>
                            <div class="stat-value">${stat.count}</div>
                            <div class="stat-label">${statusLabels[stat._id]} Tasks</div>
                        </div>
                    </div>
                `).join('');
                statusStatsContainer.innerHTML = statusHtml;
            }
            
            // Load category stats
            const statsContainer = document.getElementById('statsContainer');
            if (result.categories && result.categories.length > 0) {
                const statsHtml = result.categories.map(cat => `
                    <div class="stat-card" style="border-left-color: ${getCategoryColor(cat._id)}">
                        <div class="stat-icon" style="background: ${getCategoryColor(cat._id)}20; color: ${getCategoryColor(cat._id)}">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div>
                            <div class="stat-value">${cat.count}</div>
                            <div class="stat-label">${cat._id} Tasks</div>
                        </div>
                    </div>
                `).join('');
                statsContainer.innerHTML = statsHtml;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function resetForm() {
    console.log('Resetting form...');
    
    document.getElementById('taskForm').reset();
    document.getElementById('taskCategory').value = 'work';
    
    // Reset status
    selectedStatus = "not-started";
    document.getElementById('taskStatus').value = selectedStatus;
    document.querySelectorAll('.status-btn').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.status === 'not-started') {
            opt.classList.add('selected');
        }
    });
    
    // Reset priority
    selectedPriority = "medium";
    document.getElementById('taskPriority').value = selectedPriority;
    document.querySelectorAll('.priority-btn').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.priority === 'medium') {
            opt.classList.add('selected');
        }
    });
    
    // Reset color
    selectedColor = "#6366f1";
    document.getElementById('taskColor').value = selectedColor;
    document.querySelectorAll('.color-swatch').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === '#6366f1') {
            opt.classList.add('selected');
        }
    });
    
    // Reset UI
    currentTaskId = null;
    document.getElementById('formTitle').textContent = 'Create New Task';
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> <span>Create Task</span>';
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
    
    // Remove alert after 3 seconds
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
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function getCategoryColor(category) {
    const colors = {
        work: '#6366f1',
        personal: '#10b981',
        shopping: '#f59e0b',
        health: '#ef4444',
        learning: '#8b5cf6',
        finance: '#3b82f6',
        home: '#ec4899',
        other: '#64748b'
    };
    return colors[category] || '#6366f1';
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

console.log('✅ TaskFlow script loaded successfully');