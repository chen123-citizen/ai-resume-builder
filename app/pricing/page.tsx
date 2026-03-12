export default function PricingPage() {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[28px] border border-white/70 bg-white/85 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-2xl font-semibold text-slate-900">升级 Pro</div>
            <div className="mt-2 text-sm text-slate-500">
              解锁 AI 助手与 JD 匹配分析的无限使用权限。
            </div>
  
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">免费版</div>
                <div className="mt-3 text-3xl font-bold text-slate-900">¥0</div>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li>AI 助手 2 次</li>
                  <li>JD 匹配 2 次</li>
                  <li>基础编辑与预览</li>
                </ul>
              </div>
  
              <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white">
                <div className="text-sm font-semibold">Pro</div>
                <div className="mt-3 text-3xl font-bold">即将上线</div>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>无限 AI 简历优化</li>
                  <li>无限 JD 匹配分析</li>
                  <li>更高效针对岗位优化简历</li>
                  <li>优先体验新功能</li>
                </ul>
  
                <button className="mt-6 w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
                  支付功能即将上线
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }