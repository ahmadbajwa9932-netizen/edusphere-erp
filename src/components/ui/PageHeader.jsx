export default function PageHeader({ title, description, children }) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-gray-800 leading-tight">{title}</h1>
          {description && <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    );
  }