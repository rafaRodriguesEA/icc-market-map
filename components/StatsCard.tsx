import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group overflow-hidden relative">
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-800">{value}</h3>
        {trend && (
            <div className="flex items-center gap-1 mt-2">
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <i className="fas fa-arrow-up"></i> {trend}
                </span>
            </div>
        )}
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${color}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      {/* Decorative gradient line at bottom */}
      <div className={`absolute bottom-0 left-0 w-full h-1 ${color}`}></div>
    </div>
  );
};

export default StatsCard;