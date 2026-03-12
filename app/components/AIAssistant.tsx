"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Resume } from "@/app/lib/resumeSchema";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/app/lib/supabase";
import {
  applyResumePatch,
  extractResumePatchFromText,
  type ResumePatch,
  validateResumePatch,
  normalizeResumePatch,
} from "@/app/lib/resumePatch";



function stripResumePatchForDisplay(text: string) {
  const START = "<<<RESUME_PATCH_START>>>";
  const END = "<<<RESUME_PATCH_END>>>";

  const s = text.indexOf(START);
  if (s < 0) return text;

  const e = text.indexOf(END, s + START.length);

  // patch 还没结束：从 START 起隐藏，避免流式时把 JSON 慢慢吐给用户看
  if (e < 0) {
    return text.slice(0, s).trimEnd();
  }

  // patch 完整出现：移除整个块
  const before = text.slice(0, s).trimEnd();
  const after = text.slice(e + END.length).trimStart();

  // 合并一下，避免多余空行
  return (before + "\n\n" + after).trim();
}

function prettyPath(path: string) {
  // 先做一个最简单的可读化：把常见字段换成人话
  return path
    .replace(/^basics\./, "基本信息 · ")
    .replace(/^experience\[(\d+)\]\./, (_, i) => `工作经历 · 第${Number(i) + 1}段 · `)
    .replace(/^projects\[(\d+)\]\./, (_, i) => `项目经历 · 第${Number(i) + 1}段 · `)
    .replace(/^education\[(\d+)\]\./, (_, i) => `教育经历 · 第${Number(i) + 1}段 · `)
    .replace(/^skills\./, "技能 · ")
    .replace(/\.bullets$/, "要点")
    .replace(/\.items$/, "条目")
    .replace(/\.description$/, "描述")
    .replace(/\.title$/, "标题");
}

type Props = {
  resume: Resume;
  jd: string;
  setResume: React.Dispatch<React.SetStateAction<Resume>>;
  className?: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };


const PROGRESS_STEPS = [
  "正在读取你的简历与 JD…",
  "正在提取关键词与能力点…",
  "正在生成针对性建议…",
  "正在组织输出结构…",
] as const;

export default function AIAssistant({ resume, jd, setResume, className }: Props) {
  const pathname = usePathname();
  const resumeId = pathname.split("/").pop() || "unknown";
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [progressText, setProgressText] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // patch 相关状态
  const [detectedPatch, setDetectedPatch] = useState<ResumePatch | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Resume | null>(null);
  const [showPatchPanel, setShowPatchPanel] = useState(false);

  const messagesRef = useRef<ChatMsg[]>([]);
  const hasLoadedChatRef = useRef(false);
  const setMessagesSafe = (updater: (prev: ChatMsg[]) => ChatMsg[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  };


  useEffect(() => {
    if (!resumeId) return;
  
    hasLoadedChatRef.current = false;
  
    const key = `ai-chat-${resumeId}`;
    const cached = localStorage.getItem(key);
  
    try {
      const parsed = cached ? JSON.parse(cached) : [];
      setMessages(parsed);
      messagesRef.current = parsed;
    } catch {
      setMessages([]);
      messagesRef.current = [];
    } finally {
      hasLoadedChatRef.current = true;
    }
  }, [resumeId]);


  useEffect(() => {
    if (!resumeId) return;
    if (!hasLoadedChatRef.current) return;
  
    const key = `ai-chat-${resumeId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  }, [messages, resumeId]);

  // 自动滚到底部
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, progressText, showPatchPanel]);

  // 可取消
  const abortRef = useRef<AbortController | null>(null);

  const contextHint = useMemo(() => {
    const name = resume?.basics?.name || "（未填写姓名）";
    const title = resume?.basics?.title || "（未填写目标岗位）";
    const jdHint = jd?.trim() ? "已填写 JD" : "未填写 JD";
    return `${name} / ${title} · ${jdHint}`;
  }, [resume, jd]);

  const buildHistory = () => {
    const MAX_TURNS = 12;
    return messagesRef.current
      .filter((m) => m.content.trim().length > 0)
      .slice(-MAX_TURNS);
  };

  const startProgress = () => {
    setLastError(null);
    setProgressText(PROGRESS_STEPS[0]);
    let idx = 0;

    const t = window.setInterval(() => {
      idx += 1;
      if (idx >= PROGRESS_STEPS.length) {
        window.clearInterval(t);
        return;
      }
      setProgressText(PROGRESS_STEPS[idx]);
    }, 900);

    return () => window.clearInterval(t);
  };

  const stopProgress = () => setProgressText(null);

  // 从最新 assistant 文本里提取 patch（只在“完整块出现后”才会成功）
  const tryDetectPatch = (assistantFullText: string) => {
    const rawPatch = extractResumePatchFromText(assistantFullText);
    if (!rawPatch) return;

    const patch = normalizeResumePatch(rawPatch);

    const v = validateResumePatch(patch);
    if (!v.ok) {
      setDetectedPatch(null);
      setPatchError(v.reason || "patch 校验失败");
      setShowPatchPanel(true);
      return;
    }

    setDetectedPatch(patch);
    setPatchError(null);
    setShowPatchPanel(true);
  };

  const applyPatchToResume = async () => {
    if (!detectedPatch) return;

    // 保存撤销快照
    setUndoSnapshot(JSON.parse(JSON.stringify(resume)));

    // 应用 patch
    const normalizedPatch = normalizeResumePatch(detectedPatch);
    const next = applyResumePatch(resume, detectedPatch);
    setResume(next);

    // 写入历史版本
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const pathParts = window.location.pathname.split("/");
      const resumeId = pathParts[pathParts.length - 1];

      await fetch("/api/resume-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          userId: user.id,
          patch: detectedPatch,
          reason: "AI修改",
        }),
      });
    } catch (e) {
      console.error("保存 AI 历史版本失败:", e);
    }
  };

  const undo = () => {
    if (!undoSnapshot) return;
    setResume(undoSnapshot);
    setUndoSnapshot(null);
  };

  const runSend = async (content: string) => {
    // 每次发新问题，先清掉旧 patch（避免用户误应用旧 patch）
    setDetectedPatch(null);
    setPatchError(null);

    // 1) 插入 user
    const userMsg: ChatMsg = { role: "user", content };
    setMessagesSafe((prev) => [...prev, userMsg]);

    // 2) 插入 assistant 占位（流式追加）
    let assistantRaw = "";
    let assistantVisible = "";
    let patchParsed = false;
    setMessagesSafe((prev) => [...prev, { role: "assistant", content: "" }]);

    // 3) 进度提示
    const stopTimer = startProgress();

    // 4) 请求
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const accessToken = session?.access_token;
      
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal: ac.signal,
        body: JSON.stringify({
          message: content,
          resume,
          jd,
          history: buildHistory(),
          patchMode: "resume_patch_v1",
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let errMsg = `请求失败：${res.status}`;
      
        try {
          const errJson = await res.json();
          errMsg = errJson?.error || errMsg;
        } catch {
          const errText = await res.text();
          errMsg = errText || errMsg;
        }
      
        throw new Error(errMsg);
      }

      // JSON 兜底（非流式）
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const reply = data?.reply ?? data?.error ?? "AI 暂时无法返回结果";
        const assistantRaw = reply;
        const assistantVisible = stripResumePatchForDisplay(assistantRaw);

        setMessagesSafe((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { role: "assistant", content: assistantVisible };
          } else {
            copy.push({ role: "assistant", content: assistantVisible });
          }
          return copy;
        });

        // ✅ 用 raw 解析 patch
        tryDetectPatch(assistantRaw);

        return;
      }

      if (!res.body) throw new Error("No stream body returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      let gotAnyToken = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
      
        buffer += decoder.decode(value, { stream: true });
      
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
      
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
      
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr) continue;
          if (dataStr === "[DONE]") break;
      
          try {
            const json = JSON.parse(dataStr);
            const delta = json?.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;
      
            if (!gotAnyToken) {
              gotAnyToken = true;
              stopProgress();
            }
      
            assistantRaw += delta;
            assistantVisible = stripResumePatchForDisplay(assistantRaw);
      
            setMessagesSafe((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
      
              if (last?.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  content: assistantVisible,
                };
              } else {
                copy.push({
                  role: "assistant",
                  content: assistantVisible,
                });
              }
      
              return copy;
            });
      
            // ✅ 如果 patch 已经完整出现，立即解析(用Raw)
            if (!patchParsed && assistantRaw.includes("<<<RESUME_PATCH_END>>>")) {
              patchParsed = true;
              tryDetectPatch(assistantRaw);
            }
      
          } catch {
            // ignore malformed chunk
          }
        }
      }
      // ✅ 兜底：如果流过程中没检测到 patch，结束后再检测一次
      if (!patchParsed) {
        tryDetectPatch(assistantRaw);
      }
      tryDetectPatch(assistantRaw);
      stopProgress();
      
    } catch (e: any) {
      stopProgress();

      if (e?.name === "AbortError") {
        setMessagesSafe((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          const note = "（已停止生成）";
          if (last?.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              content: (last.content || note).trim() ? last.content + "\n\n" + note : note,
            };
          } else {
            copy.push({ role: "assistant", content: note });
          }
          return copy;
        });
        return;
      }

      const msg = (e?.message || "unknown error").slice(0, 800);
      setLastError(msg);

      setMessagesSafe((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        const isLimitError = msg.includes("免费次数已用完");

        const errReply = isLimitError
          ? "免费次数已用完，请升级 Pro。"
          : "AI 出错了。\n\n你可以点「重试」再来一次。\n\n错误信息（供调试）：\n" + msg;

        if (last?.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: errReply };
        } else {
          copy.push({ role: "assistant", content: errReply });
        }
        return copy;
      });
    } finally {
      stopTimer?.();
      abortRef.current = null;
    }
  };

  const sendMessage = async (text?: string) => {
    if (isSending) return;

    const content = (text ?? input).trim();
    if (!content) return;

    setIsSending(true);
    setLastUserMessage(content);
    setInput("");

    try {
      await runSend(content);
    } finally {
      setIsSending(false);
    }
  };

  const cancel = () => abortRef.current?.abort();

  const retry = () => {
    if (!lastUserMessage || isSending) return;
    sendMessage(lastUserMessage);
  };

  const clearChat = () => {
    if (isSending) return;
  
    setMessages([]);
    messagesRef.current = [];
    localStorage.removeItem(`ai-chat-${resumeId}`);
  
    setLastError(null);
    setLastUserMessage(null);
    setProgressText(null);
    setDetectedPatch(null);
    setPatchError(null);
    setShowPatchPanel(false);
    setUndoSnapshot(null);
  };

  return (
    <div
      className={
        "relative flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl " +
        (className ?? "")
      }
    >
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">AI 助手</div>

          <div className="flex items-center gap-2">
            {isSending ? (
              <button
                className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                onClick={cancel}
                title="停止生成"
              >
                停止
              </button>
            ) : (
              <>
                <button
                  className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={!lastUserMessage}
                  onClick={retry}
                  title="重试上一条"
                >
                  重试
                </button>
                <button
                  className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  onClick={clearChat}
                  title="清空对话"
                >
                  清空
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-1 text-xs text-neutral-500">{contextHint}</div>

        {isSending && progressText && (
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
            <span className="inline-block h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
            {progressText}
          </div>
        )}
      </div>

      {/* patch 面板（产品级：预览/应用/撤销） */}
      {(detectedPatch || patchError) && (
        <div className="border-b px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-800">自动修改</div>

            {!patchError && detectedPatch && (
              <button
                className="text-xs text-neutral-500 hover:text-neutral-800"
                onClick={() => setShowPatchPanel(true)}
              >
                预览变更
              </button>
            )}
          </div>

          {patchError ? (
            <div className="mt-2 text-xs text-red-600">{patchError}</div>
          ) : detectedPatch ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                onClick={applyPatchToResume}
              >
                应用到简历
              </button>

              <button
                className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:shadow"
                onClick={() => setShowPatchPanel(true)}
              >
                预览变更
              </button>

              <button
                className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:shadow disabled:opacity-50"
                disabled={!undoSnapshot}
                onClick={undo}
              >
                撤销
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ✅ 帘子（覆盖层）：showPatchPanel 为 true 时出现 */}
      {showPatchPanel && detectedPatch && (
        <div className="absolute inset-0 z-50">
          {/* 背景遮罩：点空白处关闭 */}
          <button
            aria-label="关闭预览变更"
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowPatchPanel(false)}
          />

          {/* 帘子主体 */}
          <div className="absolute left-3 right-3 top-3 bottom-3 rounded-2xl bg-white shadow-xl border border-neutral-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold text-neutral-900">预览变更</div>
              <button
                className="rounded-xl bg-neutral-100 px-3 py-1 text-xs text-neutral-800 hover:bg-neutral-200"
                onClick={() => setShowPatchPanel(false)}
              >
                关闭
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 text-sm text-neutral-800">
              {detectedPatch.reason && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-neutral-500">原因</div>
                  <div className="mt-1 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed">
                    {detectedPatch.reason}
                  </div>
                </div>
              )}

              <div className="text-xs font-medium text-neutral-500">将修改的内容</div>
              <ul className="mt-2 space-y-2">
                {detectedPatch.operations.map((op, idx) => (
                  <li key={idx} className="rounded-xl bg-neutral-50 p-3 text-xs">
                    <div className="font-medium text-neutral-800">
                      {op.op === "set"
                        ? "更新"
                        : op.op === "replaceArray"
                        ? "替换列表"
                        : op.op === "insert"
                        ? "插入"
                        : "删除"}
                      {" · "}
                      {prettyPath(op.path)}
                    </div>

                    {"index" in op ? (
                      <div className="mt-1 text-neutral-600">
                        位置：第 {(op as any).index + 1} 项
                      </div>
                    ) : null}

                    {"value" in op && Array.isArray((op as any).value) ? (
                      <div className="mt-1 text-neutral-600">
                        涉及条目数：{(op as any).value.length}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">
                  查看技术细节（JSON）
                </summary>
                <pre className="mt-2 rounded-xl bg-neutral-50 p-3 text-xs overflow-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(detectedPatch.operations, null, 2)}
                </pre>
              </details>
            </div>

            <div className="border-t px-4 py-3 flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                onClick={() => {
                  applyPatchToResume();
                  setShowPatchPanel(false);
                }}
              >
                应用并关闭
              </button>

              <button
                className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:shadow disabled:opacity-50"
                disabled={!undoSnapshot}
                onClick={() => {
                  undo();
                  setShowPatchPanel(false);
                }}
              >
                撤销并关闭
              </button>

              <button
                className="ml-auto rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:shadow"
                onClick={() => setShowPatchPanel(false)}
              >
                返回聊天
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 快捷按钮 */}
      <div className="border-b px-3 py-2 flex flex-wrap gap-2">
        <button
          className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-50"
          disabled={isSending}
          onClick={() =>
            sendMessage(
              "请基于我当前简历和JD，指出匹配度短板，并给3条可操作修改建议（不要编造经历和数据）。最后请给出可应用的 resume_patch。"
            )
          }
        >
          JD 对齐建议
        </button>

        <button
          className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-50"
          disabled={isSending}
          onClick={() =>
            sendMessage(
              "请将我【第一条经历】改写为更有说服力的 3 条 bullet（STAR风格，不要编造数据；缺数据请提示我补充）。最后请给出可应用的 resume_patch（写入 experience[0].bullets）。"
            )
          }
        >
          强化经历表达
        </button>

        <button
          className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-50"
          disabled={isSending}
          onClick={() =>
            sendMessage(
              "请根据JD补齐我的技能关键词（不要虚构）。最后请给出可应用的 resume_patch（优先写入 skills.categories[0].items）。"
            )
          }
        >
          技能关键词补全
        </button>
      </div>

      <div className="h-[360px] overflow-y-auto p-4 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="text-neutral-500">
            直接问我也行，比如：<br />
            “把第1条经历改成3条STAR bullet，并应用到简历”<br />
            “根据JD补齐我的技能关键词，并应用”<br />
            “我这份简历最大短板是什么？”
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[90%] rounded-2xl px-3 py-2 leading-relaxed " +
                (msg.role === "user"
                  ? "bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] text-white shadow-[0_8px_22px_rgba(15,23,42,0.16)]"
                  : "border border-slate-200 bg-slate-50/90 text-slate-800")
              }
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <input
          className="flex-1 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="问我如何优化简历…（可要求“给 resume_patch 并应用”）"
          disabled={isSending}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          className="rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.22)] disabled:opacity-50"
          disabled={isSending}
          onClick={() => sendMessage()}
        >
          发送
        </button>
      </div>

      {lastError && !isSending && (
        <div className="px-4 pb-3 -mt-2">
          <button className="text-xs text-neutral-600 underline hover:text-neutral-900" onClick={retry}>
            刚才失败了，点此重试
          </button>
        </div>
      )}
    </div>
  );
}