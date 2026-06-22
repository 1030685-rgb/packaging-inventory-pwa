const STORAGE_KEY = "packagingInventoryItems";
const NOTIFICATION_STATE_KEY = "inventoryLocalNotificationState";

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const defaultItems = [
  { id: createId(), name: "S 箱", currentStock: 120, minimumStock: 30, isEditing: false },
  { id: createId(), name: "K 箱", currentStock: 42, minimumStock: 50, isEditing: false },
  { id: createId(), name: "6號箱", currentStock: 80, minimumStock: 25, isEditing: false },
  { id: createId(), name: "B 箱", currentStock: 18, minimumStock: 20, isEditing: false },
  { id: createId(), name: "膠帶", currentStock: 65, minimumStock: 40, isEditing: false }
];

let items = loadItems();
let notificationState = loadNotificationState();
let serviceWorkerRegistration = null;

const tableBody = document.getElementById("inventoryTableBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const addItemButton = document.getElementById("addItemButton");
const enableNotificationsButton = document.getElementById("enableNotificationsButton");
const notificationStatus = document.getElementById("notificationStatus");

function loadItems() {
  const savedItems = localStorage.getItem(STORAGE_KEY);

  if (!savedItems) {
    saveItems(defaultItems);
    return [...defaultItems];
  }

  try {
    return JSON.parse(savedItems).map((item) => ({ ...item, isEditing: false }));
  } catch {
    saveItems(defaultItems);
    return [...defaultItems];
  }
}

function saveItems(nextItems = items) {
  const itemsToSave = nextItems.map(({ isEditing, ...item }) => item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsToSave));
}

function loadNotificationState() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_STATE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveNotificationState() {
  localStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(notificationState));
}

function getStatus(item) {
  return item.currentStock > item.minimumStock
    ? { label: "正常", className: "normal" }
    : { label: "需補貨", className: "low" };
}

function isLowStock(item) {
  return item.currentStock <= item.minimumStock;
}

function getNotificationBody(item) {
  return `${item.name} 庫存不足，目前庫存 ${item.currentStock}，最低庫存 ${item.minimumStock}，請安排補貨。`;
}

function supportsLocalNotifications() {
  return "Notification" in window;
}

function updateNotificationButtonState() {
  if (!supportsLocalNotifications()) {
    enableNotificationsButton.disabled = true;
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。", false);
    return;
  }

  if (Notification.permission === "granted") {
    enableNotificationsButton.textContent = "已開啟庫存通知";
  }
}

async function requestNotificationPermission() {
  if (!supportsLocalNotifications()) {
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    enableNotificationsButton.textContent = "已開啟庫存通知";
    showNotificationStatus("已開啟庫存通知");
    return;
  }

  showNotificationStatus("通知權限未開啟，將無法收到庫存提醒");
}

function shouldNotify(item) {
  if (!isLowStock(item)) {
    if (notificationState[item.id]) {
      delete notificationState[item.id];
      saveNotificationState();
    }
    return false;
  }

  const state = notificationState[item.id];
  return !state || state.lastNotifiedStock !== item.currentStock;
}

async function notifyLowStockIfNeeded(item) {
  if (!shouldNotify(item)) return;

  if (!supportsLocalNotifications()) {
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。");
    return;
  }

  if (Notification.permission !== "granted") {
    showNotificationStatus("通知權限未開啟，將無法收到庫存提醒");
    return;
  }

  const options = {
    body: getNotificationBody(item),
    icon: new URL("icons/icon-192.png", document.baseURI).href,
    badge: new URL("icons/icon-192.png", document.baseURI).href,
    tag: `inventory-${item.id}-${item.currentStock}`,
    renotify: true
  };

  try {
    if (serviceWorkerRegistration && "showNotification" in serviceWorkerRegistration) {
      await serviceWorkerRegistration.showNotification("包材庫存不足", options);
    } else {
      new Notification("包材庫存不足", options);
    }

    notificationState[item.id] = {
      lastNotifiedStock: item.currentStock
    };
    saveNotificationState();
  } catch {
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。");
  }
}

function showNotificationStatus(message, autoHide = true) {
  notificationStatus.textContent = message;
  window.clearTimeout(showNotificationStatus.timer);

  if (autoHide) {
    showNotificationStatus.timer = window.setTimeout(() => {
      notificationStatus.textContent = "";
    }, 5000);
  }
}

function renderTable() {
  const keyword = searchInput.value.trim().toLowerCase();
  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(keyword));

  tableBody.innerHTML = "";
  emptyState.hidden = filteredItems.length > 0;

  filteredItems.forEach((item) => {
    const status = getStatus(item);
    const row = document.createElement("tr");
    row.className = status.className === "low" ? "low-stock" : "";
    row.dataset.id = item.id;

    row.innerHTML = `
      <td data-label="包材名稱">
        <input class="cell-input" data-field="name" type="text" value="${escapeHtml(item.name)}" ${item.isEditing ? "" : "disabled"}>
      </td>
      <td data-label="現有庫存">
        <input class="cell-input" data-field="currentStock" type="number" min="0" step="1" inputmode="numeric" value="${item.currentStock}" ${item.isEditing ? "" : "disabled"}>
      </td>
      <td data-label="最低庫存">
        <input class="cell-input" data-field="minimumStock" type="number" min="0" step="1" inputmode="numeric" value="${item.minimumStock}" ${item.isEditing ? "" : "disabled"}>
      </td>
      <td data-label="狀態">
        <span class="status-badge ${status.className}">${status.label}</span>
      </td>
      <td data-label="操作">
        <div class="actions">
          <button class="action-button edit" type="button" data-action="edit">編輯</button>
          <button class="action-button save" type="button" data-action="save">儲存</button>
          <button class="action-button delete" type="button" data-action="delete">刪除</button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addItem() {
  const item = {
    id: createId(),
    name: "新包材",
    currentStock: 0,
    minimumStock: 0,
    isEditing: true
  };

  items.unshift(item);
  saveItems();
  searchInput.value = "";
  renderTable();
  notifyLowStockIfNeeded(item);
}

function updateItemFromRow(row) {
  const id = row.dataset.id;
  const item = items.find((currentItem) => currentItem.id === id);

  if (!item) return;

  const nameInput = row.querySelector('[data-field="name"]');
  const currentStockInput = row.querySelector('[data-field="currentStock"]');
  const minimumStockInput = row.querySelector('[data-field="minimumStock"]');

  item.name = nameInput.value.trim() || "未命名包材";
  item.currentStock = Math.max(0, Number(currentStockInput.value) || 0);
  item.minimumStock = Math.max(0, Number(minimumStockInput.value) || 0);
  item.isEditing = false;

  saveItems();
  renderTable();
  notifyLowStockIfNeeded(item);
}

function updateLiveStatus(row, item) {
  const status = getStatus(item);
  row.className = status.className === "low" ? "low-stock" : "";
  row.querySelector(".status-badge").className = `status-badge ${status.className}`;
  row.querySelector(".status-badge").textContent = status.label;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./service-worker.js", {
      scope: "./"
    });
  } catch {
    serviceWorkerRegistration = null;
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const row = button.closest("tr");
  const id = row.dataset.id;
  const action = button.dataset.action;
  const item = items.find((currentItem) => currentItem.id === id);

  if (action === "edit" && item) {
    item.isEditing = true;
    renderTable();
    return;
  }

  if (action === "save") {
    updateItemFromRow(row);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm("確定要刪除此包材嗎？");
    if (!confirmed) return;

    items = items.filter((currentItem) => currentItem.id !== id);
    delete notificationState[id];
    saveItems();
    saveNotificationState();
    renderTable();
  }
});

tableBody.addEventListener("input", (event) => {
  const row = event.target.closest("tr");
  if (!row) return;

  const id = row.dataset.id;
  const item = items.find((currentItem) => currentItem.id === id);
  if (!item || !item.isEditing) return;

  const field = event.target.dataset.field;
  if (field === "name") {
    item.name = event.target.value;
  }

  if (field === "currentStock" || field === "minimumStock") {
    item[field] = Math.max(0, Number(event.target.value) || 0);
    updateLiveStatus(row, item);
  }
});

searchInput.addEventListener("input", renderTable);
addItemButton.addEventListener("click", addItem);
enableNotificationsButton.addEventListener("click", requestNotificationPermission);

registerServiceWorker();
updateNotificationButtonState();
renderTable();
