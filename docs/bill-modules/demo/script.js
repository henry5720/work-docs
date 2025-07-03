// 報帳模組 JavaScript 功能實現

// 全域變數
let projects = [];
let currentProject = null;
let expenses = [];
let selectedFiles = [];
let selectedAdditionalFiles = []; // 新增：附加檔案陣列
let selectedEditAdditionalFiles = []; // 新增：編輯時的附加檔案陣列
let currentMode = "project";
let selectedDate = null;
let isOCREnabled = true; // 新增：OCR開關狀態

// 匯率資料
const exchangeRates = {
    TWD: 1,
    USD: 31.5,
    JPY: 0.21,
    EUR: 34.8,
    CNY: 4.35,
};

// 將 calendarEvents 定義為全域變數
window.calendarEvents = [];

// 初始化應用程式
document.addEventListener("DOMContentLoaded", function () {
    initializeApp();
    initializeResponsiveFeatures();
});

function initializeApp() {
    loadMockData();
    renderProjectList();
    showEmptyState();
    updateCalendarEvents();
    setTimeout(() => {
        if (window.renderCalendar) {
            window.renderCalendar();
        }
    }, 500);
}

// 初始化響應式功能
function initializeResponsiveFeatures() {
    // 監聽螢幕大小變化
    window.addEventListener("resize", handleResize);

    // 初始化時檢查螢幕大小
    handleResize();

    // 監聽點擊事件來關閉側邊欄（點擊主要內容區域）
    document.addEventListener("click", function (event) {
        const sidebar = document.getElementById("sidebar");
        const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle =
            mobileMenuToggle && mobileMenuToggle.contains(event.target);

        if (!isClickInsideSidebar && !isClickOnToggle && window.innerWidth <= 768) {
            closeMobileSidebar();
        }
    });
}

// 處理螢幕大小變化
function handleResize() {
    const isMobile = window.innerWidth <= 480;
    const desktopTable = document.querySelector(".desktop-table");
    const mobileCards = document.querySelector(".mobile-cards");

    if (isMobile) {
        // 切換到行動版卡片模式
        if (desktopTable) {
            desktopTable.style.display = "none";
            desktopTable.style.setProperty("display", "none", "important");
        }
        if (mobileCards) {
            mobileCards.style.display = "flex";
            mobileCards.style.setProperty("display", "flex", "important");
        }
        renderMobileCards();
    } else {
        // 切換到桌面版表格模式
        if (desktopTable) {
            desktopTable.style.display = "block";
            desktopTable.style.removeProperty("display");
        }
        if (mobileCards) {
            mobileCards.style.display = "none";
            mobileCards.style.removeProperty("display");
        }
    }

    // 如果螢幕變大，關閉行動版側邊欄
    if (window.innerWidth > 768) {
        closeMobileSidebar();
    }
}

// 切換行動版側邊欄
function toggleMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    if (sidebar.classList.contains("active")) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

// 開啟行動版側邊欄
function openMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

// 關閉行動版側邊欄
function closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
}

// 載入模擬數據 - 更新為最新欄位結構
function loadMockData() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const getDateInCurrentMonth = (day) => {
        return new Date(currentYear, currentMonth, day).toISOString().split("T")[0];
    };

    projects = [
        {
            id: 1,
            name: "2024年第四季差旅費",
            description: "第四季出差相關費用報帳",
            budget: 50000,
            status: "pending",
            createdAt: getDateInCurrentMonth(1),
            lastUpdated: getDateInCurrentMonth(15),
            expenses: [
                {
                    id: 1,
                    applicationDate: getDateInCurrentMonth(1),
                    applicantName: "王小明",
                    department: "業務部",
                    position: "業務經理",
                    expenseDate: getDateInCurrentMonth(4),
                    invoiceNumber: "TW12345678",
                    expenseSubject: "交通費",
                    expenseContent: "台北-台中高鐵",
                    expensePurpose: "客戶拜訪",
                    amount: 1490,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 1490,
                    notes: "台北-台中商務出差",
                    status: "completed",
                },
                {
                    id: 2,
                    applicationDate: getDateInCurrentMonth(1),
                    applicantName: "王小明",
                    department: "業務部",
                    position: "業務經理",
                    expenseDate: getDateInCurrentMonth(4),
                    invoiceNumber: "HT20241204",
                    expenseSubject: "住宿費",
                    expenseContent: "商務旅館住宿",
                    expensePurpose: "商務出差",
                    amount: 4500,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 4500,
                    notes: "日月千禧酒店住宿一晚",
                    status: "completed",
                },
                {
                    id: 3,
                    applicationDate: getDateInCurrentMonth(1),
                    applicantName: "王小明",
                    department: "業務部",
                    position: "業務經理",
                    expenseDate: getDateInCurrentMonth(5),
                    invoiceNumber: "RT20241205",
                    expenseSubject: "餐費",
                    expenseContent: "客戶商務午餐",
                    expensePurpose: "客戶拜訪",
                    amount: 2200,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 2200,
                    notes: "與客戶商務午餐",
                    status: "pending",
                },
                {
                    id: 7,
                    applicationDate: getDateInCurrentMonth(1),
                    applicantName: "王小明",
                    department: "業務部",
                    position: "業務經理",
                    expenseDate: getDateInCurrentMonth(10),
                    invoiceNumber: "TC20241210",
                    expenseSubject: "交通費",
                    expenseContent: "機場接送計程車",
                    expensePurpose: "國外出差",
                    amount: 1200,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 1200,
                    notes: "往返桃園機場",
                    status: "completed",
                },
                {
                    id: 8,
                    applicationDate: getDateInCurrentMonth(12),
                    applicantName: "張小美",
                    department: "人資部",
                    position: "人資專員",
                    expenseDate: getDateInCurrentMonth(12),
                    invoiceNumber: "US20241212",
                    expenseSubject: "住宿費",
                    expenseContent: "海外出差住宿",
                    expensePurpose: "人才招募",
                    amount: 150,
                    currency: "USD",
                    exchangeRate: 31.5,
                    twdAmount: 4725,
                    notes: "美國矽谷出差住宿",
                    status: "pending",
                },
            ],
        },
        {
            id: 2,
            name: "辦公用品採購",
            description: "辦公室文具用品採購報帳",
            budget: 15000,
            status: "pending",
            createdAt: getDateInCurrentMonth(2),
            lastUpdated: getDateInCurrentMonth(18),
            expenses: [
                {
                    id: 4,
                    applicationDate: getDateInCurrentMonth(2),
                    applicantName: "李小華",
                    department: "行政部",
                    position: "行政專員",
                    expenseDate: getDateInCurrentMonth(8),
                    invoiceNumber: "OF20241208",
                    expenseSubject: "辦公用品",
                    expenseContent: "辦公文具採購",
                    expensePurpose: "日常辦公需求",
                    amount: 3200,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 3200,
                    notes: "筆記本、原子筆、文件夾等",
                    status: "completed",
                },
                {
                    id: 9,
                    applicationDate: getDateInCurrentMonth(5),
                    applicantName: "李小華",
                    department: "行政部",
                    position: "行政專員",
                    expenseDate: getDateInCurrentMonth(15),
                    invoiceNumber: "OF20241215",
                    expenseSubject: "辦公用品",
                    expenseContent: "印表機耗材",
                    expensePurpose: "設備維護",
                    amount: 1580,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 1580,
                    notes: "影印紙、墨水匣",
                    status: "pending",
                },
                {
                    id: 10,
                    applicationDate: getDateInCurrentMonth(8),
                    applicantName: "陳小東",
                    department: "研發部",
                    position: "研發工程師",
                    expenseDate: getDateInCurrentMonth(18),
                    invoiceNumber: "JP20241218",
                    expenseSubject: "文具用品",
                    expenseContent: "技術書籍採購",
                    expensePurpose: "技術研發",
                    amount: 8500,
                    currency: "JPY",
                    exchangeRate: 0.21,
                    twdAmount: 1785,
                    notes: "日本技術書籍",
                    status: "completed",
                },
            ],
        },
        {
            id: 3,
            name: "會議與培訓費用",
            description: "會議、培訓相關費用報帳",
            budget: 25000,
            status: "completed",
            createdAt: getDateInCurrentMonth(3),
            lastUpdated: getDateInCurrentMonth(20),
            expenses: [
                {
                    id: 5,
                    applicationDate: getDateInCurrentMonth(3),
                    applicantName: "張小美",
                    department: "人資部",
                    position: "人資專員",
                    expenseDate: getDateInCurrentMonth(6),
                    invoiceNumber: "CF20241206",
                    expenseSubject: "餐費",
                    expenseContent: "會議茶點",
                    expensePurpose: "月度會議",
                    amount: 450,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 450,
                    notes: "部門月會茶點",
                    status: "completed",
                },
                {
                    id: 6,
                    applicationDate: getDateInCurrentMonth(3),
                    applicantName: "張小美",
                    department: "人資部",
                    position: "人資專員",
                    expenseDate: getDateInCurrentMonth(14),
                    invoiceNumber: "EU20241214",
                    expenseSubject: "差旅費",
                    expenseContent: "歐洲研習營",
                    expensePurpose: "員工培訓",
                    amount: 320,
                    currency: "EUR",
                    exchangeRate: 34.8,
                    twdAmount: 11136,
                    notes: "歐洲人資研習營費用",
                    status: "completed",
                },
                {
                    id: 11,
                    applicationDate: getDateInCurrentMonth(10),
                    applicantName: "陳小東",
                    department: "研發部",
                    position: "研發工程師",
                    expenseDate: getDateInCurrentMonth(16),
                    invoiceNumber: "CN20241216",
                    expenseSubject: "通訊費",
                    expenseContent: "國際會議通訊",
                    expensePurpose: "技術交流",
                    amount: 280,
                    currency: "CNY",
                    exchangeRate: 4.35,
                    twdAmount: 1218,
                    notes: "與中國團隊視訊會議費用",
                    status: "completed",
                },
                {
                    id: 12,
                    applicationDate: getDateInCurrentMonth(12),
                    applicantName: "李小華",
                    department: "行政部",
                    position: "行政專員",
                    expenseDate: getDateInCurrentMonth(20),
                    invoiceNumber: "TR20241220",
                    expenseSubject: "其他",
                    expenseContent: "培訓場地租借",
                    expensePurpose: "員工訓練",
                    amount: 5500,
                    currency: "TWD",
                    exchangeRate: 1,
                    twdAmount: 5500,
                    notes: "員工教育訓練場地費",
                    status: "completed",
                },
            ],
        },
    ];
}

// 匯率換算函數
function calculateTWDAmount() {
    const amount = parseFloat(document.getElementById("amount").value) || 0;
    const currency = document.getElementById("currency").value;
    const exchangeRate = exchangeRates[currency] || 1;

    document.getElementById("exchangeRate").value = exchangeRate;
    const twdAmount = amount * exchangeRate;
    document.getElementById("twdAmount").value = twdAmount.toFixed(2);
}

// 編輯表單匯率換算
function calculateEditTWDAmount() {
    const amount = parseFloat(document.getElementById("editAmount").value) || 0;
    const currency = document.getElementById("editCurrency").value;
    const exchangeRate = exchangeRates[currency] || 1;

    document.getElementById("editExchangeRate").value = exchangeRate;
    const twdAmount = amount * exchangeRate;
    document.getElementById("editTwdAmount").value = twdAmount.toFixed(2);
}

// 模式切換功能
function switchMode(mode) {
    if (currentMode === mode) return;

    currentMode = mode;

    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.classList.remove("active");
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add("active");

    if (mode === "project") {
        showProjectMode();
    } else {
        showCalendarMode();
    }
}

function showProjectMode() {
    document.getElementById("projectSidebarContent").style.display = "block";
    document.getElementById("calendarSidebarContent").style.display = "none";
    document.getElementById("projectModeContent").style.display = "flex";
    document.getElementById("calendarModeContent").style.display = "none";
    document.getElementById("addProjectBtn").style.display = "flex";

    renderProjectList();
    updateMainContent();
}

function showCalendarMode() {
    document.getElementById("projectSidebarContent").style.display = "none";
    document.getElementById("calendarSidebarContent").style.display = "block";
    document.getElementById("projectModeContent").style.display = "none";
    document.getElementById("calendarModeContent").style.display = "flex";
    document.getElementById("addProjectBtn").style.display = "none";

    updateCalendarStats();
    updateCalendarEvents();

    setTimeout(() => {
        if (window.renderCalendar) {
            window.renderCalendar();
        }
    }, 100);
}

// 更新日曆統計
function updateCalendarStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyCount = 0;
    let monthlyAmount = 0;

    projects.forEach((project) => {
        project.expenses.forEach((expense) => {
            const expenseDate = new Date(expense.expenseDate);
            if (
                expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear
            ) {
                monthlyCount++;
                monthlyAmount += expense.twdAmount || expense.amount;
            }
        });
    });

    document.getElementById("monthlyCount").textContent = monthlyCount;
    document.getElementById(
        "monthlyAmount"
    ).textContent = `$${monthlyAmount.toLocaleString()}`;
}

// 更新日曆事件
function updateCalendarEvents() {
    window.calendarEvents = [];

    projects.forEach((project) => {
        project.expenses.forEach((expense) => {
            const expenseDate = new Date(expense.expenseDate);
            const event = {
                id: expense.id,
                title: `${expense.expenseContent} - $${(
                    expense.twdAmount || expense.amount
                ).toLocaleString()}`,
                start: expenseDate,
                end: expenseDate,
                allDay: true,
                category: expense.expenseSubject,
                amount: expense.twdAmount || expense.amount,
                merchant: expense.expenseContent,
                invoice: expense.invoiceNumber,
                projectId: project.id,
                expense: expense,
                project: project,
            };
            window.calendarEvents.push(event);
        });
    });

    if (
        window.refreshCalendarEvents &&
        typeof window.refreshCalendarEvents === "function"
    ) {
        window.refreshCalendarEvents();
    }
}

// 獲取類別顏色
function getCategoryColor(category) {
    const colors = {
        餐費: "#FF6B6B",
        交通費: "#4ECDC4",
        住宿費: "#45B7D1",
        辦公用品: "#FFA07A",
        差旅費: "#9B59B6",
        通訊費: "#F39C12",
        文具用品: "#2ECC71",
        其他: "#98D8C8",
    };
    return colors[category] || "#67BE5F";
}

// 渲染專案列表
function renderProjectList() {
    const projectListContainer = document.getElementById("projectList");
    projectListContainer.innerHTML = "";

    projects.forEach((project) => {
        const projectElement = createProjectElement(project);
        projectListContainer.appendChild(projectElement);
    });
}

// 創建專案元素
function createProjectElement(project) {
    const projectDiv = document.createElement("div");
    projectDiv.className = "project-item";
    projectDiv.dataset.projectId = project.id;

    const totalAmount = project.expenses.reduce(
        (sum, expense) => sum + (expense.twdAmount || expense.amount),
        0
    );
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
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">
            最後更新: ${new Date(project.lastUpdated).toLocaleDateString(
        "zh-TW"
    )}
        </div>
    `;

    projectDiv.addEventListener("click", () => selectProject(project));

    return projectDiv;
}

function getStatusText(status) {
    const statusMap = {
        pending: "待處理",
        completed: "已完成",
    };
    return statusMap[status] || status;
}

// 選擇專案
function selectProject(project) {
    currentProject = project;

    document.querySelectorAll(".project-item").forEach((item) => {
        item.classList.remove("active");
    });
    document
        .querySelector(`[data-project-id="${project.id}"]`)
        .classList.add("active");

    updateMainContent();
    hideEmptyState();
    showProjectContent();
}

// 更新主要內容區域
function updateMainContent() {
    if (!currentProject) return;

    document.getElementById("currentProjectName").textContent =
        currentProject.name;

    const totalCount = currentProject.expenses.length;
    const totalAmount = currentProject.expenses.reduce(
        (sum, expense) => sum + (expense.twdAmount || expense.amount),
        0
    );
    const lastUpdate = currentProject.lastUpdated
        ? new Date(currentProject.lastUpdated).toLocaleDateString("zh-TW")
        : "-";

    document.getElementById("totalCount").textContent = totalCount;
    document.getElementById(
        "totalAmount"
    ).textContent = `$${totalAmount.toLocaleString()}`;
    document.getElementById("lastUpdate").textContent = lastUpdate;

    renderExpenseTable();

    // 如果在行動版模式，也更新卡片
    if (window.innerWidth <= 480) {
        renderMobileCards();
    }
}

// 渲染費用表格
function renderExpenseTable() {
    const tbody = document.getElementById("expenseTableBody");
    tbody.innerHTML = "";

    if (!currentProject || currentProject.expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox fa-2x" style="display: block; margin-bottom: 16px; color: #cbd5e1;"></i>
                    暫無報帳記錄，點擊上方「上傳發票」開始新增
                </td>
            </tr>
        `;
        return;
    }

    const sortedExpenses = [...currentProject.expenses].sort(
        (a, b) => new Date(b.expenseDate) - new Date(a.expenseDate)
    );

    sortedExpenses.forEach((expense) => {
        const row = createExpenseRow(expense);
        tbody.appendChild(row);
    });
}

// 渲染行動版卡片
function renderMobileCards() {
    const mobileCards = document.getElementById("mobileCards");
    if (!mobileCards) return;

    mobileCards.innerHTML = "";

    if (!currentProject || currentProject.expenses.length === 0) {
        mobileCards.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-inbox fa-2x" style="display: block; margin-bottom: 16px; color: #cbd5e1;"></i>
                <p>暫無報帳記錄，點擊右上角「+」開始新增</p>
            </div>
        `;
        return;
    }

    const sortedExpenses = [...currentProject.expenses].sort(
        (a, b) => new Date(b.expenseDate) - new Date(a.expenseDate)
    );

    sortedExpenses.forEach((expense) => {
        const card = createExpenseCard(expense);
        mobileCards.appendChild(card);
    });
}

// 創建費用卡片
function createExpenseCard(expense) {
    const card = document.createElement("div");
    card.className = "expense-card";

    const statusText = expense.status === "completed" ? "已完成" : "待處理";
    const statusClass = expense.status === "completed" ? "approved" : "pending";

    // 附加檔案顯示
    const attachmentSection = expense.hasAdditionalFiles && expense.additionalFiles 
        ? `<div class="expense-card-detail">
               <div class="expense-card-detail-label">附加檔案</div>
               <div class="expense-card-detail-value">
                   <i class="fas fa-paperclip"></i> ${expense.additionalFiles.length} 個檔案
               </div>
           </div>` 
        : '';

    card.innerHTML = `
        <div class="expense-card-header">
            <div>
                <div class="expense-card-title">${expense.expenseContent || "-"
        }</div>
                <div style="font-size: 12px; color: #6B7280;">
                    ${new Date(expense.expenseDate).toLocaleDateString("zh-TW")}
                </div>
            </div>
            <div class="expense-card-amount">$${(
            expense.twdAmount || expense.amount
        ).toLocaleString()}</div>
        </div>
        
        <div class="expense-card-details">
            <div class="expense-card-detail">
                <div class="expense-card-detail-label">申請人</div>
                <div class="expense-card-detail-value">${expense.applicantName || "-"
        }</div>
            </div>
            <div class="expense-card-detail">
                <div class="expense-card-detail-label">部門</div>
                <div class="expense-card-detail-value">${expense.department || "-"
        }</div>
            </div>
            <div class="expense-card-detail">
                <div class="expense-card-detail-label">科目</div>
                <div class="expense-card-detail-value">${expense.expenseSubject || "-"
        }</div>
            </div>
            <div class="expense-card-detail">
                <div class="expense-card-detail-label">用途</div>
                <div class="expense-card-detail-value">${expense.expensePurpose || "-"
        }</div>
            </div>
            <div class="expense-card-detail">
                <div class="expense-card-detail-label">發票號碼</div>
                <div class="expense-card-detail-value">${expense.invoiceNumber || "-"
        }</div>
            </div>
            ${attachmentSection}
            <div class="expense-card-detail">
                <div class="expense-card-detail-label">備註</div>
                <div class="expense-card-detail-value">${expense.notes || "-"
        }</div>
            </div>
        </div>
        
        <div class="expense-card-footer">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <div class="expense-card-actions">
                <button class="btn-table btn-edit" onclick="editExpense(${expense.id
        })">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="btn-table btn-delete" onclick="deleteExpense(${expense.id
        })">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        </div>
    `;

    return card;
}

// 創建費用列
function createExpenseRow(expense) {
    const row = document.createElement("tr");

    // 獲取審核狀態顯示文字
    const statusText = expense.status === "completed" ? "已完成" : "待處理";
    const statusClass = expense.status === "completed" ? "approved" : "pending";

    // 附加檔案顯示
    const attachmentInfo = expense.hasAdditionalFiles && expense.additionalFiles 
        ? `<i class="fas fa-paperclip" title="已上傳 ${expense.additionalFiles.length} 個附加檔案"></i>` 
        : '';

    row.innerHTML = `
        <td>${new Date(
        expense.applicationDate || expense.expenseDate
    ).toLocaleDateString("zh-TW")}</td>
        <td>${expense.applicantName || "-"}</td>
        <td>${expense.department || "-"}</td>
        <td>${expense.position || "-"}</td>
        <td>${new Date(expense.expenseDate).toLocaleDateString("zh-TW")}</td>
        <td>${expense.invoiceNumber || "-"} ${attachmentInfo}</td>
        <td>${expense.expenseSubject || "-"}</td>
        <td>${expense.expenseContent || "-"}</td>
        <td>${expense.expensePurpose || "-"}</td>
        <td>$${(expense.twdAmount || expense.amount).toLocaleString()}</td>
        <td>${expense.notes || "-"}</td>
        <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>
            <div class="action-buttons-table">
                <button class="btn-table btn-edit" onclick="editExpense(${expense.id
        })">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="btn-table btn-delete" onclick="deleteExpense(${expense.id
        })">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        </td>
    `;

    return row;
}

function showEmptyState() {
    document.getElementById("emptyState").style.display = "flex";
    document.getElementById("tableContainer").style.display = "none";
    document.getElementById("actionButtons").style.display = "none";
    document.getElementById("projectStats").style.display = "none";
}

function hideEmptyState() {
    document.getElementById("emptyState").style.display = "none";
}

function showProjectContent() {
    document.getElementById("tableContainer").style.display = "block";
    document.getElementById("actionButtons").style.display = "flex";
    document.getElementById("projectStats").style.display = "flex";
}

// 篩選專案
function filterProjects() {
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value;

    const filteredProjects = projects.filter((project) => {
        const matchesSearch =
            project.name.toLowerCase().includes(searchText) ||
            project.description.toLowerCase().includes(searchText);
        const matchesStatus =
            statusFilter === "all" || project.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    renderFilteredProjects(filteredProjects);
}

function renderFilteredProjects(filteredProjects) {
    const projectListContainer = document.getElementById("projectList");
    projectListContainer.innerHTML = "";

    filteredProjects.forEach((project) => {
        const projectElement = createProjectElement(project);
        projectListContainer.appendChild(projectElement);
    });
}

// 專案建立
function showCreateProjectModal() {
    document.getElementById("createProjectModal").classList.add("show");
    document.getElementById("projectName").focus();
}

function hideCreateProjectModal() {
    document.getElementById("createProjectModal").classList.remove("show");
    document.getElementById("createProjectForm").reset();
}

function createProject() {
    const name = document.getElementById("projectName").value.trim();
    const description = document
        .getElementById("projectDescription")
        .value.trim();
    const budget =
        parseFloat(document.getElementById("projectBudget").value) || 0;

    if (!name) {
        showToast("請輸入專案名稱", "error");
        return;
    }

    const newProject = {
        id: Date.now(),
        name: name,
        description: description,
        budget: budget,
        status: "pending",
        createdAt: new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString().split("T")[0],
        expenses: [],
    };

    projects.unshift(newProject);
    renderProjectList();
    hideCreateProjectModal();
    showToast("專案建立成功！", "success");

    updateProjectSelectOptions();

    if (currentMode === "project") {
        selectProject(newProject);
    }
}

// 更新專案選擇下拉選單
function updateProjectSelectOptions() {
    const projectSelect = document.getElementById("expenseProject");
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">請選擇專案</option>';
        projects.forEach((project) => {
            const option = document.createElement("option");
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    }
}

// OCR 切換功能
function toggleOCRMode() {
    isOCREnabled = document.getElementById('ocrToggle').checked;
    
    const ocrUploadSection = document.getElementById('ocrUploadSection');
    const manualFormSection = document.getElementById('manualFormSection');
    const formResults = document.getElementById('formResults');
    const formResultsTitle = document.getElementById('formResultsTitle');
    const uploadBtn = document.getElementById('uploadBtn');
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    const manualSaveBtn = document.getElementById('manualSaveBtn');
    const ocrDescription = document.getElementById('ocrDescription');
    
    if (isOCREnabled) {
        // 啟用OCR模式
        ocrUploadSection.style.display = 'block';
        manualFormSection.style.display = 'none';
        formResults.style.display = 'none';
        formResultsTitle.textContent = 'OCR 識別結果';
        uploadBtn.style.display = 'inline-flex';
        saveExpenseBtn.style.display = 'none';
        manualSaveBtn.style.display = 'none';
        ocrDescription.textContent = '上傳發票圖片，系統將自動識別發票資訊並填入表單';
    } else {
        // 關閉OCR模式，直接顯示表單
        ocrUploadSection.style.display = 'none';
        manualFormSection.style.display = 'block';
        formResults.style.display = 'block';
        formResultsTitle.textContent = '請填寫報帳資訊';
        uploadBtn.style.display = 'none';
        saveExpenseBtn.style.display = 'none';
        manualSaveBtn.style.display = 'inline-flex';
        ocrDescription.textContent = '手動填寫報帳資訊，不使用OCR自動識別功能';
        
        // 填入預設值
        setDefaultFormValues();
    }
}

// 設定預設表單值
function setDefaultFormValues() {
    document.getElementById("applicantName").value = "王小明";
    document.getElementById("department").value = "業務部";
    document.getElementById("position").value = "業務經理";
    document.getElementById("currency").value = "TWD";
    document.getElementById("status").value = "pending";
    calculateTWDAmount();

    if (currentMode === "calendar" && selectedDate) {
        document.getElementById("expenseDate").value = new Date(selectedDate)
            .toISOString()
            .split("T")[0];
    }
}

// 上傳模態框
function showUploadModal() {
    if (currentMode === "calendar") {
        document.getElementById("projectSelectGroup").style.display = "block";
        updateProjectSelectOptions();

        if (selectedDate) {
            document.getElementById("expenseDate").value = new Date(selectedDate)
                .toISOString()
                .split("T")[0];
        }
    } else {
        document.getElementById("projectSelectGroup").style.display = "none";
        if (!currentProject) {
            showToast("請先選擇專案", "error");
            return;
        }
    }

    document.getElementById("uploadModal").classList.add("show");
    resetUploadModal();
}

function hideUploadModal() {
    document.getElementById("uploadModal").classList.remove("show");
    resetUploadModal();
}

function resetUploadModal() {
    selectedFiles = [];
    selectedAdditionalFiles = []; // 重置附加檔案
    document.getElementById("fileInput").value = "";
    document.getElementById("additionalFilesInput").value = "";
    document.getElementById("previewArea").style.display = "none";
    document.getElementById("additionalFilesPreview").style.display = "none";
    document.getElementById("formResults").style.display = "none";
    document.getElementById("uploadBtn").style.display = "inline-flex";
    document.getElementById("saveExpenseBtn").style.display = "none";
    document.getElementById("manualSaveBtn").style.display = "none";
    document.getElementById("expenseForm").reset();
    
    // 重置OCR開關狀態
    document.getElementById('ocrToggle').checked = true;
    isOCREnabled = true;
    
    // 重置顯示狀態
    toggleOCRMode();
}

// 檔案處理
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = files;
    showFilePreview(files);
}

function dragOverHandler(event) {
    event.preventDefault();
    document.getElementById("uploadArea").classList.add("dragover");
}

function dropHandler(event) {
    event.preventDefault();
    document.getElementById("uploadArea").classList.remove("dragover");

    const files = Array.from(event.dataTransfer.files);
    selectedFiles = files;
    document.getElementById("fileInput").files = event.dataTransfer.files;
    showFilePreview(files);
}

function showFilePreview(files) {
    const previewArea = document.getElementById("previewArea");
    const fileList = document.getElementById("fileList");

    fileList.innerHTML = "";

    files.forEach((file, index) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
        fileItem.innerHTML = `
            <i class="fas fa-file-image"></i>
            <span>${file.name}</span>
            <i class="fas fa-times remove-file" onclick="removeFile(${index})"></i>
        `;
        fileList.appendChild(fileItem);
    });

    previewArea.style.display = "block";
}

function removeFile(index) {
    selectedFiles.splice(index, 1);

    if (selectedFiles.length === 0) {
        document.getElementById("previewArea").style.display = "none";
        document.getElementById("fileInput").value = "";
    } else {
        showFilePreview(selectedFiles);
    }
}

// OCR 功能
function uploadFiles() {
    if (!isOCREnabled) {
        // 如果OCR未啟用，直接顯示表單
        showFormResults();
        return;
    }
    
    if (selectedFiles.length === 0) {
        showToast("請先選擇檔案", "error");
        return;
    }

    showLoading();

    setTimeout(() => {
        hideLoading();
        simulateOCR();
        showFormResults();
    }, 2000);
}

function simulateOCR() {
    const today = new Date();
    const defaultDate = selectedDate ? new Date(selectedDate) : today;

    const subjects = ["餐費", "交通費", "住宿費", "辦公用品", "其他"];
    const contents = ["商務午餐", "計程車費", "住宿費", "辦公用品", "其他費用"];
    const purposes = ["客戶拜訪", "商務出差", "會議需求", "日常辦公", "其他"];
    const applicants = ["王小明", "李小華", "張小美", "陳小東"];
    const departments = ["業務部", "行政部", "人資部", "研發部"];
    const positions = ["業務經理", "行政專員", "人資專員", "研發工程師"];

    const mockOCRData = {
        applicantName: applicants[Math.floor(Math.random() * applicants.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        position: positions[Math.floor(Math.random() * positions.length)],
        expenseDate: defaultDate.toISOString().split("T")[0],
        expenseSubject: subjects[Math.floor(Math.random() * subjects.length)],
        expenseContent: contents[Math.floor(Math.random() * contents.length)],
        expensePurpose: purposes[Math.floor(Math.random() * purposes.length)],
        invoiceNumber:
            "TW" +
            Math.floor(Math.random() * 100000000)
                .toString()
                .padStart(8, "0"),
        amount: Math.floor(Math.random() * 2000) + 100,
        currency: "TWD",
    };

    // 填入表單
    document.getElementById("applicantName").value = mockOCRData.applicantName;
    document.getElementById("department").value = mockOCRData.department;
    document.getElementById("position").value = mockOCRData.position;
    document.getElementById("expenseDate").value = mockOCRData.expenseDate;
    document.getElementById("expenseSubject").value = mockOCRData.expenseSubject;
    document.getElementById("expenseContent").value = mockOCRData.expenseContent;
    document.getElementById("expensePurpose").value = mockOCRData.expensePurpose;
    document.getElementById("invoiceNumber").value = mockOCRData.invoiceNumber;
    document.getElementById("amount").value = mockOCRData.amount;
    document.getElementById("currency").value = mockOCRData.currency;

    calculateTWDAmount();
}

function showFormResults() {
    const formResults = document.getElementById("formResults");
    const formResultsTitle = document.getElementById("formResultsTitle");
    const uploadBtn = document.getElementById("uploadBtn");
    const saveExpenseBtn = document.getElementById("saveExpenseBtn");
    const manualSaveBtn = document.getElementById("manualSaveBtn");
    
    formResults.style.display = "block";
    
    if (isOCREnabled) {
        formResultsTitle.textContent = 'OCR 識別結果';
        uploadBtn.style.display = "none";
        saveExpenseBtn.style.display = "inline-flex";
        manualSaveBtn.style.display = "none";
    } else {
        formResultsTitle.textContent = '請填寫報帳資訊';
        uploadBtn.style.display = "none";
        saveExpenseBtn.style.display = "none";
        manualSaveBtn.style.display = "inline-flex";
        
        // 手動模式下填入預設值
        setDefaultFormValues();
    }
}

// 儲存費用記錄
function saveExpense() {
    const formData = {
        applicantName: document.getElementById("applicantName").value,
        department: document.getElementById("department").value,
        position: document.getElementById("position").value,
        expenseDate: document.getElementById("expenseDate").value,
        expenseSubject: document.getElementById("expenseSubject").value,
        expenseContent: document.getElementById("expenseContent").value,
        expensePurpose: document.getElementById("expensePurpose").value,
        invoiceNumber: document.getElementById("invoiceNumber").value,
        amount: parseFloat(document.getElementById("amount").value),
        currency: document.getElementById("currency").value,
        exchangeRate: parseFloat(document.getElementById("exchangeRate").value),
        twdAmount: parseFloat(document.getElementById("twdAmount").value),
        status: document.getElementById("status").value,
        notes: document.getElementById("notes").value,
        additionalFiles: selectedAdditionalFiles.map(file => file.name), // 儲存附加檔案資訊
        hasAdditionalFiles: selectedAdditionalFiles.length > 0
    };

    // 驗證必填欄位
    if (
        !formData.applicantName ||
        !formData.department ||
        !formData.position ||
        !formData.expenseDate ||
        !formData.expenseSubject ||
        !formData.expenseContent ||
        !formData.expensePurpose ||
        !formData.invoiceNumber ||
        !formData.amount
    ) {
        showToast("請填寫所有必填欄位", "error");
        return;
    }

    const newExpense = {
        id: Date.now(),
        applicationDate: new Date().toISOString().split("T")[0],
        ...formData,
    };

    let targetProject;
    if (currentMode === "calendar") {
        const projectId = parseInt(document.getElementById("expenseProject").value);
        if (!projectId) {
            showToast("請選擇專案", "error");
            return;
        }
        targetProject = projects.find((p) => p.id === projectId);
    } else {
        targetProject = currentProject;
    }

    if (!targetProject) {
        showToast("找不到目標專案", "error");
        return;
    }

    targetProject.expenses.push(newExpense);
    targetProject.lastUpdated = new Date().toISOString().split("T")[0];

    if (currentMode === "project") {
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
    
    let message = "費用記錄已儲存！";
    if (selectedAdditionalFiles.length > 0) {
        message += ` 已上傳 ${selectedAdditionalFiles.length} 個附加檔案。`;
    }
    showToast(message, "success");
}

// 編輯費用記錄
function editExpense(expenseId) {
    const expense = currentProject.expenses.find((exp) => exp.id === expenseId);
    if (!expense) return;

    // 重置編輯時的附加檔案
    selectedEditAdditionalFiles = [];

    // 填入編輯表單
    document.getElementById("editExpenseId").value = expense.id;
    document.getElementById("editApplicantName").value = expense.applicantName;
    document.getElementById("editDepartment").value = expense.department;
    document.getElementById("editPosition").value = expense.position || "";
    document.getElementById("editExpenseDate").value = expense.expenseDate;
    document.getElementById("editExpenseSubject").value = expense.expenseSubject;
    document.getElementById("editExpenseContent").value = expense.expenseContent;
    document.getElementById("editExpensePurpose").value = expense.expensePurpose;
    document.getElementById("editInvoiceNumber").value = expense.invoiceNumber;
    document.getElementById("editAmount").value = expense.amount;
    document.getElementById("editCurrency").value = expense.currency || "TWD";
    document.getElementById("editExchangeRate").value = expense.exchangeRate || 1;
    document.getElementById("editTwdAmount").value =
        expense.twdAmount || expense.amount;
    document.getElementById("editStatus").value = expense.status || "pending";
    document.getElementById("editNotes").value = expense.notes || "";

    // 隱藏編輯時的附加檔案預覽
    document.getElementById("editAdditionalFilesPreview").style.display = "none";

    document.getElementById("editModal").classList.add("show");
}

function hideEditModal() {
    document.getElementById("editModal").classList.remove("show");
    document.getElementById("editExpenseForm").reset();
    selectedEditAdditionalFiles = []; // 清空編輯時的附加檔案
    document.getElementById("editAdditionalFilesInput").value = "";
    document.getElementById("editAdditionalFilesPreview").style.display = "none";
}

function updateExpense() {
    const expenseId = parseInt(document.getElementById("editExpenseId").value);
    const expense = currentProject.expenses.find((exp) => exp.id === expenseId);

    if (!expense) return;

    // 更新費用資料
    expense.applicantName = document.getElementById("editApplicantName").value;
    expense.department = document.getElementById("editDepartment").value;
    expense.position = document.getElementById("editPosition").value;
    expense.expenseDate = document.getElementById("editExpenseDate").value;
    expense.expenseSubject = document.getElementById("editExpenseSubject").value;
    expense.expenseContent = document.getElementById("editExpenseContent").value;
    expense.expensePurpose = document.getElementById("editExpensePurpose").value;
    expense.invoiceNumber = document.getElementById("editInvoiceNumber").value;
    expense.amount = parseFloat(document.getElementById("editAmount").value);
    expense.currency = document.getElementById("editCurrency").value;
    expense.exchangeRate = parseFloat(
        document.getElementById("editExchangeRate").value
    );
    expense.twdAmount = parseFloat(
        document.getElementById("editTwdAmount").value
    );
    expense.status = document.getElementById("editStatus").value;
    expense.notes = document.getElementById("editNotes").value;
    
    // 更新附加檔案
    if (selectedEditAdditionalFiles.length > 0) {
        expense.additionalFiles = selectedEditAdditionalFiles.map(file => file.name);
        expense.hasAdditionalFiles = true;
    }

    currentProject.lastUpdated = new Date().toISOString().split("T")[0];

    updateMainContent();
    updateCalendarEvents();
    hideEditModal();
    
    let message = "費用記錄已更新！";
    if (selectedEditAdditionalFiles.length > 0) {
        message += ` 已更新 ${selectedEditAdditionalFiles.length} 個附加檔案。`;
    }
    showToast(message, "success");

    setTimeout(() => {
        if (window.renderCalendar) {
            window.renderCalendar();
        }
    }, 100);
}

// 刪除費用記錄
function deleteExpense(expenseId) {
    if (!confirm("確定要刪除這筆費用記錄嗎？")) return;

    const index = currentProject.expenses.findIndex(
        (exp) => exp.id === expenseId
    );
    if (index > -1) {
        currentProject.expenses.splice(index, 1);
        currentProject.lastUpdated = new Date().toISOString().split("T")[0];
        updateMainContent();
        updateCalendarEvents();
        showToast("費用記錄已刪除！", "success");

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
        showToast("請先選擇專案", "error");
        return;
    }

    if (currentProject.expenses.length === 0) {
        showToast("沒有可匯出的資料", "warning");
        return;
    }

    showLoading();

    setTimeout(() => {
        hideLoading();
        generateExcelReport();
        showToast("報表匯出成功！", "success");
    }, 1500);
}

function generateExcelReport() {
    const headers = [
        "申請日期",
        "申請人",
        "部門",
        "職稱",
        "支出日期",
        "發票號碼",
        "科目",
        "內容",
        "用途",
        "金額(台幣)",
        "備註",
        "審核狀態",
    ];
    const csvContent = [
        headers.join(","),
        ...currentProject.expenses.map((expense) =>
            [
                expense.applicationDate || expense.expenseDate,
                expense.applicantName || "",
                expense.department || "",
                expense.position || "",
                expense.expenseDate,
                expense.invoiceNumber || "",
                expense.expenseSubject || "",
                expense.expenseContent || "",
                expense.expensePurpose || "",
                expense.twdAmount || expense.amount,
                expense.notes || "",
                expense.status === "completed" ? "已完成" : "待處理",
            ].join(",")
        ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
        "download",
        `${currentProject.name}_報帳明細_${new Date().toISOString().split("T")[0]
        }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 匯出月度報表
function exportMonthlyReport() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = [];
    projects.forEach((project) => {
        project.expenses.forEach((expense) => {
            const expenseDate = new Date(expense.expenseDate);
            if (
                expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear
            ) {
                monthlyExpenses.push({
                    ...expense,
                    projectName: project.name,
                });
            }
        });
    });

    if (monthlyExpenses.length === 0) {
        showToast("本月沒有可匯出的資料", "warning");
        return;
    }

    showLoading();

    setTimeout(() => {
        hideLoading();
        generateMonthlyExcelReport(monthlyExpenses);
        showToast("月度報表匯出成功！", "success");
    }, 1500);
}

function generateMonthlyExcelReport(expenses) {
    const headers = [
        "申請日期",
        "申請人",
        "部門",
        "職稱",
        "支出日期",
        "發票號碼",
        "科目",
        "內容",
        "用途",
        "金額(台幣)",
        "備註",
        "審核狀態",
    ];
    const csvContent = [
        headers.join(","),
        ...expenses.map((expense) =>
            [
                expense.applicationDate || expense.expenseDate,
                expense.applicantName || "",
                expense.department || "",
                expense.position || "",
                expense.expenseDate,
                expense.invoiceNumber || "",
                expense.expenseSubject || "",
                expense.expenseContent || "",
                expense.expensePurpose || "",
                expense.twdAmount || expense.amount,
                expense.notes || "",
                expense.status === "completed" ? "已完成" : "待處理",
            ].join(",")
        ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
        "download",
        `月度報帳明細_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 日曆事件篩選
function filterCalendarEvents() {
    const startDate = document.getElementById("startDateFilter").value;
    const endDate = document.getElementById("endDateFilter").value;
    const category = document.getElementById("calendarCategoryFilter").value;

    updateCalendarEvents();

    if (startDate || endDate || category !== "all") {
        const filteredEvents = window.calendarEvents.filter((event) => {
            const eventDate =
                event.start instanceof Date
                    ? event.start.toISOString().split("T")[0]
                    : new Date(event.start).toISOString().split("T")[0];

            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            if (category !== "all" && event.category !== category) return false;

            return true;
        });

        window.calendarEvents = filteredEvents;
    }

    if (
        window.refreshCalendarEvents &&
        typeof window.refreshCalendarEvents === "function"
    ) {
        window.refreshCalendarEvents();
    }
}

// 日曆詳情
function showEventDetails(event) {
    if (event.date) {
        updateSelectedDateDetails(new Date(event.date));
    }

    const merchant = event.merchant || "未知項目";
    const amount = event.amount || 0;
    const category = event.category || "未分類";
    showToast(`${merchant}: $${amount} (${category})`, "info");
}

function updateSelectedDateDetails(date) {
    selectedDate = date;
    const dateStr = new Date(date).toISOString().split("T")[0];

    const dayExpenses = [];
    projects.forEach((project) => {
        project.expenses.forEach((expense) => {
            if (expense.expenseDate === dateStr) {
                dayExpenses.push({
                    ...expense,
                    projectName: project.name,
                });
            }
        });
    });

    const detailsContainer = document.getElementById("selectedDateDetails");
    const dateText = document.getElementById("selectedDateText");
    const expensesList = document.getElementById("dateExpensesList");

    if (dayExpenses.length > 0) {
        detailsContainer.style.display = "block";
        dateText.textContent = new Date(date).toLocaleDateString("zh-TW");

        expensesList.innerHTML = "";
        dayExpenses.forEach((expense) => {
            const item = document.createElement("div");
            item.className = "date-expense-item";
            item.innerHTML = `
                <div class="expense-item-header">
                    <span class="expense-item-title">${expense.expenseContent
                }</span>
                    <span class="expense-item-amount">$${(
                    expense.twdAmount || expense.amount
                ).toLocaleString()}</span>
                </div>
                <div class="expense-item-details">
                    ${expense.expenseSubject} • ${expense.projectName} • ${expense.invoiceNumber
                }
                </div>
            `;
            expensesList.appendChild(item);
        });
    } else {
        detailsContainer.style.display = "none";
    }
}

// 工具函數
function showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    toast.className = `toast ${type}`;
    toastMessage.textContent = message;

    const icon = toast.querySelector("i");
    icon.className =
        type === "error"
            ? "fas fa-exclamation-circle"
            : type === "warning"
                ? "fas fa-exclamation-triangle"
                : type === "info"
                    ? "fas fa-info-circle"
                    : "fas fa-check-circle";

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// 事件監聽器
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("modal")) {
        if (event.target.id === "createProjectModal") {
            hideCreateProjectModal();
        } else if (event.target.id === "uploadModal") {
            hideUploadModal();
        } else if (event.target.id === "editModal") {
            hideEditModal();
        }
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        hideCreateProjectModal();
        hideUploadModal();
        hideEditModal();

        // 如果在行動版，按 ESC 關閉側邊欄
        if (window.innerWidth <= 768) {
            closeMobileSidebar();
        }
    }
});

document.addEventListener("dragover", function (event) {
    event.preventDefault();
});

document.addEventListener("drop", function (event) {
    event.preventDefault();
});

// 觸控事件處理
let touchStartTime = 0;
document.addEventListener(
    "touchstart",
    function (event) {
        touchStartTime = Date.now();
        // 提升觸控響應性
        const button = event.target.closest("button");
        if (button) {
            button.style.opacity = "0.7";
        }
    },
    { passive: true }
);

// 觸控結束處理
document.addEventListener(
    "touchend",
    function (event) {
        const touchEndTime = Date.now();
        const button = event.target.closest("button");

        if (button) {
            button.style.opacity = "";

            // 如果是快速點擊（小於 300ms），觸發點擊事件
            if (touchEndTime - touchStartTime < 300) {
                // 防止雙擊縮放
                event.preventDefault();

                // 手動觸發點擊事件
                setTimeout(() => {
                    button.click();
                }, 0);
            }
        }
    },
    { passive: false }
);

// 附加檔案處理函數
function handleAdditionalFilesSelect(event) {
    const files = Array.from(event.target.files);
    selectedAdditionalFiles = [...selectedAdditionalFiles, ...files];
    showAdditionalFilesPreview();
}

function dragOverAdditionalFiles(event) {
    event.preventDefault();
    document.getElementById("additionalUploadArea").classList.add("dragover");
}

function dropAdditionalFiles(event) {
    event.preventDefault();
    document.getElementById("additionalUploadArea").classList.remove("dragover");
    
    const files = Array.from(event.dataTransfer.files);
    selectedAdditionalFiles = [...selectedAdditionalFiles, ...files];
    showAdditionalFilesPreview();
}

function showAdditionalFilesPreview() {
    const previewArea = document.getElementById("additionalFilesPreview");
    const filesList = document.getElementById("additionalFilesList");
    
    if (selectedAdditionalFiles.length === 0) {
        previewArea.style.display = "none";
        return;
    }
    
    filesList.innerHTML = "";
    
    selectedAdditionalFiles.forEach((file, index) => {
        const fileItem = createAdditionalFileItem(file, index, false);
        filesList.appendChild(fileItem);
    });
    
    previewArea.style.display = "block";
}

function createAdditionalFileItem(file, index, isEdit = false) {
    const fileItem = document.createElement("div");
    fileItem.className = "additional-file-item";
    
    const fileIcon = getFileIcon(file.name);
    const fileSize = formatFileSize(file.size);
    const removeFunction = isEdit ? "removeEditAdditionalFile" : "removeAdditionalFile";
    
    fileItem.innerHTML = `
        <div class="additional-file-info">
            <i class="fas ${fileIcon.icon} additional-file-icon ${fileIcon.class}"></i>
            <span class="additional-file-name">${file.name}</span>
            <span class="additional-file-size">(${fileSize})</span>
        </div>
        <i class="fas fa-times additional-file-remove" onclick="${removeFunction}(${index})"></i>
    `;
    
    return fileItem;
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
        case 'pdf':
            return { icon: 'fa-file-pdf', class: 'file-type-pdf' };
        case 'doc':
        case 'docx':
            return { icon: 'fa-file-word', class: 'file-type-doc' };
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'webp':
            return { icon: 'fa-file-image', class: 'file-type-image' };
        default:
            return { icon: 'fa-file', class: 'file-type-default' };
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeAdditionalFile(index) {
    selectedAdditionalFiles.splice(index, 1);
    showAdditionalFilesPreview();
}

// 編輯模態框的附加檔案處理函數
function handleEditAdditionalFilesSelect(event) {
    const files = Array.from(event.target.files);
    selectedEditAdditionalFiles = [...selectedEditAdditionalFiles, ...files];
    showEditAdditionalFilesPreview();
}

function dragOverEditAdditionalFiles(event) {
    event.preventDefault();
    document.getElementById("editAdditionalUploadArea").classList.add("dragover");
}

function dropEditAdditionalFiles(event) {
    event.preventDefault();
    document.getElementById("editAdditionalUploadArea").classList.remove("dragover");
    
    const files = Array.from(event.dataTransfer.files);
    selectedEditAdditionalFiles = [...selectedEditAdditionalFiles, ...files];
    showEditAdditionalFilesPreview();
}

function showEditAdditionalFilesPreview() {
    const previewArea = document.getElementById("editAdditionalFilesPreview");
    const filesList = document.getElementById("editAdditionalFilesList");
    
    if (selectedEditAdditionalFiles.length === 0) {
        previewArea.style.display = "none";
        return;
    }
    
    filesList.innerHTML = "";
    
    selectedEditAdditionalFiles.forEach((file, index) => {
        const fileItem = createAdditionalFileItem(file, index, true);
        filesList.appendChild(fileItem);
    });
    
    previewArea.style.display = "block";
}

function removeEditAdditionalFile(index) {
    selectedEditAdditionalFiles.splice(index, 1);
    showEditAdditionalFilesPreview();
}

// 將函數暴露到全域
window.showEventDetails = showEventDetails;
window.updateSelectedDateDetails = updateSelectedDateDetails;
window.getCategoryColor = getCategoryColor;
window.calculateTWDAmount = calculateTWDAmount;
window.calculateEditTWDAmount = calculateEditTWDAmount;
window.toggleMobileSidebar = toggleMobileSidebar;
window.openMobileSidebar = openMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.renderMobileCards = renderMobileCards;
window.toggleOCRMode = toggleOCRMode;
window.setDefaultFormValues = setDefaultFormValues;
window.showFormResults = showFormResults;
window.handleAdditionalFilesSelect = handleAdditionalFilesSelect;
window.dragOverAdditionalFiles = dragOverAdditionalFiles;
window.dropAdditionalFiles = dropAdditionalFiles;
window.removeAdditionalFile = removeAdditionalFile;
window.handleEditAdditionalFilesSelect = handleEditAdditionalFilesSelect;
window.dragOverEditAdditionalFiles = dragOverEditAdditionalFiles;
window.dropEditAdditionalFiles = dropEditAdditionalFiles;
window.removeEditAdditionalFile = removeEditAdditionalFile;
