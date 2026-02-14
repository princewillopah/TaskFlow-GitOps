
        // Global variables
        let currentTaskId = null;
        let selectedColor = "#6366f1";
        let selectedPriority = "medium";
        let currentCategory = "all";

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

            // Category filter
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentCategory = btn.dataset.category;
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
        }

        async function saveTask() {
            const taskData = {
                name: document.getElementById('taskTitle').value.trim(),
                description: document.getElementById('taskDescription').value.trim(),
                category: document.getElementById('taskCategory').value,
                color: selectedColor,
                priority: selectedPriority
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
                    // Update existing task
                    response = await fetch(`/api/items/${currentTaskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(taskData)
                    });
                } else {
                    // Create new task
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
            
            if (params.length > 0) {
                url += '?' + params.join('&');
            }

            try {
                const response = await fetch(url);
                const result = await response.json();
                
                const tasksContainer = document.getElementById('tasksContainer');
                
                if (result.items && result.items.length > 0) {
                    // Update header stats
                    document.getElementById('totalTasks').textContent = result.total || result.items.length;
                    document.getElementById('activeTasks').textContent = result.items.length;
                    
                    // Count unique categories
                    const uniqueCategories = [...new Set(result.items.map(item => item.category))];
                    document.getElementById('categoriesCount').textContent = uniqueCategories.length;
                    
                    tasksContainer.innerHTML = result.items.map(item => createTaskCard(item)).join('');
                } else {
                    tasksContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <h3 class="empty-title">No tasks found</h3>
                            <p class="empty-description">
                                ${searchTerm || currentCategory !== 'all' 
                                    ? 'Try changing your search or filter criteria' 
                                    : 'Create your first task using the form on the left!'}
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
                <div class="task-card" style="border-left-color: ${item.color || '#6366f1'}">
                    <div class="task-header">
                        <h3 class="task-title">${escapeHtml(item.name)}</h3>
                        <span class="task-priority ${priorityClasses[item.priority || 'medium']}">
                            ${priorityText[item.priority || 'medium']}
                        </span>
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
                    
                    const statsHtml = result.categories.map(cat => `
                        <div class="stat-card" style="border-top-color: ${getCategoryColor(cat._id)}">
                            <div class="stat-icon" style="background: ${getCategoryColor(cat._id)}20; color: ${getCategoryColor(cat._id)}">
                                <i class="fas fa-folder"></i>
                            </div>
                            <div class="stat-value">${cat.count}</div>
                            <div class="stat-label">${cat._id} Tasks</div>
                        </div>
                    `).join('');
                    
                    statsContainer.innerHTML = statsHtml;
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
