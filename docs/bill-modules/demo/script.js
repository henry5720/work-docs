// 報帳模組 JavaScript 功能實現

// 全域變數
let projects = [];
let currentProject = null;
let expenses = [];
let selectedFiles = [];
let currentMode = 'project'; // 'project' 或 'calendar'
let selectedDate = null;

// 將 calendarEvents 定義為全域變數，供 React 組件使用
window.calendarEvents = [];

// 初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化應用程式
function initializeApp() {
    loadMockData();
    renderProjectList();
    showEmptyState();
    updateCalendarEvents();
    // 延遲渲染日曆以確保 React 組件已載入
    setTimeout(() => {
        if (window.renderCalendar) {
            window.renderCalendar();
        }
    }, 500);
}

// 載入模擬數據 - 使用當前月份的日期
function loadMockData() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 生成當前月份的日期
    const getDateInCurrentMonth = (day) => {
        return new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
    };
    
    // 模擬專案數據
    projects = [
        {
            id: 1,
            name: '2024年第四季差旅費',
            description: '第四季出差相關費用報帳',
            budget: 50000,
            status: 'processing',
            createdAt: getDateInCurrentMonth(1),
            expenses: [
                {
                    id: 1,
                    date: getDateInCurrentMonth(5),
                    category: '交通',
                    invoiceNumber: 'TW12345678',
                    merchantName: '台灣高鐵',
                    amount: 1490,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '台北-台中商務出差'
                },
                {
                    id: 2,
                    date: getDateInCurrentMonth(5),
                    category: '住宿',
                    invoiceNumber: 'HT20241205',
                    merchantName: '日月千禧酒店',
                    amount: 4500,
                    currency: 'TWD',
                    status: 'pending',
                    notes: '出差住宿一晚'
                },
                {
                    id: 3,
                    date: getDateInCurrentMonth(6),
                    category: '餐飲',
                    invoiceNumber: 'RT87654321',
                    merchantName: '王品牛排',
                    amount: 1800,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '客戶拜訪用餐'
                },
                {
                    id: 7,
                    date: getDateInCurrentMonth(10),
                    category: '交通',
                    invoiceNumber: 'TW88888888',
                    merchantName: '桃園機場捷運',
                    amount: 160,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '機場接送'
                },
                {
                    id: 8,
                    date: getDateInCurrentMonth(15),
                    category: '餐飲',
                    invoiceNumber: 'RT99999999',
                    merchantName: '鼎泰豐',
                    amount: 2200,
                    currency: 'TWD',
                    status: 'pending',
                    notes: '商務午餐'
                }
            ]
        },
        {
            id: 2,
            name: '辦公用品採購',
            description: '辦公室文具用品採購報帳',
            budget: 15000,
            status: 'pending',
            createdAt: getDateInCurrentMonth(2),
            expenses: [
                {
                    id: 4,
                    date: getDateInCurrentMonth(8),
                    category: '辦公用品',
                    invoiceNumber: 'OF20241208',
                    merchantName: '誠品文具',
                    amount: 3200,
                    currency: 'TWD',
                    status: 'pending',
                    notes: '筆記本、原子筆等文具'
                },
                {
                    id: 9,
                    date: getDateInCurrentMonth(12),
                    category: '辦公用品',
                    invoiceNumber: 'OF20241212',
                    merchantName: '統一超商',
                    amount: 450,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '影印紙、文件夾'
                }
            ]
        },
        {
            id: 3,
            name: '會議費用',
            description: '月度會議相關費用',
            budget: 8000,
            status: 'completed',
            createdAt: getDateInCurrentMonth(3),
            expenses: [
                {
                    id: 5,
                    date: getDateInCurrentMonth(4),
                    category: '餐飲',
                    invoiceNumber: 'CF20241204',
                    merchantName: '85度C',
                    amount: 450,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '會議茶點'
                },
                {
                    id: 6,
                    date: getDateInCurrentMonth(18),
                    category: '餐飲',
                    invoiceNumber: 'CF20241218',
                    merchantName: 'Starbucks',
                    amount: 680,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '下午會議茶點'
                }
            ]
        }
    ];
}

// 模式切換功能
function switchMode(mode) {
    if (currentMode === mode) return;
    
    currentMode = mode;
    
    // 更新按鈕狀態
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    // 切換內容顯示
    if (mode === 'project') {
        showProjectMode();
    } else {
        showCalendarMode();
    }
}

// 顯示專案模式
function showProjectMode() {
    document.getElementById('projectSidebarContent').style.display = 'block';
    document.getElementById('calendarSidebarContent').style.display = 'none';
    document.getElementById('projectModeContent').style.display = 'flex';
    document.getElementById('calendarModeContent').style.display = 'none';
    document.getElementById('addProjectBtn').style.display = 'flex';
    
    // 重新渲染專案列表
    renderProjectList();
    updateMainContent();
}

// 顯示日曆模式
function showCalendarMode() {
    document.getElementById('projectSidebarContent').style.display = 'none';
    document.getElementById('calendarSidebarContent').style.display = 'block';
    document.getElementById('projectModeContent').style.display = 'none';
    document.getElementById('calendarModeContent').style.display = 'flex';
    document.getElementById('addProjectBtn').style.display = 'none';
    
    // 更新日曆統計和事件
    updateCalendarStats();
    updateCalendarEvents();
    
    // 重新渲染日曆
    setTimeout(() => {
        if (window.renderCalendar) {
            window.renderCalendar();
        }
    }, 100);
}

// 更新日曆統計資訊
function updateCalendarStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyCount = 0;
    let monthlyAmount = 0;
    
    projects.forEach(project => {
        project.expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
                monthlyCount++;
                monthlyAmount += expense.amount;
            }
        });
    });
    
    document.getElementById('monthlyCount').textContent = monthlyCount;
    document.getElementById('monthlyAmount').textContent = `$${monthlyAmount.toLocaleString()}`;
}

// 更新日曆事件
function updateCalendarEvents() {
    // 清空現有事件
    window.calendarEvents = [];
    
    projects.forEach(project => {
        project.expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            const event = {
                id: expense.id,
                title: `${expense.merchantName} - $${expense.amount}`,
                start: expenseDate,
                end: expenseDate,
                allDay: true,
                category: expense.category,
                amount: expense.amount,
                merchant: expense.merchantName,
                invoice: expense.invoiceNumber,
                projectId: project.id,
                expense: expense,
                project: project
            };
            window.calendarEvents.push(event);
        });
    });
    
    console.log('Calendar events updated:', window.calendarEvents.length, 'events');
    
    // 如果 FullCalendar 已初始化，直接更新事件
    if (window.refreshCalendarEvents && typeof window.refreshCalendarEvents === 'function') {
        window.refreshCalendarEvents();
    }
}

// 獲取類別顏色
function getCategoryColor(category) {
    const colors = {
        '餐飲': '#FF6B6B',
        '交通': '#4ECDC4',
        '住宿': '#45B7D1',
        '辦公用品': '#FFA07A',
        '其他': '#98D8C8'
    };
    return colors[category] || '#67BE5F';
}

// 顯示事件詳情（從日曆點擊事件觸發）
function showEventDetails(event) {
    console.log('Event details:', event);
    
    // 更新側邊欄選中日期詳情
    if (event.date) {
        updateSelectedDateDetails(new Date(event.date));
    }
    
    // 顯示 toast 通知
    const merchant = event.merchant || '未知商家';
    const amount = event.amount || 0;
    const category = event.category || '未分類';
    showToast(`${merchant}: $${amount} (${category})`, 'info');
}

// 更新選中日期詳情
function updateSelectedDateDetails(date) {
    selectedDate = date;
    const dateStr = new Date(date).toISOString().split('T')[0];
    
    // 找到該日期的所有報帳記錄
    const dayExpenses = [];
    projects.forEach(project => {
        project.expenses.forEach(expense => {
            if (expense.date === dateStr) {
                dayExpenses.push({
                    ...expense,
                    projectName: project.name
                });
            }
        });
    });
    
    const detailsContainer = document.getElementById('selectedDateDetails');
    const dateText = document.getElementById('selectedDateText');
    const expensesList = document.getElementById('dateExpensesList');
    
    if (dayExpenses.length > 0) {
        detailsContainer.style.display = 'block';
        dateText.textContent = new Date(date).toLocaleDateString('zh-TW');
        
        expensesList.innerHTML = '';
        dayExpenses.forEach(expense => {
            const item = document.createElement('div');
            item.className = 'date-expense-item';
            item.innerHTML = `
                <div class="expense-item-header">
                    <span class="expense-item-title">${expense.merchantName}</span>
                    <span class="expense-item-amount">$${expense.amount.toLocaleString()}</span>
                </div>
                <div class="expense-item-details">
                    ${expense.category} • ${expense.projectName} • ${expense.invoiceNumber}
                </div>
            `;
            expensesList.appendChild(item);
        });
    } else {
        detailsContainer.style.display = 'none';
    }
}

// 日曆事件篩選
function filterCalendarEvents() {
    const startDate = document.getElementById('startDateFilter').value;
    const endDate = document.getElementById('endDateFilter').value;
    const category = document.getElementById('calendarCategoryFilter').value;
    
    // 基本篩選邏輯
    updateCalendarEvents();
    
    // 如果有篩選條件，進一步篩選
    if (startDate || endDate || category !== 'all') {
        const filteredEvents = window.calendarEvents.filter(event => {
            const eventDate = event.start instanceof Date ? 
                event.start.toISOString().split('T')[0] : 
                new Date(event.start).toISOString().split('T')[0];
            
            // 日期範圍篩選
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            
            // 類別篩選
            if (category !== 'all' && event.category !== category) return false;
            
            return true;
        });
        
        // 更新篩選後的事件
        window.calendarEvents = filteredEvents;
    }
    
    // 通知 FullCalendar 更新事件
    if (window.refreshCalendarEvents && typeof window.refreshCalendarEvents === 'function') {
        window.refreshCalendarEvents();
    }
}

// 匯出月度報表
function exportMonthlyReport() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyExpenses = [];
    projects.forEach(project => {
        project.expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
                monthlyExpenses.push({
                    ...expense,
                    projectName: project.name
                });
            }
        });
    });
    
    if (monthlyExpenses.length === 0) {
        showToast('本月沒有可匯出的資料', 'warning');
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        hideLoading();
        generateMonthlyExcelReport(monthlyExpenses);
        showToast('月度報表匯出成功！', 'success');
    }, 1500);
}

// 生成月度 Excel 報表
function generateMonthlyExcelReport(expenses) {
    const headers = ['日期', '專案', '類別', '發票號碼', '商家名稱', '金額', '幣別', '狀態', '備註'];
    const csvContent = [
        headers.join(','),
        ...expenses.map(expense => [
            expense.date,
            expense.projectName,
            expense.category,
            expense.invoiceNumber,
            expense.merchantName,
            expense.amount,
            expense.currency,
            getExpenseStatusText(expense.status),
            expense.notes || ''
        ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `月度報帳明細_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 渲染專案列表
function renderProjectList() {
    const projectListContainer = document.getElementById('projectList');
    projectListContainer.innerHTML = '';
    
    projects.forEach(project => {
        const projectElement = createProjectElement(project);
        projectListContainer.appendChild(projectElement);
    });
}

// 創建專案元素
function createProjectElement(project) {
    const projectDiv = document.createElement('div');
    projectDiv.className = 'project-item';
    projectDiv.dataset.projectId = project.id;
    
    const totalAmount = project.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const statusText = getStatusText(project.status);
    
    projectDiv.innerHTML = `
        <div class="project-name">${project.name}</div>
        <div class="project-description">${project.description}</div>
        <div class="project-stats">
            <span>${project.expenses.length} 筆記錄</span>
            <span class="project-status ${project.status}">${statusText}</span>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            總額: $${totalAmount.toLocaleString()}
        </div>
    `;
    
    projectDiv.addEventListener('click', () => selectProject(project));
    
    return projectDiv;
}

// 獲取狀態文字
function getStatusText(status) {
    const statusMap = {
        'pending': '待處理',
        'processing': '處理中',
        'completed': '已完成'
    };
    return statusMap[status] || status;
}

// 選擇專案
function selectProject(project) {
    currentProject = project;
    
    // 更新 UI 選中狀態
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-project-id="${project.id}"]`).classList.add('active');
    
    // 更新主要內容區域
    updateMainContent();
    hideEmptyState();
    showProjectContent();
}

// 更新主要內容區域
function updateMainContent() {
    if (!currentProject) return;
    
    // 更新專案資訊
    document.getElementById('currentProjectName').textContent = currentProject.name;
    
    // 更新統計資訊
    const totalCount = currentProject.expenses.length;
    const totalAmount = currentProject.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const lastUpdate = currentProject.expenses.length > 0 
        ? new Date(Math.max(...currentProject.expenses.map(e => new Date(e.date)))).toLocaleDateString('zh-TW')
        : '-';
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('totalAmount').textContent = `$${totalAmount.toLocaleString()}`;
    document.getElementById('lastUpdate').textContent = lastUpdate;
    
    // 渲染費用表格
    renderExpenseTable();
}

// 渲染費用表格
function renderExpenseTable() {
    const tbody = document.getElementById('expenseTableBody');
    tbody.innerHTML = '';
    
    if (!currentProject || currentProject.expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox fa-2x" style="display: block; margin-bottom: 16px; color: #cbd5e1;"></i>
                    暫無報帳記錄，點擊上方「上傳發票」開始新增
                </td>
            </tr>
        `;
        return;
    }
    
    // 按日期排序（最新的在前面）
    const sortedExpenses = [...currentProject.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedExpenses.forEach(expense => {
        const row = createExpenseRow(expense);
        tbody.appendChild(row);
    });
}

// 創建費用列
function createExpenseRow(expense) {
    const row = document.createElement('tr');
    const statusText = getExpenseStatusText(expense.status);
    const statusClass = expense.status;
    
    row.innerHTML = `
        <td>${new Date(expense.date).toLocaleDateString('zh-TW')}</td>
        <td>${expense.category}</td>
        <td>${expense.invoiceNumber}</td>
        <td>${expense.merchantName}</td>
        <td>$${expense.amount.toLocaleString()}</td>
        <td>${expense.currency}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <div class="action-buttons-table">
                <button class="btn-table btn-edit" onclick="editExpense(${expense.id})">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="btn-table btn-delete" onclick="deleteExpense(${expense.id})">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// 獲取費用狀態文字
function getExpenseStatusText(status) {
    const statusMap = {
        'pending': '待審核',
        'approved': '已核准',
        'rejected': '已拒絕'
    };
    return statusMap[status] || status;
}

// 顯示空狀態
function showEmptyState() {
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('projectStats').style.display = 'none';
}

// 隱藏空狀態
function hideEmptyState() {
    document.getElementById('emptyState').style.display = 'none';
}

// 顯示專案內容
function showProjectContent() {
    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'flex';
    document.getElementById('projectStats').style.display = 'flex';
}

// 篩選專案
function filterProjects() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchText) ||
                            project.description.toLowerCase().includes(searchText);
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderFilteredProjects(filteredProjects);
}

// 渲染篩選後的專案
function renderFilteredProjects(filteredProjects) {
    const projectListContainer = document.getElementById('projectList');
    projectListContainer.innerHTML = '';
    
    filteredProjects.forEach(project => {
        const projectElement = createProjectElement(project);
        projectListContainer.appendChild(projectElement);
    });
}

// 顯示建立專案模態框
function showCreateProjectModal() {
    document.getElementById('createProjectModal').classList.add('show');
    document.getElementById('projectName').focus();
}

// 隱藏建立專案模態框
function hideCreateProjectModal() {
    document.getElementById('createProjectModal').classList.remove('show');
    document.getElementById('createProjectForm').reset();
}

// 建立新專案
function createProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    const budget = parseFloat(document.getElementById('projectBudget').value) || 0;
    
    if (!name) {
        showToast('請輸入專案名稱', 'error');
        return;
    }
    
    const newProject = {
        id: Date.now(),
        name: name,
        description: description,
        budget: budget,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        expenses: []
    };
    
    projects.unshift(newProject);
    renderProjectList();
    hideCreateProjectModal();
    showToast('專案建立成功！', 'success');
    
    // 更新專案選擇下拉選單
    updateProjectSelectOptions();
    
    // 自動選中新建的專案
    if (currentMode === 'project') {
        selectProject(newProject);
    }
}

// 更新專案選擇下拉選單
function updateProjectSelectOptions() {
    const projectSelect = document.getElementById('expenseProject');
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">請選擇專案</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    }
}

// 顯示上傳模態框
function showUploadModal() {
    // 在日曆模式下，顯示專案選擇
    if (currentMode === 'calendar') {
        document.getElementById('projectSelectGroup').style.display = 'block';
        updateProjectSelectOptions();
        
        // 如果有選中日期，自動填入日期
        if (selectedDate) {
            document.getElementById('expenseDate').value = new Date(selectedDate).toISOString().split('T')[0];
        }
    } else {
        document.getElementById('projectSelectGroup').style.display = 'none';
        if (!currentProject) {
            showToast('請先選擇專案', 'error');
            return;
        }
    }
    
    document.getElementById('uploadModal').classList.add('show');
    resetUploadModal();
}

// 隱藏上傳模態框
function hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('show');
    resetUploadModal();
}

// 重置上傳模態框
function resetUploadModal() {
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('ocrResults').style.display = 'none';
    document.getElementById('uploadBtn').style.display = 'inline-flex';
    document.getElementById('saveExpenseBtn').style.display = 'none';
    document.getElementById('expenseForm').reset();
    
    // 日曆模式下重新設置選中日期
    if (currentMode === 'calendar' && selectedDate) {
        document.getElementById('expenseDate').value = new Date(selectedDate).toISOString().split('T')[0];
    }
}

// 處理檔案選擇
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = files;
    showFilePreview(files);
}

// 拖拽處理
function dragOverHandler(event) {
    event.preventDefault();
    document.getElementById('uploadArea').classList.add('dragover');
}

function dropHandler(event) {
    event.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    selectedFiles = files;
    document.getElementById('fileInput').files = event.dataTransfer.files;
    showFilePreview(files);
}

// 顯示檔案預覽
function showFilePreview(files) {
    const previewArea = document.getElementById('previewArea');
    const fileList = document.getElementById('fileList');
    
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-file-image"></i>
            <span>${file.name}</span>
            <i class="fas fa-times remove-file" onclick="removeFile(${index})"></i>
        `;
        fileList.appendChild(fileItem);
    });
    
    previewArea.style.display = 'block';
}

// 移除檔案
function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        document.getElementById('previewArea').style.display = 'none';
        document.getElementById('fileInput').value = '';
    } else {
        showFilePreview(selectedFiles);
    }
}

// 上傳檔案並 OCR 識別
function uploadFiles() {
    if (selectedFiles.length === 0) {
        showToast('請先選擇檔案', 'error');
        return;
    }
    
    showLoading();
    
    // 模擬 OCR 識別過程
    setTimeout(() => {
        hideLoading();
        simulateOCR();
        showOCRResults();
    }, 2000);
}

// 模擬 OCR 識別
function simulateOCR() {
    const today = new Date();
    const defaultDate = selectedDate ? new Date(selectedDate) : today;
    
    // 模擬 OCR 識別結果
    const categories = ['餐飲', '交通', '住宿', '辦公用品', '其他'];
    const merchants = ['星巴克', '麥當勞', '7-ELEVEN', '全聯福利中心', '家樂福', '統一超商', '台灣大車隊'];
    
    const mockOCRData = {
        date: defaultDate.toISOString().split('T')[0],
        category: categories[Math.floor(Math.random() * categories.length)],
        invoiceNumber: 'TW' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
        merchantName: merchants[Math.floor(Math.random() * merchants.length)],
        amount: Math.floor(Math.random() * 2000) + 100,
        currency: 'TWD'
    };
    
    // 填入表單
    document.getElementById('expenseDate').value = mockOCRData.date;
    document.getElementById('expenseCategory').value = mockOCRData.category;
    document.getElementById('invoiceNumber').value = mockOCRData.invoiceNumber;
    document.getElementById('merchantName').value = mockOCRData.merchantName;
    document.getElementById('amount').value = mockOCRData.amount;
    document.getElementById('currency').value = mockOCRData.currency;
}

// 顯示 OCR 結果
function showOCRResults() {
    document.getElementById('ocrResults').style.display = 'block';
    document.getElementById('uploadBtn').style.display = 'none';
    document.getElementById('saveExpenseBtn').style.display = 'inline-flex';
}

// 儲存費用記錄
function saveExpense() {
    const formData = {
        date: document.getElementById('expenseDate').value,
        category: document.getElementById('expenseCategory').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        merchantName: document.getElementById('merchantName').value,
        amount: parseFloat(document.getElementById('amount').value),
        currency: document.getElementById('currency').value,
        notes: document.getElementById('notes').value
    };
    
    // 驗證必填欄位
    if (!formData.date || !formData.category || !formData.invoiceNumber || 
        !formData.merchantName || !formData.amount) {
        showToast('請填寫所有必填欄位', 'error');
        return;
    }
    
    // 新增費用記錄
    const newExpense = {
        id: Date.now(),
        ...formData,
        status: 'pending'
    };
    
    // 根據模式決定新增到哪個專案
    let targetProject;
    if (currentMode === 'calendar') {
        const projectId = parseInt(document.getElementById('expenseProject').value);
        if (!projectId) {
            showToast('請選擇專案', 'error');
            return;
        }
        targetProject = projects.find(p => p.id === projectId);
    } else {
        targetProject = currentProject;
    }
    
    if (!targetProject) {
        showToast('找不到目標專案', 'error');
        return;
    }
    
    targetProject.expenses.push(newExpense);
    
    // 更新 UI
    if (currentMode === 'project') {
        updateMainContent();
    } else {
        updateCalendarStats();
        updateCalendarEvents();
        setTimeout(() => {
            if (window.renderCalendar) {
                window.renderCalendar();
            }
        }, 100);
    }
    
    hideUploadModal();
    showToast('費用記錄已儲存！', 'success');
}

// 編輯費用記錄
function editExpense(expenseId) {
    const expense = currentProject.expenses.find(exp => exp.id === expenseId);
    if (!expense) return;
    
    // 填入編輯表單
    document.getElementById('editExpenseId').value = expense.id;
    document.getElementById('editExpenseDate').value = expense.date;
    document.getElementById('editExpenseCategory').value = expense.category;
    document.getElementById('editInvoiceNumber').value = expense.invoiceNumber;
    document.getElementById('editMerchantName').value = expense.merchantName;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editCurrency').value = expense.currency;
    document.getElementById('editNotes').value = expense.notes || '';
    
    // 顯示編輯模態框
    document.getElementById('editModal').classList.add('show');
}

// 隱藏編輯模態框
function hideEditModal() {
    document.getElementById('editModal').classList.remove('show');
    document.getElementById('editExpenseForm').reset();
}

// 更新費用記錄
function updateExpense() {
    const expenseId = parseInt(document.getElementById('editExpenseId').value);
    const expense = currentProject.expenses.find(exp => exp.id === expenseId);
    
    if (!expense) return;
    
    // 更新費用資料
    expense.date = document.getElementById('editExpenseDate').value;
    expense.category = document.getElementById('editExpenseCategory').value;
    expense.invoiceNumber = document.getElementById('editInvoiceNumber').value;
    expense.merchantName = document.getElementById('editMerchantName').value;
    expense.amount = parseFloat(document.getElementById('editAmount').value);
    expense.currency = document.getElementById('editCurrency').value;
    expense.notes = document.getElementById('editNotes').value;
    
    // 更新 UI
    updateMainContent();
    updateCalendarEvents();
    hideEditModal();
    showToast('費用記錄已更新！', 'success');
    
    // 重新渲染日曆
    setTimeout(() => {
        if (window.renderCalendar) {
            window.renderCalendar();
        }
    }, 100);
}

// 刪除費用記錄
function deleteExpense(expenseId) {
    if (!confirm('確定要刪除這筆費用記錄嗎？')) return;
    
    const index = currentProject.expenses.findIndex(exp => exp.id === expenseId);
    if (index > -1) {
        currentProject.expenses.splice(index, 1);
        updateMainContent();
        updateCalendarEvents();
        showToast('費用記錄已刪除！', 'success');
        
        // 重新渲染日曆
        setTimeout(() => {
            if (window.renderCalendar) {
                window.renderCalendar();
            }
        }, 100);
    }
}

// 匯出報表
function exportReport() {
    if (!currentProject) {
        showToast('請先選擇專案', 'error');
        return;
    }
    
    if (currentProject.expenses.length === 0) {
        showToast('沒有可匯出的資料', 'warning');
        return;
    }
    
    showLoading();
    
    // 模擬匯出過程
    setTimeout(() => {
        hideLoading();
        generateExcelReport();
        showToast('報表匯出成功！', 'success');
    }, 1500);
}

// 生成 Excel 報表
function generateExcelReport() {
    // 準備 CSV 格式的資料
    const headers = ['日期', '類別', '發票號碼', '商家名稱', '金額', '幣別', '狀態', '備註'];
    const csvContent = [
        headers.join(','),
        ...currentProject.expenses.map(expense => [
            expense.date,
            expense.category,
            expense.invoiceNumber,
            expense.merchantName,
            expense.amount,
            expense.currency,
            getExpenseStatusText(expense.status),
            expense.notes || ''
        ].join(','))
    ].join('\n');
    
    // 建立下載連結
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentProject.name}_報帳明細_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 顯示 Loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// 隱藏 Loading
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// 顯示 Toast 通知
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    
    // 設定圖示
    const icon = toast.querySelector('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' :
                    type === 'warning' ? 'fas fa-exclamation-triangle' :
                    type === 'info' ? 'fas fa-info-circle' :
                    'fas fa-check-circle';
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 點擊模態框背景關閉
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        if (event.target.id === 'createProjectModal') {
            hideCreateProjectModal();
        } else if (event.target.id === 'uploadModal') {
            hideUploadModal();
        } else if (event.target.id === 'editModal') {
            hideEditModal();
        }
    }
});

// ESC 鍵關閉模態框
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideCreateProjectModal();
        hideUploadModal();
        hideEditModal();
    }
});

// 阻止拖拽預設行為
document.addEventListener('dragover', function(event) {
    event.preventDefault();
});

document.addEventListener('drop', function(event) {
    event.preventDefault();
});

// 將全域函數暴露給 React 組件使用
window.showEventDetails = showEventDetails;
window.updateSelectedDateDetails = updateSelectedDateDetails;
window.getCategoryColor = getCategoryColor;