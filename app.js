// アプリ内の状態（IndexedDBと同期）
const state = {
  items: [],
  outfits: [],
  wearOutfits: [],
  wearPerfumes: [],
};

// DOM参照をまとめて管理
const el = {
  status: document.getElementById("status"),
  addItemForm: document.getElementById("addItemForm"),
  addShoesForm: document.getElementById("addShoesForm"),
  addPerfumeForm: document.getElementById("addPerfumeForm"),
  addOutfitForm: document.getElementById("addOutfitForm"),
  wearOutfitForm: document.getElementById("wearOutfitForm"),
  wearPerfumeForm: document.getElementById("wearPerfumeForm"),
  itemCategory: document.getElementById("itemCategory"),
  itemBrand: document.getElementById("itemBrand"),
  itemDetail: document.getElementById("itemDetail"),
  itemColor: document.getElementById("itemColor"),
  itemSize: document.getElementById("itemSize"),
  itemLength: document.getElementById("itemLength"),
  shoesBrand: document.getElementById("shoesBrand"),
  shoesDetail: document.getElementById("shoesDetail"),
  shoesColor: document.getElementById("shoesColor"),
  perfumeCategory: document.getElementById("perfumeCategory"),
  perfumeBrand: document.getElementById("perfumeBrand"),
  perfumeDetail: document.getElementById("perfumeDetail"),
  outfitDetail: document.getElementById("outfitDetail"),
  topsSelect: document.getElementById("topsSelect"),
  outersSelect: document.getElementById("outersSelect"),
  bottomsSelect: document.getElementById("bottomsSelect"),
  shoesSelect: document.getElementById("shoesSelect"),
  othersSelect: document.getElementById("othersSelect"),
  wearOutfitDate: document.getElementById("wearOutfitDate"),
  wearOutfitSelect: document.getElementById("wearOutfitSelect"),
  wearPerfumeDate: document.getElementById("wearPerfumeDate"),
  wearPerfumeSelect: document.getElementById("wearPerfumeSelect"),
  outfitHistoryList: document.getElementById("outfitHistoryList"),
  perfumeHistoryList: document.getElementById("perfumeHistoryList"),
};

// IndexedDB設定
const DB_NAME = "outfit-tracker";
const DB_VERSION = 1;
const STORE_KEYS = ["items", "outfits", "wearOutfits", "wearPerfumes"];

// 重複しにくいIDを生成
const createId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// DBを開く（初回はストア作成）
const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    STORE_KEYS.forEach((key) => {
      if (!db.objectStoreNames.contains(key)) {
        db.createObjectStore(key, { keyPath: "id" });
      }
    });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// ストアの全レコードを取得
const readAll = (db, storeName) => new Promise((resolve, reject) => {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const req = store.getAll();
  req.onsuccess = () => resolve(req.result ?? []);
  req.onerror = () => reject(req.error);
});

// ストアを全削除してまとめて保存
const clearAndPutAll = (db, storeName, items) => new Promise((resolve, reject) => {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const clearReq = store.clear();
  clearReq.onerror = () => reject(clearReq.error);
  clearReq.onsuccess = () => {
    items.forEach((item) => {
      store.put(item);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  };
});

// 画面ステータス表示
const setStatus = (message) => {
  if (el.status) {
    el.status.textContent = message;
  }
};

// idがない旧データを補完
const normalizeWithId = (items) => {
  let changed = false;
  const normalized = items.map((item) => {
    if (item.id) return item;
    changed = true;
    return { ...item, id: createId() };
  });
  return { normalized, changed };
};

// IndexedDBから全データを読み込み
const loadData = async () => {
  const db = await openDb();
  const [items, outfits, wearOutfits, wearPerfumes] = await Promise.all([
    readAll(db, "items"),
    readAll(db, "outfits"),
    readAll(db, "wearOutfits"),
    readAll(db, "wearPerfumes"),
  ]);
  db.close();

  const normItems = normalizeWithId(items);
  const normOutfits = normalizeWithId(outfits);
  const normWearOutfits = normalizeWithId(wearOutfits);
  const normWearPerfumes = normalizeWithId(wearPerfumes);

  state.items = normItems.normalized;
  state.outfits = normOutfits.normalized;
  state.wearOutfits = normWearOutfits.normalized;
  state.wearPerfumes = normWearPerfumes.normalized;

  if (normItems.changed || normOutfits.changed || normWearOutfits.changed || normWearPerfumes.changed) {
    await saveAll();
  }
};

// 全ストアをIndexedDBへ保存
const saveAll = async () => {
  const db = await openDb();
  await Promise.all([
    clearAndPutAll(db, "items", state.items),
    clearAndPutAll(db, "outfits", state.outfits),
    clearAndPutAll(db, "wearOutfits", state.wearOutfits),
    clearAndPutAll(db, "wearPerfumes", state.wearPerfumes),
  ]);
  db.close();
};

// 複数選択の値を配列で取得
const selectedValues = (selectEl) => Array.from(selectEl.selectedOptions)
  .map((option) => option.value)
  .filter((value) => value);

// アイテム追加→保存
const addItem = async (item) => {
  state.items.push(item);
  renderItems();
  await saveAll();
  setStatus("アイテムを保存しました。");
};

// コーデ追加→保存
const addOutfit = async (outfit) => {
  state.outfits.push(outfit);
  renderOutfits();
  await saveAll();
  setStatus("コーデを保存しました。");
};

// コーデ着用記録→保存
const addWearOutfit = async (record) => {
  state.wearOutfits.push(record);
  renderHistories();
  await saveAll();
  setStatus("コーデの着用を保存しました。");
};

// 香水着用記録→保存
const addWearPerfume = async (record) => {
  state.wearPerfumes.push(record);
  renderHistories();
  await saveAll();
  setStatus("香水の着用を保存しました。");
};

// セレクトボックスの選択肢を再描画
const renderOptions = (selectEl, items) => {
  const placeholderText = selectEl.querySelector("option[value='']")?.textContent
    ?? selectEl.name
    ?? "select";
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  selectEl.appendChild(placeholder);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    const parts = [];
    if (item.brand) parts.push(item.brand);
    if (item.detail) parts.push(item.detail);
    if (item.color) parts.push(item.color);
    if (item.size) parts.push(item.size);
    if (item.length) parts.push(item.length);
    const fallback = parts.join(" ") || item.id;
    const label = (item.label ?? fallback) || item.id;
    option.textContent = label;
    selectEl.appendChild(option);
  });
};

// アイテム系のセレクトを更新
const renderItems = () => {
  const tops = state.items.filter((item) => item.category === "tops");
  const outers = state.items.filter((item) => item.category === "outers");
  const bottoms = state.items.filter((item) => item.category === "bottoms");
  const shoes = state.items.filter((item) => item.category === "shoes");
  const others = state.items.filter((item) => item.category === "others");

  renderOptions(el.topsSelect, tops);
  renderOptions(el.outersSelect, outers);
  renderOptions(el.bottomsSelect, bottoms);
  renderOptions(el.shoesSelect, shoes);
  renderOptions(el.othersSelect, others);

  const perfumes = state.items.filter((item) => item.category === "perfume");
  renderOptions(el.wearPerfumeSelect, perfumes);
};

// コーデのセレクトを更新
const renderOutfits = () => {
  const outfitOptions = state.outfits.map((outfit) => ({
    id: outfit.id,
    label: outfit.detail || "untitled",
  }));
  renderOptions(el.wearOutfitSelect, outfitOptions);
};

// 直近N日以内か判定（ローカル日付で計算）
const withinLastDays = (dateStr, days) => {
  if (!dateStr) return false;
  const date = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

// 着用履歴（直近7日）を描画
const renderHistories = () => {
  const outfitItems = state.wearOutfits
    .filter((record) => withinLastDays(record.date, 7))
    .sort((a, b) => b.date.localeCompare(a.date));

  el.outfitHistoryList.innerHTML = "";
  outfitItems.forEach((record) => {
    const outfit = state.outfits.find((item) => item.id === record.outfitId);
    const li = document.createElement("li");
    li.textContent = `${record.date} - ${outfit?.detail || "(不明)"}`;
    el.outfitHistoryList.appendChild(li);
  });

  const perfumeItems = state.wearPerfumes
    .filter((record) => withinLastDays(record.date, 7))
    .sort((a, b) => b.date.localeCompare(a.date));

  el.perfumeHistoryList.innerHTML = "";
  perfumeItems.forEach((record) => {
    const perfume = state.items.find((item) => item.id === record.perfumeId);
    const li = document.createElement("li");
    li.textContent = `${record.date} - ${perfume?.brand || ""} ${perfume?.detail || "(不明)"}`.trim();
    el.perfumeHistoryList.appendChild(li);
  });
};

// 画面全体を再描画
const renderAll = () => {
  renderItems();
  renderOutfits();
  renderHistories();
};

// 入力欄をクリア
const resetFormInputs = (form) => {
  form.querySelectorAll("input[type='text']").forEach((input) => {
    input.value = "";
  });
};

// フォーム送信イベントを登録
const bindEvents = () => {
  el.addItemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = {
      id: createId(),
      category: el.itemCategory.value,
      brand: el.itemBrand.value.trim(),
      detail: el.itemDetail.value.trim(),
      color: el.itemColor.value,
      size: el.itemSize.value,
      length: el.itemLength.value,
    };
    if (!item.brand && !item.detail) return;
    addItem(item);
    resetFormInputs(el.addItemForm);
  });

  el.addShoesForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = {
      id: createId(),
      category: "shoes",
      brand: el.shoesBrand.value.trim(),
      detail: el.shoesDetail.value.trim(),
      color: el.shoesColor.value,
      size: "",
      length: "",
    };
    if (!item.brand && !item.detail) return;
    addItem(item);
    resetFormInputs(el.addShoesForm);
  });

  el.addPerfumeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = {
      id: createId(),
      category: el.perfumeCategory.value,
      brand: el.perfumeBrand.value.trim(),
      detail: el.perfumeDetail.value.trim(),
      color: "",
      size: "",
      length: "",
    };
    if (!item.brand && !item.detail) return;
    addItem(item);
    resetFormInputs(el.addPerfumeForm);
  });

  el.addOutfitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ids = [
      el.topsSelect.value,
      el.outersSelect.value,
      el.bottomsSelect.value,
      el.shoesSelect.value,
      el.othersSelect.value,
    ].filter(id => id);
    const outfit = {
      id: createId(),
      detail: el.outfitDetail.value.trim(),
      itemIds: ids.join("|"),
    };
    if (!outfit.detail) return;
    addOutfit(outfit);
    el.outfitDetail.value = "";
  });

  el.wearOutfitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      id: createId(),
      date: el.wearOutfitDate.value,
      outfitId: el.wearOutfitSelect.value,
    };
    if (!record.date || !record.outfitId) return;
    addWearOutfit(record);
  });

  el.wearPerfumeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      id: createId(),
      date: el.wearPerfumeDate.value,
      perfumeId: el.wearPerfumeSelect.value,
    };
    if (!record.date || !record.perfumeId) return;
    addWearPerfume(record);
  });
};

// 初期化（読込→描画→イベント登録）
const init = async () => {
  await loadData();
  renderAll();
  bindEvents();
};

init();
