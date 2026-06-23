import { db, isFirebaseConfigured } from "./firebase.js?v=20260623-2";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const COLLECTION_NAME = "packagingItems";

let items = [];
let serviceWorkerRegistration = null;
const editingIds = new Set();
const drafts = new Map();

const tableBody = document.getElementById("inventoryTableBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const addItemButton = document.getElementById("addItemButton");
const enableNotificationsButton = document.getElementById("enableNotificationsButton");
const notificationStatus = document.getElementById("notificationStatus");
const syncStatus = document.getElementById("syncStatus");

function toSafeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function getStatus(item) {
  return item.currentStock > item.minStock
    ? { label: "正常", className: "normal" }
    : { label: "需補貨", className: "low" };
}

function isLowStock(item) {
  return item.currentStock <= item.minStock;
}

function getSuggestedOrder(item) {
  return Math.max(0, item.minStock - item.currentStock);
}

function normalizeItem(id, data, hasPendingWrites = false) {
  return {
    id,
    name: data.name || "未命名包材",
    currentStock: toSafeNumber(data.currentStock),
    minStock: toSafeNumber(data.minStock),
    totalUsed: toSafeNumber(data.totalUsed),
    updatedAt: data.updatedAt || null,
    hasPendingWrites
  };
}

function getNotificationBody(item) {
  return `${item.name} 庫存不足，目前庫存 ${item.currentStock}，最低庫存 ${item.minStock}，建議叫貨 ${getSuggestedOrder(item)} 個。`;
}

function supportsLocalNotifications() {
  return "Notification" in window;
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
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。", false);
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    enableNotificationsButton.textContent = "已開啟庫存通知";
    showNotificationStatus("已開啟庫存通知");
    items.forEach((item) => notifyLowStockIfNeeded(item));
    return;
  }

  showNotificationStatus("通知權限未開啟，將無法收到庫存提醒", false);
}

function getNotificationKey(item) {
  return `notified_${item.id}_${item.currentStock}`;
}

function clearNotificationRecord(itemId) {
  const prefix = `notified_${itemId}_`;

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  }
}

function shouldNotify(item) {
  if (!isLowStock(item)) {
    clearNotificationRecord(item.id);
    return false;
  }

  return localStorage.getItem(getNotificationKey(item)) !== "true";
}

async function notifyLowStockIfNeeded(item) {
  if (!shouldNotify(item)) return;

  if (!supportsLocalNotifications()) {
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。", false);
    return;
  }

  if (Notification.permission !== "granted") {
    showNotificationStatus("通知權限未開啟，將無法收到庫存提醒", false);
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
      await serviceWorkerRegistration.showNotification("哪項包材庫存不足需要", options);
    } else {
      new Notification("哪項包材庫存不足需要", options);
    }

    localStorage.setItem(getNotificationKey(item), "true");
  } catch {
    showNotificationStatus("此裝置不支援本機通知，請改用畫面內提醒。", false);
  }
}

function setSyncStatus(message, type = "muted") {
  syncStatus.textContent = message;
  syncStatus.dataset.type = type;
}

function getDisplayItem(item) {
  const draft = drafts.get(item.id);
  return draft ? { ...item, ...draft } : item;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTable() {
  const keyword = searchInput.value.trim().toLowerCase();
  const filteredItems = items
    .map(getDisplayItem)
    .filter((item) => item.name.toLowerCase().includes(keyword));

  tableBody.innerHTML = "";
  emptyState.textContent = isFirebaseConfigured
    ? "目前沒有包材，請先新增包材。"
    : "尚未設定 Firebase，請先在 firebase.js 填入同一組 firebaseConfig。";
  emptyState.hidden = filteredItems.length > 0;

  filteredItems.forEach((item) => {
    const status = getStatus(item);
    const isEditing = editingIds.has(item.id);
    const row = document.createElement("tr");
    row.className = status.className === "low" ? "low-stock" : "";
    row.dataset.id = item.id;

    row.innerHTML = `
      <td data-label="包材名稱">
        <input class="cell-input" data-field="name" type="text" value="${escapeHtml(item.name)}" ${isEditing ? "" : "disabled"}>
      </td>
      <td data-label="現有庫存">
        <input class="cell-input" data-field="currentStock" type="number" min="0" step="1" inputmode="numeric" value="${item.currentStock}" ${isEditing ? "" : "disabled"}>
      </td>
      <td data-label="最低庫存">
        <input class="cell-input" data-field="minStock" type="number" min="0" step="1" inputmode="numeric" value="${item.minStock}" ${isEditing ? "" : "disabled"}>
      </td>
      <td data-label="累計取用量">
        <span class="number-value">${item.totalUsed}</span>
      </td>
      <td data-label="建議叫貨數量">
        <span class="number-value ${getSuggestedOrder(item) > 0 ? "order-needed" : ""}">${getSuggestedOrder(item)}</span>
      </td>
      <td data-label="狀態">
        <span class="status-badge ${status.className}">${status.label}</span>
      </td>
      <td data-label="取用數量">
        <div class="use-stock-controls">
          <input class="cell-input use-quantity-input" data-field="useQuantity" type="number" min="1" step="1" inputmode="numeric" placeholder="0">
          <button class="action-button use-stock" type="button" data-action="use-stock">扣庫存</button>
        </div>
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

async function addItem() {
  if (!isFirebaseConfigured) {
    setSyncStatus("尚未設定 Firebase，無法新增資料", "error");
    return;
  }

  try {
    setSyncStatus("正在新增包材...");
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: "新包材",
      currentStock: 0,
      minStock: 0,
      totalUsed: 0,
      updatedAt: serverTimestamp()
    });
    editingIds.add(docRef.id);
    searchInput.value = "";
    setSyncStatus("已新增，正在同步...");
  } catch (error) {
    setSyncStatus(`新增失敗：${error.message}`, "error");
  }
}

async function updateItemFromRow(row) {
  const id = row.dataset.id;
  const item = items.find((currentItem) => currentItem.id === id);

  if (!item) return;

  const nameInput = row.querySelector('[data-field="name"]');
  const currentStockInput = row.querySelector('[data-field="currentStock"]');
  const minStockInput = row.querySelector('[data-field="minStock"]');

  const nextItem = {
    name: nameInput.value.trim() || "未命名包材",
    currentStock: toSafeNumber(currentStockInput.value),
    minStock: toSafeNumber(minStockInput.value)
  };

  try {
    setSyncStatus("正在儲存...");
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...nextItem,
      updatedAt: serverTimestamp()
    });
    drafts.delete(id);
    editingIds.delete(id);
    setSyncStatus("已儲存，正在同步");
  } catch (error) {
    setSyncStatus(`儲存失敗：${error.message}`, "error");
  }
}

async function useStockFromRow(row) {
  const id = row.dataset.id;
  const item = items.find((currentItem) => currentItem.id === id);
  const quantityInput = row.querySelector('[data-field="useQuantity"]');
  const useQuantity = toSafeNumber(quantityInput.value);

  if (!item) return;

  if (useQuantity <= 0) {
    alert("請輸入取用數量");
    quantityInput.focus();
    return;
  }

  if (useQuantity > item.currentStock) {
    alert("取用數量不可大於現有庫存");
    quantityInput.focus();
    return;
  }

  try {
    setSyncStatus("正在扣庫存...");
    const itemRef = doc(db, COLLECTION_NAME, id);

    if (navigator.onLine) {
      await runTransaction(db, async (transaction) => {
        const itemSnapshot = await transaction.get(itemRef);

        if (!itemSnapshot.exists()) {
          throw new Error("找不到這筆包材資料");
        }

        const latestItem = normalizeItem(id, itemSnapshot.data());

        if (useQuantity > latestItem.currentStock) {
          throw new Error("取用數量不可大於現有庫存");
        }

        transaction.update(itemRef, {
          currentStock: latestItem.currentStock - useQuantity,
          totalUsed: increment(useQuantity),
          updatedAt: serverTimestamp()
        });
      });
    } else {
      await updateDoc(itemRef, {
        currentStock: increment(-useQuantity),
        totalUsed: increment(useQuantity),
        updatedAt: serverTimestamp()
      });
    }

    quantityInput.value = "";
    setSyncStatus("已扣庫存，正在同步");
  } catch (error) {
    if (error.message === "取用數量不可大於現有庫存") {
      alert("取用數量不可大於現有庫存");
      quantityInput.focus();
      return;
    }

    setSyncStatus(`扣庫存失敗：${error.message}`, "error");
  }
}

function updateLiveStatus(row, item) {
  const status = getStatus(item);
  row.className = status.className === "low" ? "low-stock" : "";
  row.querySelector(".status-badge").className = `status-badge ${status.className}`;
  row.querySelector(".status-badge").textContent = status.label;
  row.querySelector('[data-label="建議叫貨數量"] .number-value').textContent = getSuggestedOrder(item);
}

async function deleteItem(id) {
  try {
    setSyncStatus("正在刪除...");
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    drafts.delete(id);
    editingIds.delete(id);
    clearNotificationRecord(id);
    setSyncStatus("已刪除，正在同步");
  } catch (error) {
    setSyncStatus(`刪除失敗：${error.message}`, "error");
  }
}

function listenToInventory() {
  if (!isFirebaseConfigured) {
    setSyncStatus("尚未設定 Firebase，請先編輯 firebase.js", "error");
    renderTable();
    return;
  }

  const itemsQuery = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));

  onSnapshot(
    itemsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      items = snapshot.docs.map((snapshotDoc) => normalizeItem(
        snapshotDoc.id,
        snapshotDoc.data(),
        snapshotDoc.metadata.hasPendingWrites
      ));

      const hasPendingWrites = snapshot.docs.some((snapshotDoc) => snapshotDoc.metadata.hasPendingWrites);
      const source = snapshot.metadata.fromCache ? "離線快取" : "雲端";
      setSyncStatus(hasPendingWrites ? `資料待同步（${source}）` : `已同步（${source}）`);

      items.forEach((item) => notifyLowStockIfNeeded(item));
      renderTable();
    },
    (error) => {
      setSyncStatus(`同步失敗：${error.message}`, "error");
      renderTable();
    }
  );
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

  if (action === "edit") {
    const item = items.find((currentItem) => currentItem.id === id);
    if (!item) return;

    drafts.set(id, {
      name: item.name,
      currentStock: item.currentStock,
      minStock: item.minStock
    });
    editingIds.add(id);
    renderTable();
    return;
  }

  if (action === "save") {
    updateItemFromRow(row);
    return;
  }

  if (action === "use-stock") {
    useStockFromRow(row);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm("確定要刪除這項包材嗎？");
    if (!confirmed) return;

    deleteItem(id);
  }
});

tableBody.addEventListener("input", (event) => {
  const row = event.target.closest("tr");
  if (!row) return;

  const id = row.dataset.id;
  if (!editingIds.has(id)) return;

  const draft = drafts.get(id) || {};
  const field = event.target.dataset.field;

  if (field === "name") {
    draft.name = event.target.value;
  }

  if (field === "currentStock" || field === "minStock") {
    draft[field] = toSafeNumber(event.target.value);
  }

  drafts.set(id, draft);
  const baseItem = items.find((item) => item.id === id);
  if (baseItem) updateLiveStatus(row, { ...baseItem, ...draft });
});

searchInput.addEventListener("input", renderTable);
addItemButton.addEventListener("click", addItem);
enableNotificationsButton.addEventListener("click", requestNotificationPermission);

registerServiceWorker();
updateNotificationButtonState();
listenToInventory();
