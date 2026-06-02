type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5">
        <h2 className="text-base font-medium">占位内容</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          当前页面是基础结构占位，后续将逐步接入真实数据与交互流程。
        </p>
      </div>
    </section>
  );
}
