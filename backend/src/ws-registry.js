// ws-registry.js
// ------------------
// 単純な WebSocket 接続レジストリ。
// "hello" メッセージで登録された agentId をキーに
// WebSocket オブジェクトを保持・取得・削除します。
// 今後、タイムアウトやメタ情報を追加したい場合は
// このファイルに処理を集約しておくと保守が楽です。

export const agentRegistry = new Map();

/**
 * 登録 ← backend/src/index.js の connection イベントで呼び出し
 * @param {string} agentId  "vm-001" など
 * @param {WebSocket} socket  ws.WebSocket インスタンス
 */
export function registerAgent(agentId, socket) {
  agentRegistry.set(agentId, socket);
}

/**
 * 切断時のクリーンアップ
 * @param {string} agentId
 */
export function unregisterAgent(agentId) {
  agentRegistry.delete(agentId);
}

/**
 * 取得
 * @param {string} agentId
 * @returns {WebSocket|undefined}
 */
export function getAgentSocket(agentId) {
  return agentRegistry.get(agentId);
}

/**
 * agent が接続しているか確認
 * @param {string} agentId
 * @returns {boolean}
 */
export function isConnected(agentId) {
  return agentRegistry.has(agentId);
}