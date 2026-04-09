import React from 'react';
import { Star, MapPin, ChefHat } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

function VendorCard({ vendor, onClick, onHover, isHovered }) {
  const { t } = useTranslation();

  const distanceLabel = vendor.distance != null 
    ? vendor.distance >= 1000 
      ? `${(vendor.distance / 1000).toFixed(1)} km` 
      : `${vendor.distance} m`
    : null;

  return (
    <div 
      onClick={() => onClick(vendor)}
      onMouseEnter={() => onHover && onHover(vendor.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border p-5 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group
        ${isHovered ? 'border-orange-400 ring-2 ring-orange-200 shadow-lg shadow-orange-100' : 'border-white/60 hover:border-orange-200'}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-100 to-rose-50 rounded-bl-full opacity-60 -z-0 transition-transform duration-500 group-hover:scale-150"></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-primary w-12 h-12 rounded-xl flex justify-center items-center text-white shadow-md flex-shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base font-heading tracking-tight leading-tight mb-1 truncate">
              {vendor.name}
            </h3>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{vendor.type}</p>
          </div>
        </div>
        {distanceLabel && (
          <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded border border-blue-100 flex-shrink-0 ml-2">
            {distanceLabel}
          </span>
        )}
      </div>
      
      {vendor.address && (
        <p className="mt-3 text-xs text-gray-500 flex items-start relative z-10 leading-snug">
          <MapPin className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5 text-gray-400" />
          <span className="line-clamp-2">{vendor.address}</span>
        </p>
      )}
      
      <div className="mt-4 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-amber-50 px-2 py-1 rounded border border-amber-100">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span className="ml-1 text-xs font-bold text-amber-700">{vendor.rating}</span>
          </div>
          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${vendor.isOpen ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {vendor.isOpen ? t('openNow') : t('closed')}
          </span>
        </div>
        <span className="text-xs font-bold text-gray-400 group-hover:text-orange-500 transition-colors">
          {t('view')} →
        </span>
      </div>
    </div>
  );
}

export default VendorCard;
