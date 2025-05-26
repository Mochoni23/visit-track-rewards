// Application State
let customers = [];
let visits = [];
let rewardThreshold = 5;

// DOM Elements
const visitForm = document.getElementById('visitForm');
const phoneInput = document.getElementById('phone');
const nameInput = document.getElementById('name');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValue = document.getElementById('thresholdValue');
const customerList = document.getElementById('customerList');
const notification = document.getElementById('notification');

// Analytics elements
const totalCustomersEl = document.getElementById('totalCustomers');
const totalVisitsEl = document.getElementById('totalVisits');
const totalRewardsEl = document.getElementById('totalRewards');
const visitsTodayEl = document.getElementById('visitsToday');

// QR Code elements
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrReader = document.getElementById('qr-reader');
const qrResult = document.getElementById('qr-result');

let html5QrCodeInstance = null;
let qrIsRunning = false;

// Load data from localStorage
function loadData() {
    const savedCustomers = localStorage.getItem('loyaltyCustomers');
    const savedVisits = localStorage.getItem('loyaltyVisits');
    const savedThreshold = localStorage.getItem('loyaltyThreshold');

    if (savedCustomers) customers = JSON.parse(savedCustomers);
    if (savedVisits) visits = JSON.parse(savedVisits);
    if (savedThreshold) {
        rewardThreshold = parseInt(savedThreshold);
        thresholdSlider.value = rewardThreshold;
        thresholdValue.textContent = rewardThreshold;
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('loyaltyCustomers', JSON.stringify(customers));
    localStorage.setItem('loyaltyVisits', JSON.stringify(visits));
    localStorage.setItem('loyaltyThreshold', rewardThreshold.toString());
}

// Format phone number
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Add customer visit
function addCustomerVisit(phone, name) {
    const formattedPhone = formatPhoneNumber(phone);
    const existingCustomer = customers.find(c => c.phone === formattedPhone);
    const visitId = Date.now().toString();
    const timestamp = new Date().toISOString();

    if (existingCustomer) {
        const newVisitCount = existingCustomer.visits + 1;
        const rewardEarned = newVisitCount % rewardThreshold === 0;
        
        // Update customer
        existingCustomer.visits = newVisitCount;
        existingCustomer.lastVisit = timestamp;
        if (name && name.trim()) {
            existingCustomer.name = name.trim();
        }
        if (rewardEarned) {
            existingCustomer.totalRewardsEarned++;
        }

        // Add visit record
        visits.push({
            id: visitId,
            customerId: existingCustomer.id,
            timestamp,
            rewardEarned
        });

        if (rewardEarned) {
            showNotification(`🎉 Reward earned for ${existingCustomer.name || formattedPhone}! They've completed ${rewardThreshold} visits!`);
            playSound('rewardSound');
            if (typeof confetti === 'function') confetti();
        }
    } else {
        const rewardEarned = rewardThreshold === 1;
        const newCustomer = {
            id: Date.now().toString(),
            phone: formattedPhone,
            name: name && name.trim() ? name.trim() : null,
            visits: 1,
            totalRewardsEarned: rewardEarned ? 1 : 0,
            lastVisit: timestamp,
            rewardThreshold
        };

        customers.push(newCustomer);
        visits.push({
            id: visitId,
            customerId: newCustomer.id,
            timestamp,
            rewardEarned
        });

        if (rewardEarned) {
            showNotification(`🎉 Welcome reward for ${newCustomer.name || formattedPhone}! First visit reward earned!`);
            playSound('rewardSound');
            if (typeof confetti === 'function') confetti();
        }
    }

    saveData();
    updateUI();
}

// Update analytics
function updateAnalytics() {
    const totalCustomers = customers.length;
    const totalVisits = visits.length;
    const totalRewards = customers.reduce((sum, c) => sum + c.totalRewardsEarned, 0);
    
    const today = new Date().toDateString();
    const visitsToday = visits.filter(v => new Date(v.timestamp).toDateString() === today).length;

    totalCustomersEl.textContent = totalCustomers;
    totalVisitsEl.textContent = totalVisits;
    totalRewardsEl.textContent = totalRewards;
    visitsTodayEl.textContent = visitsToday;
}

// Render customer list
function renderCustomerList() {
    if (customers.length === 0) {
        customerList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>No customers yet. Add your first customer visit above!</p>
            </div>
        `;
        return;
    }

    const sortedCustomers = [...customers].sort((a, b) => b.visits - a.visits);
    
    customerList.innerHTML = sortedCustomers.map(customer => {
        const progressPercentage = ((customer.visits % rewardThreshold) / rewardThreshold) * 100;
        const visitsUntilReward = rewardThreshold - (customer.visits % rewardThreshold);
        
        return `
            <div class="customer-item">
                <div class="customer-info">
                    <h3>${customer.name || customer.phone}</h3>
                    <p>Last visit: ${formatDate(customer.lastVisit)}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <p style="font-size: 0.75rem; margin-top: 0.25rem; color: #6b7280;">
                        ${visitsUntilReward === rewardThreshold ? 'Ready for reward!' : `${visitsUntilReward} visits until next reward`}
                    </p>
                </div>
                <div class="visit-badge">${customer.visits} visits</div>
            </div>
        `;
    }).join('');
}

// Update entire UI
function updateUI() {
    updateAnalytics();
    renderCustomerList();
}

// Play sound
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play();
    }
}

// Event Listeners
visitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();
    const name = nameInput.value.trim();

    if (!phone) return;

    addCustomerVisit(phone, name);
    playSound('successSound');
    
    // Reset form
    phoneInput.value = '';
    nameInput.value = '';
});

thresholdSlider.addEventListener('input', (e) => {
    rewardThreshold = parseInt(e.target.value);
    thresholdValue.textContent = rewardThreshold;
    saveData();
});

// Phone number formatting
phoneInput.addEventListener('input', (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
        e.target.value = value;
    }
});

phoneInput.addEventListener('blur', (e) => {
    if (e.target.value) {
        e.target.value = formatPhoneNumber(e.target.value);
    }
});

// Reset data button
const resetDataBtn = document.getElementById('resetDataBtn');
if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all customer and visit data?')) {
            localStorage.removeItem('loyaltyCustomers');
            localStorage.removeItem('loyaltyVisits');
            localStorage.removeItem('loyaltyThreshold');
            customers = [];
            visits = [];
            rewardThreshold = 5;
            thresholdSlider.value = 5;
            thresholdValue.textContent = 5;
            updateUI();
            showNotification('All data has been reset.');
        }
    });
}

// QR Scanner Implementation
let html5QrcodeScanner = null;
let isScanning = false;

// Initialize QR Scanner
function initializeQRScanner() {
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    rememberLastUsedCamera: true,
    aspectRatio: 1.0
  };

  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader", 
    config, 
    false
  );
}

// Handle successful QR scan
function onScanSuccess(decodedText, decodedResult) {
  console.log(`QR Code scanned: ${decodedText}`);
  
  // Check if it's a tel: URI format
  if (decodedText.startsWith('tel:')) {
    const phoneNumber = decodedText.replace('tel:', '').replace(/D/g, '');
    
    // Populate phone number field
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
      phoneInput.value = formatPhoneNumber(phoneNumber);
      showFeedback('Phone number captured successfully!', 'success');
    }
  } else {
    showFeedback('QR code detected but no phone number found', 'warning');
  }
  
  // Auto-stop scanning after successful read
  stopScanning();
}

// Handle scan errors
function onScanError(errorMessage) {
  // Handle different error types
  if (errorMessage.includes('NotAllowedError')) {
    showFeedback('Camera permission denied', 'error');
  } else if (errorMessage.includes('NotFoundError')) {
    showFeedback('No camera found on device', 'error');
  } else {
    // Don't show every scan attempt error, only real issues
    console.warn('QR scan error:', errorMessage);
  }
}

// Start scanning
function startScanning() {
  if (isScanning) return;
  
  try {
    html5QrcodeScanner.render(onScanSuccess, onScanError);
    isScanning = true;
    
    document.getElementById('scan-qr-btn').disabled = true;
    document.getElementById('stop-scan-btn').disabled = false;
    
    showFeedback('Camera started. Point at QR code.', 'info');
  } catch (error) {
    showFeedback('Failed to start camera: ' + error.message, 'error');
  }
}

// Stop scanning
function stopScanning() {
  if (!isScanning) return;
  
  try {
    html5QrcodeScanner.clear();
    isScanning = false;
    
    document.getElementById('scan-qr-btn').disabled = false;
    document.getElementById('stop-scan-btn').disabled = true;
    
    showFeedback('Scanner stopped', 'info');
  } catch (error) {
    console.error('Error stopping scanner:', error);
  }
}

// Format US phone number
function formatPhoneNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/D/g, '');
  const match = cleaned.match(/^(1|)?(d{3})(d{3})(d{4})$/);
  
  if (match) {
    const intlCode = (match[1] ? '+1 ' : '');
    return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
  }
  
  return phoneNumber;
}

// Show visual feedback
function showFeedback(message, type) {
  const resultDiv = document.getElementById('qr-result');
  resultDiv.innerHTML = `
    <div class="alert alert-${type}">
      <span class="icon">${getIconForType(type)}</span>
      <span class="message">${message}</span>
    </div>
  `;
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    resultDiv.innerHTML = '';
  }, 3000);
}

// Get icon for feedback type
function getIconForType(type) {
    switch(type) {
        case 'success':
            return '✅';
        case 'error':
            return '❌';
        case 'warning':
            return '⚠️';
        case 'info':
            return 'ℹ️';
        default:
            return '';
    }
}

// Event listeners
document.getElementById('scan-qr-btn').addEventListener('click', startScanning);
document.getElementById('stop-scan-btn').addEventListener('click', stopScanning);

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeQRScanner);
// Initialize app
loadData();
updateUI();