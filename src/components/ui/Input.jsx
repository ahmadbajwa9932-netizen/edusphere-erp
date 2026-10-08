export default function Input({ label, error, icon: Icon, className = "", ...props }) {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-[12px] font-medium text-gray-600">{label}</label>}
        <div className="relative">
          {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
          <input
            className={`w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2 text-[13px] text-gray-800 border rounded-lg outline-none transition-all
              placeholder:text-gray-300
              border-gray-200 hover:border-gray-300
              focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10
              disabled:bg-gray-50 disabled:text-gray-400
              ${error ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}
              ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }