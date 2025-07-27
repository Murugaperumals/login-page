class WhatsAppScheduler {
    constructor() {
        this.messages = this.loadMessages();
        this.init();
        this.checkScheduledMessages();
        
        // Check for scheduled messages every minute
        setInterval(() => this.checkScheduledMessages(), 60000);
        
        // Update relative times every 30 seconds
        setInterval(() => this.updateDisplayedTimes(), 30000);
    }

    init() {
        this.bindEvents();
        this.renderMessages();
        this.updateStats();
    }

    bindEvents() {
        document.getElementById('scheduleForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('clearAll').addEventListener('click', () => this.clearAllMessages());
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
        document.getElementById('toastClose').addEventListener('click', () => this.hideToast());
        
        // Auto-hide toast after 5 seconds
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toast') && e.target.classList.contains('show')) {
                this.hideToast();
            }
        });
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const message = document.getElementById('message').value.trim();
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;

        // Validate phone number
        if (!this.validatePhone(phone)) {
            this.showToast('Please enter a valid phone number with country code (e.g., +1234567890)', 'error');
            return;
        }

        // Validate date/time
        const scheduledDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        
        if (scheduledDateTime <= now) {
            this.showToast('Please select a future date and time', 'error');
            return;
        }

        const newMessage = {
            id: Date.now(),
            name,
            phone: this.formatPhone(phone),
            message,
            scheduledTime: scheduledDateTime.toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.messages.push(newMessage);
        this.saveMessages();
        this.renderMessages();
        this.updateStats();
        
        document.getElementById('scheduleForm').reset();
        this.showToast('Message scheduled successfully!', 'success');
    }

    validatePhone(phone) {
        // Remove all non-digit characters except +
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        
        // Check if it starts with + and has 10-15 digits
        return /^\+\d{10,15}$/.test(cleanPhone);
    }

    formatPhone(phone) {
        // Remove all non-digit characters except +
        return phone.replace(/[^\d+]/g, '');
    }

    renderMessages() {
        const tbody = document.querySelector('#scheduleTable tbody');
        const emptyState = document.getElementById('emptyState');
        
        if (this.messages.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        // Sort messages by scheduled time
        const sortedMessages = [...this.messages].sort((a, b) => 
            new Date(a.scheduledTime) - new Date(b.scheduledTime)
        );

        tbody.innerHTML = sortedMessages.map(msg => {
            const scheduledTime = new Date(msg.scheduledTime);
            const now = new Date();
            const isOverdue = scheduledTime < now && msg.status === 'pending';
            
            return `
                <tr class="message-row ${msg.status}" data-id="${msg.id}">
                    <td>
                        <div class="contact-info">
                            <strong>${this.escapeHtml(msg.name)}</strong>
                        </div>
                    </td>
                    <td>
                        <span class="phone">${msg.phone}</span>
                    </td>
                    <td>
                        <div class="message-preview" title="${this.escapeHtml(msg.message)}">
                            ${this.escapeHtml(this.truncateMessage(msg.message, 50))}
                        </div>
                    </td>
                    <td>
                        <div class="time-info">
                            <div class="scheduled-time">${this.formatDateTime(scheduledTime)}</div>
                            <div class="relative-time ${isOverdue ? 'overdue' : ''}">${this.getRelativeTime(scheduledTime)}</div>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge status-${msg.status}">
                            ${this.getStatusIcon(msg.status)} ${this.capitalizeFirst(msg.status)}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            ${msg.status === 'pending' ? 
                                `<button onclick="scheduler.sendNow(${msg.id})" class="btn-send" title="Send Now">
                                    <i class="fas fa-paper-plane"></i>
                                </button>` : ''
                            }
                            ${msg.status === 'sent' ? 
                                `<a href="${this.generateWhatsAppLink(msg.phone, msg.message)}" target="_blank" class="btn-whatsapp" title="Open in WhatsApp">
                                    <i class="fab fa-whatsapp"></i>
                                </a>` : ''
                            }
                            <button onclick="scheduler.editMessage(${msg.id})" class="btn-edit" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="scheduler.deleteMessage(${msg.id})" class="btn-delete" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    checkScheduledMessages() {
        const now = new Date();
        let messagesSent = 0;

        this.messages.forEach(msg => {
            if (msg.status === 'pending') {
                const scheduledTime = new Date(msg.scheduledTime);
                
                if (now >= scheduledTime) {
                    this.sendMessage(msg.id);
                    messagesSent++;
                }
            }
        });

        if (messagesSent > 0) {
            this.renderMessages();
            this.updateStats();
            this.showToast(`${messagesSent} message(s) are ready to send!`, 'info');
        }
    }

    sendMessage(id) {
        const message = this.messages.find(msg => msg.id === id);
        if (!message) return;

        // Generate WhatsApp link and open it
        const whatsappLink = this.generateWhatsAppLink(message.phone, message.message);
        
        // Mark as sent
        message.status = 'sent';
        message.sentAt = new Date().toISOString();
        
        this.saveMessages();
        
        // Open WhatsApp
        window.open(whatsappLink, '_blank');
    }

    sendNow(id) {
        this.sendMessage(id);
        this.renderMessages();
        this.updateStats();
        this.showToast('Opening WhatsApp...', 'success');
    }

    generateWhatsAppLink(phone, message) {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }

    editMessage(id) {
        const message = this.messages.find(msg => msg.id === id);
        if (!message) return;

        // Populate form with existing data
        document.getElementById('name').value = message.name;
        document.getElementById('phone').value = message.phone;
        document.getElementById('message').value = message.message;
        
        const scheduledTime = new Date(message.scheduledTime);
        document.getElementById('date').value = scheduledTime.toISOString().split('T')[0];
        document.getElementById('time').value = scheduledTime.toTimeString().slice(0, 5);

        // Delete the original message
        this.deleteMessage(id, false);
        
        // Scroll to form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('name').focus();
    }

    deleteMessage(id, showToast = true) {
        this.messages = this.messages.filter(msg => msg.id !== id);
        this.saveMessages();
        this.renderMessages();
        this.updateStats();
        
        if (showToast) {
            this.showToast('Message deleted', 'info');
        }
    }

    clearAllMessages() {
        if (this.messages.length === 0) {
            this.showToast('No messages to clear', 'info');
            return;
        }

        if (confirm('Are you sure you want to delete all scheduled messages?')) {
            this.messages = [];
            this.saveMessages();
            this.renderMessages();
            this.updateStats();
            this.showToast('All messages cleared', 'info');
        }
    }

    updateStats() {
        const total = this.messages.length;
        const pending = this.messages.filter(msg => msg.status === 'pending').length;
        const sent = this.messages.filter(msg => msg.status === 'sent').length;

        document.getElementById('totalMessages').textContent = `Total: ${total}`;
        document.getElementById('pendingMessages').textContent = `Pending: ${pending}`;
        document.getElementById('sentMessages').textContent = `Sent: ${sent}`;
    }

    updateDisplayedTimes() {
        document.querySelectorAll('.relative-time').forEach(element => {
            const row = element.closest('.message-row');
            const messageId = parseInt(row.dataset.id);
            const message = this.messages.find(msg => msg.id === messageId);
            
            if (message) {
                const scheduledTime = new Date(message.scheduledTime);
                const now = new Date();
                const isOverdue = scheduledTime < now && message.status === 'pending';
                
                element.textContent = this.getRelativeTime(scheduledTime);
                element.className = `relative-time ${isOverdue ? 'overdue' : ''}`;
            }
        });
    }

    exportData() {
        if (this.messages.length === 0) {
            this.showToast('No data to export', 'info');
            return;
        }

        const dataStr = JSON.stringify(this.messages, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `whatsapp-scheduler-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Data exported successfully', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (Array.isArray(importedData)) {
                    // Validate data structure
                    const validMessages = importedData.filter(msg => 
                        msg.id && msg.name && msg.phone && msg.message && msg.scheduledTime
                    );
                    
                    if (validMessages.length > 0) {
                        this.messages = [...this.messages, ...validMessages];
                        this.saveMessages();
                        this.renderMessages();
                        this.updateStats();
                        this.showToast(`Imported ${validMessages.length} messages`, 'success');
                    } else {
                        this.showToast('No valid messages found in file', 'error');
                    }
                } else {
                    this.showToast('Invalid file format', 'error');
                }
            } catch (error) {
                this.showToast('Error reading file', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    // Utility methods
    loadMessages() {
        try {
            const stored = localStorage.getItem('whatsappScheduledMessages');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading messages:', error);
            return [];
        }
    }

    saveMessages() {
        try {
            localStorage.setItem('whatsappScheduledMessages', JSON.stringify(this.messages));
        } catch (error) {
            console.error('Error saving messages:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    getRelativeTime(date) {
        const now = new Date();
        const diff = date - now;
        const absDiff = Math.abs(diff);
        
        const minutes = Math.floor(absDiff / (1000 * 60));
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        
        if (diff < 0) {
            // Past time
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            return `${days}d ago`;
        } else {
            // Future time
            if (minutes < 60) return `in ${minutes}m`;
            if (hours < 24) return `in ${hours}h`;
            return `in ${days}d`;
        }
    }

    getStatusIcon(status) {
        const icons = {
            pending: '<i class="fas fa-clock"></i>',
            sent: '<i class="fas fa-check"></i>',
            failed: '<i class="fas fa-times"></i>'
        };
        return icons[status] || '';
    }

    truncateMessage(message, length) {
        return message.length > length ? message.substring(0, length) + '...' : message;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => this.hideToast(), 5000);
    }

    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('show');
    }
}

// Initialize the scheduler when the page loads
let scheduler;
document.addEventListener('DOMContentLoaded', () => {
    scheduler = new WhatsAppScheduler();

    // Set minimum date to today
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;

    // WhatsApp automation limitation notice dismiss
    const waNotice = document.getElementById('waNotice');
    const waNoticeClose = document.getElementById('waNoticeClose');
    if (waNotice && waNoticeClose) {
        waNoticeClose.onclick = () => waNotice.style.display = 'none';
    }
});
