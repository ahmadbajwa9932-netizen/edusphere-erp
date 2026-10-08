export default function StatCard({ label, value, icon: Icon, color, subtext }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-[22px] font-semibold text-gray-800 leading-tight">{value}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
          {subtext && <p className="text-[10px] text-gray-300 mt-0.5">{subtext}</p>}
        </div>
      </div>
    );
  }