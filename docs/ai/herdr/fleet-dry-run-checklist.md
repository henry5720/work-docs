# Fleet 工作流試跑清單

> 拿一件真的待辦，照 [agent-fleet-workflow.md](./agent-fleet-workflow.md) 跑一輪，邊跑邊打勾。
> **這份是消耗品** —— 跑完把「改進紀錄」那節的結論寫回主文件，然後把勾清空給下一輪用。
>
> 目的不是驗證指令能不能跑（那些都測過了），是驗證**這個流程你用起來順不順、哪一步最花時間**。

---

## 這輪的設定

| 欄位 | 填這裡 |
| --- | --- |
| 日期 | |
| 這輪測的 issue | `#____` |
| slug | |
| 整合分支 | `fix/inventory` |
| 開始時間 | |
| 結束時間 | |

> **第一輪挑哪張單**：挑「範圍小 + 會動到畫面」的。純 docs 的單（像 `#1767`）雖然安全，
> 但測不到人測那段，整條路只跑了一半。`#1766 建單表單的單號必填卻不會寫入單據` 這種
> 是好的第一輪對象：改動小、壞了也只影響一個表單、而且看得見。
>
> **第一輪只開 2 個 agent**，不要 5 個。你要測的是流程，不是吞吐量。

---

## 0. 開跑前先收拾現況

跑之前有三件遺留的東西會干擾判斷，先清掉。

- [ ] `herdr agent list`，確認每個 agent 都有 `name` 欄位。沒有的用 `herdr agent rename <pane-id> <slug>` 補
- [ ] `worktree-1` 現在有兩個 agent 共用（`wR:pH`、`wR:pK`），收掉一個，讓它回到「一個 worktree 一個 agent」
- [ ] `git branch -a` 看一下，確認沒有兩條 branch 在做同一件事
- [ ] 主 repo 那份 checkout 切到整合分支：`git -C ~/code/teamsync-frontend switch fix/inventory`

卡住的話記這裡：

```
```

---

## 1. 分流（目標 30 秒）

- [ ] 拿一句 PM 需求，問自己：**能不能一句話說出「改完之後畫面或行為長怎樣」？**
- [ ] 記下你的答案：能 / 不能 / 這需求不該做
- [ ] 實際花了幾秒：____

**這步算過的條件**：你沒有為了分流去翻 code。一翻 code 就代表判準寫得不夠好，記在下面。

改進點：

```
```

---

## 2. 開單

- [ ] `gh issue create --title "[modules/xxx] ..." --body-file ... --type <Bug|Feature|Task>`
- [ ] **先不掛 `ready-for-agent`**
- [ ] 記下 issue 編號

**這步算過的條件**：標題看得出是哪個模組 + 哪裡壞了，不用點進去就知道。

改進點：

```
```

---

## 3. 平行查現況（2 個 agent，read-only，不開 worktree）

- [ ] 在主 repo 那份 checkout 開 2 個 pane，各自 `herdr agent start <name> --kind claude --pane <id>`
- [ ] 各丟一句：`查 issue #____ 的現況，產簡報貼回 issue，最後標 ✅ 可以直接做 或 ⚠️ 需要對齊`
- [ ] `herdr agent wait <name> --until idle --until blocked`
- [ ] 兩個都跑完了

**這步算過的條件**（三個都要成立，缺一個就記下來）：

- [ ] 簡報真的 `gh issue comment` 貼回 issue 了，不是只印在 terminal
- [ ] 簡報裡有**具體檔案路徑 + 行號**，不是「在 inventory 模組裡」這種
- [ ] 它自己標了 ✅ / ⚠️，而且**標得對**（你看完覺得那個標籤合理）

⚠️ 兩個 agent 同時在主 repo 跑 read-only，理論上不會互相干擾。**如果發現有人寫了檔案，記下來** ——
那代表「第一階段不開 worktree」這條規則要改。

改進點：

```
```

---

## 4. 決策

- [ ] 一次看完兩則簡報
- [ ] 標 ✅ 的 → `gh issue edit <n> --add-label ready-for-agent`
- [ ] 標 ⚠️ 的 → 進 `/grill-with-docs`（這輪如果沒有 ⚠️ 的，這條跳過並註明）
- [ ] 實際花了幾分鐘：____

**這步算過的條件**：你是靠簡報做決定的，沒有回頭自己去 grep。

改進點：

```
```

---

## 5. 開 worktree 派工

- [ ] `herdr worktree create --base fix/inventory --branch "<slug>" --label "<slug>" --no-focus`
- [ ] 撈到 pane id
- [ ] bootstrap 兩行：
  - [ ] `pnpm install --frozen-lockfile`（記下花了幾秒：____）
  - [ ] `gh issue view <n> --comments > .claude/handoff.md`
- [ ] `herdr agent start <slug> --kind claude --pane <id>` ← **一定要給 name**
- [ ] `herdr agent prompt <slug> "讀 .claude/handoff.md，你 own issue #<n>"`

**這步算過的條件**：

- [ ] agent 讀完 handoff 就開始做，**沒有回頭問你背景**
- [ ] 你**一個字的 context 都沒有手動貼**

⚠️ 如果它問了背景，那不是 agent 的問題，是簡報寫得不夠。**把它問的那句記下來** ——
那句話就是簡報格式下一版要補的欄位。

它問了什麼：

```
```

---

## 6. worktree 裡的第一道關

- [ ] agent 自己跑過 `pnpm test`（相關的）
- [ ] agent 自己跑過 lint（只餵改動的檔案）
- [ ] agent 自己跑過 `pnpm typecheck`
- [ ] 你人工檢查範圍：`git diff --name-only fix/inventory..HEAD`
  - [ ] 改的檔案都在 issue 講的範圍內，**沒有多出來的**

⚠️ 沒有 `.env.local` 有沒有造成任何問題？如果 agent 在這步卡住或抱怨，**記下來**，
那會推翻「bootstrap 只有兩行」這個結論。

有沒有卡：

```
```

---

## 7. merge 進整合分支 + 人測

- [ ] `git -C ~/code/teamsync-frontend merge --no-ff <slug>`
- [ ] 在整合分支開 dev server
- [ ] 人測，功能對不對

**測出問題的話走這條**（沒問題就跳過，但註明「這輪沒測到回修路徑」）：

- [ ] `herdr agent prompt <slug> "整合測試發現：<現象>"`
- [ ] 確認它**不用你重講背景**就知道在說什麼
- [ ] 改完再 merge 一次
- [ ] **沒有用 revert**

**這步算過的條件**：整條回修來回你只打了一句話。

改進點：

```
```

---

## 8. 收尾

- [ ] `gh issue close <n> --comment "..."`
- [ ] **最後才** `herdr worktree remove --workspace <id>`
- [ ] 子 branch 沒有推上 origin
- [ ] 整合分支推上去：`git push origin fix/inventory`

---

## 改進紀錄（跑完填，這節才是這份文件的重點）

### 哪一步最花時間

| 步驟 | 花了多久 | 是你在等 agent，還是 agent 在等你？ |
| --- | --- | --- |
| 分流 | | |
| 查現況（2 個平行） | | |
| 決策 | | |
| 實作 | | |
| 人測 | | |

> **agent 在等你的那幾格，就是下一版要動的地方。** 你在等 agent 的那幾格不用管，
> 那是多開幾個 agent 就能吸收掉的。

### 主文件要改什麼

| 主文件哪一節 | 現在寫什麼 | 實際上是怎樣 |
| --- | --- | --- |
| | | |
| | | |

### 這輪沒測到的

（例如：沒有 ⚠️ 的單所以 grill 那條沒跑到、人測沒出問題所以回修路徑沒驗過）

```
```

### 下一輪要換什麼

- [ ] 開 3 個 agent 而不是 2 個
- [ ] 挑一件會跨前後端的（測 subagent 查後端那條）
- [ ] 其他：

---

## 跑完之後

1. 把「主文件要改什麼」那張表的內容寫進 [agent-fleet-workflow.md](./agent-fleet-workflow.md)
2. 把這份的勾清空、「這輪的設定」清空，留給下一輪
3. 表格裡的舊內容不用留 —— 要看歷史 git 裡有
