# B001 FindDog Transcripts Digest — 2026-05-05

> Mined from 33 distilled Claude session digests (~3.7MB, original 56.8MB) at docs/research/b001-finddog-distilled/.
> Goal: surface knowledge that emerged in real collaboration but didn't reach the project's docs/.

## Method
I read `INDEX.md` first, then worked all 33 session files in mixed passes: low-byte sessions were skimmed for relevance, high-byte/high-message sessions were read in full via condensed USER/ASSISTANT block extraction, and correction-signal user messages (`不要 / 不对 / 不是 / 停 / 应该 / wait / actually / no / 重新 / 又来` etc.) were separately mined to catch real pushback rather than later assistant summaries. Findings were then clustered across sessions, candidate Category 3 gotchas were checked against the reverse project `docs/` tree with targeted grep plus direct reads of likely destination files, and counts below are conservative, session-based when exact repetition volume was ambiguous.

## Session index
| session-id | date | signal categories present |
|---|---|---|
| 4ecee8f5 | 2026-04-17 | 2,5 |
| 92f1bcff | 2026-04-17 | 1,2,5 |
| e8626292 | 2026-04-17 | 1,3,4 |
| e7f8f5b1 | 2026-04-17 | 1,3,4,5 |
| 52b4d9bf | 2026-04-18 | — |
| 2d897ac6 | 2026-04-18 | 1,3,4,5 |
| b1fbe2d7 | 2026-04-18 | 3,4,5 |
| 637eaff1 | 2026-04-18 | 1,3,4,5 |
| 0436ce87 | 2026-04-18 | 3,5 |
| f929c07e | 2026-04-18 | 1,2,3,4,5 |
| 73fd98f1 | 2026-04-18 | 2,5 |
| a982f89a | 2026-04-18 | 4,5 |
| a7ce5f5d | 2026-04-19 | 1,2,3,4,5 |
| 23a35226 | 2026-04-19 | 2,3,5 |
| 7687278c | 2026-04-19 | 1,2,4,5 |
| 8d9f1d62 | 2026-04-19 | 3,4,5 |
| 39ba2411 | 2026-04-20 | 2,3,5 |
| 214597c0 | 2026-04-20 | 3,5 |
| 1752e043 | 2026-04-20 | 2,4,5 |
| 479df202 | 2026-04-20 | 1,3,5 |
| 2d564847 | 2026-04-20 | 1,2,3,4,5 |
| 7aad8266 | 2026-04-21 | 1,2,4,5 |
| 8bd46c01 | 2026-04-21 | 1,2,3,4,5 |
| a262b895 | 2026-04-21 | — |
| 7ac92c29 | 2026-04-21 | 1,2,3,4,5 |
| b0516020 | 2026-04-21 | 2,4,5 |
| 319565f3 | 2026-04-22 | 3,5 |
| 76810d87 | 2026-04-23 | 3,4,5 |
| ee07ff80 | 2026-04-23 | 1,2,4,5 |
| a7aa8eb6 | 2026-04-23 | 1,2,4,5 |
| 4724cfc9 | 2026-04-23 | 1,2,3,4,5 |
| bd9679ea | 2026-04-24 | 1,3,4 |
| 5282f513 | 2026-04-27 | 1,3,4,5 |

## Category 1 — Dead-ends Claude pursued before correction
| # | Cause (what Claude tried) | Correction (what user said) | Sessions |
|---|---|---|---|
| 1 | Treated the reference app as if it were already a reusable source Cocos project. | User clarified it was itself a reverse-engineered artifact and should be further decompiled/recovered, not merely studied. | 92f1bcff |
| 2 | Proposed scope-thinning and selective restoration. | User pushed back toward full-fidelity restoration and explicitly kept 10 levels to avoid silently dropping logic. | 92f1bcff, 2d897ac6 |
| 3 | Planned scene handling around expanded 3.x-style JSON arrays. | Real artifacts forced a correction: scenes/prefabs were CCON-compressed and needed unpacking first. | e8626292, e7f8f5b1 |
| 4 | Assumed Cocos 3.x-style UUID-to-filename logic would identify quanmin prefab files. | User-facing work corrected course to content-based CCON identification because 2.x short-name files did not map cleanly. | f929c07e |
| 5 | Replaced the requested SettingPopup slider/toggle UI with a simpler label/button fallback. | User explicitly rejected the simplification and required the real slider/toggle problem to be solved. | f929c07e |
| 6 | Hand-generated or committed `.meta` before letting Creator own the import/reimport cycle. | User corrected the workflow: do not self-generate `.meta`; let Creator reimport and then commit the real metadata. | 2d564847, 7ac92c29 |
| 7 | Built Home around a generic/MMO-style layout influenced by CCCUIDemo. | User corrected direction back to zhaomiao/playable layout grammar: side floating actions, central preview, bottom CTA. | 2d564847 |
| 8 | Treated editor preview as sufficient evidence that Game layout/scaling was correct. | User surfaced that browser/WeChat builds were the real truth source; editor preview had produced false confidence. | a7ce5f5d, 8d9f1d62, bd9679ea |
| 9 | Used popup masks/absorbers that only covered the centered popup region. | User corrected that overlays had to cover the full phone viewport, and that central preview click vs 收藏 semantics were wrong. | 2d564847, 7aad8266 |

## Category 2 — Recurring user pushback patterns (feedback-memory candidates for ProjectHarness)
| Rule (paraphrased) | Count | Verbatim example | Sessions |
|---|---:|---|---|
| Preserve full fidelity; do not take “good enough” shortcuts on restoration scope. | 5 | “不要偷懒啊，尽量全量还原” | 92f1bcff, 2d897ac6, e7f8f5b1, 7aad8266, 4724cfc9 |
| Do not replace the requested control/behavior with a simpler workaround; solve the real Cocos problem. | 4 | “不要逃避问题” | f929c07e, 7aad8266, 8bd46c01, a7aa8eb6 |
| Validate visual/runtime behavior in the real build target, not only in Editor preview. | 3 | “浏览器和微信开发者平台里狗都是错位的” | a7ce5f5d, 8d9f1d62, bd9679ea |
| Do not self-generate `.meta`; let Creator own metadata and UUID materialization. | 2 | “你不能自己生成meta” | 2d564847, 7ac92c29 |
| If a fix is obvious, keep going instead of interrupting for trivial confirmation. | 2 | “这个应该你自己就能改？何必打断” | 7ac92c29, 319565f3 |
| Do not let reference projects leak the wrong theme/semantics into the product. | 2 | “不要再错误把参考当主题了” | 8bd46c01, 2d564847 |

## Category 3 — Articulated gotchas not in docs/
| Gotcha | Where it appeared | Should be promoted to | Why it's not in docs/ |
|---|---|---|---|
| `ViewportCtrl.reset()` owns the playable-layer transform and will overwrite external scale/position hacks. If top/bottom-fit baseline is needed, it must live inside `ViewportCtrl`, not in `FkptGame`. | 5282f513 | `docs/handoff-2026-04-21.md` or a new `docs/runtime-layout-gotchas.md` | Existing docs cover fixed-width math and bg sizing, but none document the reset-clobber interaction or the need for an internal baseline (`_baseScale/_baseY`) model. |
| The miss-flash overlay cannot live on `BgLayer` alone: with zoom and sibling dog containers, dogs stay visually “outside” the red flash. The overlay must be layered/sized above the playable dog containers. | bd9679ea, 5282f513 | `docs/handoff-2026-04-22-audio-system-b-plus.md` or a new `docs/game-feedback-pitfalls.md` | Docs mention “镜头抖 + 红叉 + 闪红” generically, but not the z-order/zoom failure mode that makes dog positions leak through. |
| Prop HUD badges need to refresh on `USER_DATA_CHANGED`, not only `ITEM_RECEIVED`, because ad-based telescope refill goes through `ItemSystem.add()` and otherwise leaves the badge stuck on “AD”. | 5282f513 | `docs/h5-peripheral-systems-rules.md` or `docs/handoff-2026-04-24-game-hud-layout-plan.md` | Current docs describe `ITEM_RECEIVED`/`ITEM_USED`, but not the separate inventory mutation path used by reward-video refill. |
| Gameplay prop/HUD icons are not guaranteed square; using `bindSprite` with fixed CUSTOM sizing stretches them. The prop bar needs the same `bindIcon`/TRIMMED path already learned for Home icons. | 5282f513 | `docs/handoff-2026-04-24-game-hud-layout-plan.md` or `docs/cocos-3.8.5-to-3.8.8-diff.md` | The docs cover Home/menu icon binding and trim behavior, but not this exact gameplay-HUD variant, so the same lesson had to be rediscovered. |

Docs/ files checked for Category 3 absence:
`docs/handoff-B-to-C.md`, `docs/handoff-2026-04-21.md`, `docs/handoff-2026-04-21-night.md`, `docs/handoff-2026-04-21-D-3.8-15-home-icons-preview-frame.md`, `docs/handoff-2026-04-22.md`, `docs/handoff-2026-04-22-audio-system-b-plus.md`, `docs/handoff-2026-04-24.md`, `docs/cocos-3.8.5-to-3.8.8-diff.md`, `docs/h5-peripheral-systems-rules.md`, `docs/asset-import-protocol.md`, `docs/pop-inventory.md`, `docs/stage3-t17-t18-checklist.md`, plus targeted grep across `docs/**/*.md` excluding `docs/research/`.

## Category 4 — Repeated problems across sessions
| Problem cluster | Sessions | Count | Hypothesized missing KB entry |
|---|---|---:|---|
| Cocos asset/import/serialization pitfalls kept recurring: `.meta` ownership, `.d.ts` runtime loading, compressed component UUIDs, trim behavior, spriteframe-null rendering. | 2d564847, 637eaff1, f929c07e, 7ac92c29, 76810d87, 5282f513 | 6 | `cocos-asset-pitfalls.md` |
| Editor preview repeatedly produced false positives; browser/WeChat builds exposed the real layout and loading bugs. | a7ce5f5d, 8d9f1d62, bd9679ea, 5282f513 | 4 | `runtime-validation-ladder.md` |
| Popup/overlay coverage and click-absorption bugs resurfaced across systems. | 7aad8266, a7ce5f5d, bd9679ea, 2d564847, 5282f513 | 5 | `popup-overlay-patterns.md` |
| Home layout repeatedly drifted away from the target product grammar and had to be pulled back toward the playable references. | 2d564847, 7aad8266, 8bd46c01, 7ac92c29, 4724cfc9 | 5 | `target-layout-grammar.md` |
| Plans/specs were repeatedly overturned by real artifact formats, ownership, or packaging ground truth. | e8626292, e7f8f5b1, 2d897ac6, f929c07e, 319565f3 | 5 | `artifact-ground-truth-first.md` |

## Category 5 — Collaboration-mode signals
| Signal (paraphrased) | Count | Verbatim example | Sessions |
|---|---:|---|---|
| User prefers long autonomous runs, then batched validation or handoff checkpoints. | 6 | “停下来，写handoff，记得提醒下个session一口气先把所有切片完成，我醒了再挨个校验” | 73fd98f1, a982f89a, 7ac92c29, 4724cfc9, 479df202, 5282f513 |
| User is comfortable with the recommended option when the branch really matters; once decided, wants execution, not repeated debate. | 6 | “都按推荐来” | 73fd98f1, 479df202, 7aad8266, 8bd46c01, 7ac92c29, 5282f513 |
| User expects concrete operator checklists for GUI/runtime steps rather than vague “please test” requests. | 5 | “给我checklist” | 637eaff1, 7aad8266, bd9679ea, 5282f513, e8626292 |
| User steers visuals by annotated screenshots/reference images and expects fast incorporation. | 5 | “我发你参考图” | 7aad8266, 8bd46c01, ee07ff80, 4724cfc9, 5282f513 |
| User wants resumable handoffs with distinctive names because multiple sessions may happen in one day. | 2 | “handoff名字别太容易重复了。我们一天能开好几个session” | 2d564847, 7ac92c29 |
| User is willing to stage work: structure/layout first, true art/assets later. | 3 | “这个阶段可以只做A” | 479df202, 7ac92c29, 5282f513 |

## Top 5 KB-design implications
1. Add a mandatory “ground-truth first” section to per-project KBs: actual bundle formats, ownership, runtime packaging, and known spec invalidators.
2. Add a canonical Cocos pitfall page covering `.meta`, compressed UUIDs, `.d.ts` vs `.ts`, trim modes, spriteframe-null rendering, and popup absorption.
3. Add a runtime validation ladder to the KB standard: Editor preview is provisional; browser/WeChat build verification is required before calling layout work done.
4. Add a per-project “working style memory” block: autonomy threshold, interruption threshold, handoff expectations, and what counts as an acceptable simplification.
5. Separate “layout grammar / visual binding rules” from feature specs so D/E-stage visual work stops relearning the same icon/mask/overlay lessons.

## Risks / sensitive content
[redacted: app secret] in `2d897ac6` (paired in-session with an app identifier for an ad-platform integration).
