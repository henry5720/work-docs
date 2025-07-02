// 報帳模組 JavaScript 功能實現

// 全域變數
let projects = [];
let currentProject = null;
let expenses = [];
let selectedFiles = [];

// 初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化應用程式
function initializeApp() {
    loadMockData();
    renderProjectList();
    showEmptyState();
}

// 載入模擬數據
function loadMockData() {
    // 模擬專案數據
    projects = [
        {
            id: 1,
            name: '2024年第一季差旅費',
            description: '第一季出差相關費用報帳',
            budget: 50000,
            status: 'processing',
            createdAt: '2024-01-15',
            expenses: [
                {
                    id: 1,
                    date: '2024-01-20',
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
                    date: '2024-01-20',
                    category: '住宿',
                    invoiceNumber: 'HT20240120',
                    merchantName: '日月千禧酒店',
                    amount: 4500,
                    currency: 'TWD',
                    status: 'pending',
                    notes: '出差住宿一晚'
                },
                {
                    id: 3,
                    date: '2024-01-21',
                    category: '餐飲',
                    invoiceNumber: 'RT87654321',
                    merchantName: '王品牛排',
                    amount: 1800,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '客戶拜訪用餐'
                }
            ]
        },
        {
            id: 2,
            name: '辦公用品採購',
            description: '辦公室文具用品採購報帳',
            budget: 15000,
            status: 'pending',
            createdAt: '2024-02-01',
            expenses: [
                {
                    id: 4,
                    date: '2024-02-05',
                    category: '辦公用品',
                    invoiceNumber: 'OF20240205',
                    merchantName: '誠品文具',
                    amount: 3200,
                    currency: 'TWD',
                    status: 'pending',
                    notes: '筆記本、原子筆等文具'
                }
            ]
        },
        {
            id: 3,
            name: '會議費用',
            description: '月度會議相關費用',
            budget: 8000,
            status: 'completed',
            createdAt: '2024-01-01',
            expenses: [
                {
                    id: 5,
                    date: '2024-01-10',
                    category: '餐飲',
                    invoiceNumber: 'CF20240110',
                    merchantName: '85度C',
                    amount: 450,
                    currency: 'TWD',
                    status: 'approved',
                    notes: '會議茶點'
                }
            ]
        }
    ];
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
    
    currentProject.expenses.forEach(expense => {
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
    
    // 自動選中新建的專案
    selectProject(newProject);
}

// 顯示上傳模態框
function showUploadModal() {
    if (!currentProject) {
        showToast('請先選擇專案', 'error');
        return;
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
    // 模擬 OCR 識別結果
    const mockOCRData = {
        date: new Date().toISOString().split('T')[0],
        category: '餐飲',
        invoiceNumber: 'TW' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
        merchantName: '模擬商家名稱',
        amount: Math.floor(Math.random() * 5000) + 100,
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
    
    currentProject.expenses.push(newExpense);
    
    // 更新 UI
    updateMainContent();
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
    hideEditModal();
    showToast('費用記錄已更新！', 'success');
}

// 刪除費用記錄
function deleteExpense(expenseId) {
    if (!confirm('確定要刪除這筆費用記錄嗎？')) return;
    
    const index = currentProject.expenses.findIndex(exp => exp.id === expenseId);
    if (index > -1) {
        currentProject.expenses.splice(index, 1);
        updateMainContent();
        showToast('費用記錄已刪除！', 'success');
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