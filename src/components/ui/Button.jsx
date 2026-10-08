const variants = {
    primary:   "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-white hover:bg-gray-50 text-gray-600 border border-gray-200",
    danger:    "bg-red-600 hover:bg-red-700 text-white",
    ghost:     "hover:bg-gray-100 text-gray-500",
  };
  
  export default function Button({ children, variant = "primary", size = "md", onClick, disabled, type = "button", className = "", icon: Icon }) {
    const sz = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-[13px]";
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sz} ${className}`}
      >
        {Icon && <Icon size={14} />}
        {children}
      </button>
    );
  }