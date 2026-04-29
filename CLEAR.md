# IndexedDBのデータ消去ガイド

Outfit Trackerはブラウザの IndexedDB にすべてのデータを保存しています。このドキュメントでは、保存されたデータを削除する方法を説明します。

## Chrome での削除方法

### 方法1: Chrome DevTools から削除（推奨）

詳細な制御が可能で、特定のアプリのデータだけを削除できます。

1. **Chrome DevTools を開く**
   - Windows/Linux: `F12` または `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`

2. **Application タブに移動**
   - DevTools が開いたら、上部のタブから「Application」を選択

3. **IndexedDB を展開**
   - 左側パネルから「IndexedDB」をクリック
   - 「IndexedDB」の横の矢印をクリックして展開

4. **データベースを確認**
   - 「outfit-tracker」という名前のデータベースが表示されます
   - この上で右クリック → 「Delete」をクリック
   - または、データベース名をクリックして展開し、ストア（items, outfits, wearOutfits, wearPerfumes）を個別に削除可能

5. **確認**
   - 確認ダイアログで「削除」を選択
   - ページを再読み込みすると、データが消去されています

### 方法2: Chrome 設定から削除（すべてのデータ削除）

> ⚠️ この方法では、すべてのWebサイトの閲覧データが削除されます

1. **Chrome メニューを開く**
   - 右上の「三点メニュー」（⋮）をクリック

2. **設定 > プライバシーとセキュリティを選択**
   - 「設定」をクリック
   - 左側メニューから「プライバシーとセキュリティ」を選択

3. **閲覧データの削除**
   - 「閲覧履歴データを削除する」をクリック
   - または、「Ctrl + Shift + Delete」で直接開く

4. **削除対象を指定**
   - 時間範囲: 「全期間」を選択
   - Cookieおよびサイトデータ: チェックを入れる
   - 「削除」ボタンをクリック

### 方法3: デベロッパーツールのコンソールから削除

スクリプトを使用して削除することも可能です。

1. **DevTools を開く** → **Console タブに移動**

2. **以下のコマンドを実行**

```javascript
// IndexedDB 全体を削除
const deleteDB = () => {
  const request = indexedDB.deleteDatabase('outfit-tracker');
  request.onsuccess = () => console.log('IndexedDB deleted successfully');
  request.onerror = () => console.log('Failed to delete IndexedDB');
};
deleteDB();
```

3. **ページを再読み込み**
   - `F5` または `Cmd + R` で再読み込み
   - 新規データベースが自動作成されます

## よくある質問（FAQ）

### Q: データは完全に削除されますか？
**A:** はい、上記の方法でIndexedDBから完全に削除されます。ただし、ブラウザのキャッシュに残る可能性があるため、心配な場合はキャッシュもクリアしてください。

### Q: 特定のコーデだけを削除したい場合は？
**A:** 現在のアプリには個別削除機能がありません。以下の方法で対応してください：
- DevTools の Application タブから該当ストアを展開
- 削除したいアイテムを右クリック → 「Delete」

### Q: 削除してしまったデータは復元できますか？
**A:** IndexedDBから削除されたデータは復元できません。重要なデータはあらかじめ控えておくことをお勧めします。

### Q: パッケージ全体をリセットしたい場合は？
**A:** 以下を実行してください：
1. IndexedDBを削除（上記の方法1）
2. ブラウザキャッシュをクリア（上記の方法2）
3. ページを再読み込み（`Ctrl + F5`）
4. すべてのデータが初期化されます

## その他のブラウザでの削除方法

### Firefox
1. DevTools を開く（`F12`）
2. 「Storage」タブを選択
3. 左側から「IndexedDB」を展開
4. 「outfit-tracker」を右クリック → 「Delete All」

### Safari
1. 開発メニューを有効化（Safari > 設定 > 詳細 > 開発メニュー）
2. 開発 > Web インスペクタで DevTools を開く
3. 「Storage」タブから IndexedDB を探して削除

### Edge
1. DevTools を開く（`F12`）
2. 「Application」タブを選択
3. Chrome と同じ手順で削除

## データバックアップの推奨方法

削除する前に、データをバックアップしたい場合：

```javascript
// コンソールでこのコマンドを実行してデータをエクスポート
const exportData = async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('outfit-tracker', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const data = {};
  const stores = ['items', 'outfits', 'wearOutfits', 'wearPerfumes'];
  
  for (const store of stores) {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    data[store] = await new Promise((resolve, reject) => {
      const request = os.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  console.log(JSON.stringify(data, null, 2));
  // コンソール出力をコピーしてテキストファイルに保存
};
exportData();
```
