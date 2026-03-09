// app/lib/starify.ts
type StarifyResult = {
    bullets: string[];
    missingInfo: string[];
  };
  
  /**
   * 规则版“STAR”改写：不编数据，只做句式增强 + 结构化 + 提示缺失信息
   * 输入：一段流水账 summary
   * 输出：3-5 条简历 bullet + 缺失信息提醒
   */
  export function starifySummary(summary: string): StarifyResult {
    const text = (summary || "").trim();
    if (!text) return { bullets: [], missingInfo: [] };
  
    // 1) 预处理：统一标点、去多余空格
    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/[；;]/g, "；")
      .replace(/[。\.]/g, "。")
      .replace(/\s+/g, " ")
      .trim();
  
    // 2) 切句：按换行 / 句号 / 分号 / 顿号
    const rawParts = normalized
      .split(/\n|。|；/)
      .map((s) => s.trim())
      .filter(Boolean);
  
    // 如果用户是用逗号堆出来的，也尝试再拆一次（谨慎）
    const parts =
      rawParts.length >= 2
        ? rawParts
        : normalized
            .split(/，|、/)
            .map((s) => s.trim())
            .filter(Boolean);
  
    // 3) 动词强化（不夸张，但更像简历）
    const verbRules: Array<[RegExp, string]> = [
      [/^负责(.*)/, "负责$1，梳理并推进关键事项落地"],
      [/^协助(.*)/, "协助$1，配合完成资料准备与流程衔接"],
      [/^参与(.*)/, "参与$1，承担执行与跟进工作"],
      [/^完成(.*)/, "完成$1，确保交付质量与时效"],
      [/^跟进(.*)/, "跟进$1，推动问题闭环处理"],
      [/^整理(.*)/, "整理$1，沉淀可复用的标准化材料"],
      [/^统计(.*)/, "统计$1，输出可读性更强的报表与结论"],
      [/^对接(.*)/, "对接$1，协调多方资源保障进度"],
      [/^优化(.*)/, "优化$1，提升流程效率与一致性"],
      [/^维护(.*)/, "维护$1，保障信息更新及时准确"],
    ];
  
    const bullets: string[] = [];
    for (const p of parts) {
      let s = p;
  
      // 去掉常见口语开头
      s = s.replace(/^(主要是|主要|日常|工作内容是|内容包括|包括)\s*/g, "");
  
      // 动词规则
      for (const [re, repl] of verbRules) {
        if (re.test(s)) {
          s = s.replace(re, repl);
          break;
        }
      }
  
      // 结尾补全：避免太口语
      s = s.replace(/^(我|本人)\s*/g, "");
      s = s.replace(/\s+/g, " ").trim();
  
      // 如果太短，略过
      if (s.length < 6) continue;
  
      // 统一用中文逗号和句末
      s = s.replace(/,/g, "，");
      s = s.replace(/;|；+/g, "；");
      s = s.replace(/[。]+$/g, "");
  
      bullets.push(s);
      if (bullets.length >= 6) break; // 上限，避免太多
    }
  
    // 4) 二次整理：尽量生成 3-5 条
    const finalBullets = compactBullets(bullets).slice(0, 5);
  
    // 5) 缺失信息提示（不要求你立刻做 UI 展示，也可以先打印/后续再加）
    const missingInfo = inferMissingInfo(text);
  
    return { bullets: finalBullets, missingInfo };
  }
  
  function compactBullets(items: string[]) {
    // 去重（简单版）
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of items) {
      const key = it.replace(/\d+/g, "#").slice(0, 18);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }
  
  function inferMissingInfo(original: string): string[] {
    const tips: string[] = [];
  
    // 是否包含数字/规模/占比等（仅用来提示，不是判断对错）
    const hasNumber = /\d/.test(original);
    if (!hasNumber) {
      tips.push("建议补充量化结果：如处理规模（人数/份数/金额/周期）、提升幅度（%）、节省时长（天/小时）。");
    }
  
    // 是否出现“结果”导向词
    const hasResultWords = /(提升|降低|缩短|减少|增加|优化|改进|达成|完成率|准确率|满意度|效率)/.test(original);
    if (!hasResultWords) {
      tips.push("建议补充结果描述：这项工作带来了什么改进？（效率/准确率/体验/成本/风险）");
    }
  
    // 是否提到工具/系统/方法
    const hasTool = /(系统|表格|Excel|PPT|Word|HRIS|OA|钉钉|飞书|北森|Moka|SAP|用友|金蝶|SQL)/i.test(original);
    if (!hasTool) {
      tips.push("建议补充方法/工具：你用什么系统/表格/流程把事情做成的？（如Excel、HR系统、SOP等）");
    }
  
    return tips.slice(0, 3);
  }