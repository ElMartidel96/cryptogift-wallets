import React, { useState } from 'react';
import { PHOTO_FILTERS } from '../lib/constants';

interface FilterSelectorProps {
  imageUrl: string;
  onFilterSelect: (filteredUrl: string, filterName: string) => void;
  onBack: () => void;
}

export const FilterSelector: React.FC<FilterSelectorProps> = ({ 
  imageUrl, 
  onFilterSelect, 
  onBack 
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [filteredPreviews, setFilteredPreviews] = useState<Record<string, string>>({});
  const [loadingFilters, setLoadingFilters] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const applyFilter = async (filterId: string) => {
    if (filteredPreviews[filterId]) return; // Already processed

    setLoadingFilters(prev => new Set(prev).add(filterId));
    setError(null);

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: filterId,
          image_url: imageUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to apply filter: ${response.status}`);
      }

      const data = await response.json();
      
      setFilteredPreviews(prev => ({
        ...prev,
        [filterId]: data.url
      }));
    } catch (err) {
      console.error('Filter error:', err);
      setError(`Error aplicando filtro ${filterId}`);
    } finally {
      setLoadingFilters(prev => {
        const newSet = new Set(prev);
        newSet.delete(filterId);
        return newSet;
      });
    }
  };

  const handleFilterClick = (filterId: string) => {
    setSelectedFilter(filterId);
    if (!filteredPreviews[filterId]) {
      applyFilter(filterId);
    }
  };

  const handleContinue = () => {
    if (!selectedFilter) return;
    
    const filteredUrl = filteredPreviews[selectedFilter] || imageUrl;
    const filterName = PHOTO_FILTERS.find(f => f.id === selectedFilter)?.name || 'Original';
    
    onFilterSelect(filteredUrl, filterName);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Elige tu Estilo</h2>
        <p className="text-gray-600">
          Aplica filtros IA para darle un toque único a tu regalo
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Original Image Option */}
      <div
        onClick={() => setSelectedFilter('original')}
        className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
          selectedFilter === 'original'
            ? 'border-blue-500 shadow-xl'
            : 'border-transparent hover:border-gray-300'
        }`}
      >
        <img
          src={imageUrl}
          alt="Original"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-end">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm p-3 w-full">
            <h3 className="font-semibold">Original</h3>
            <p className="text-sm text-gray-600">Sin filtros</p>
          </div>
        </div>
        {selectedFilter === 'original' && (
          <div className="absolute top-4 right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-2 gap-4">
        {PHOTO_FILTERS.map((filter) => (
          <div
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
              selectedFilter === filter.id
                ? 'border-blue-500 shadow-xl'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            {/* Loading State */}
            {loadingFilters.has(filter.id) && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}

            <img
              src={filteredPreviews[filter.id] || imageUrl}
              alt={filter.name}
              className={`w-full h-48 object-cover transition-all duration-300 ${
                filteredPreviews[filter.id] ? '' : 'filter grayscale'
              }`}
            />
            
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-end">
              <div className="bg-white bg-opacity-90 backdrop-blur-sm p-3 w-full">
                <h3 className="font-semibold">{filter.name}</h3>
                <p className="text-sm text-gray-600">{filter.description}</p>
              </div>
            </div>

            {selectedFilter === filter.id && (
              <div className="absolute top-4 right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Generator Option */}
      <div className="border-2 border-dashed border-purple-300 rounded-2xl p-6 text-center bg-purple-50">
        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-xl">✨</span>
        </div>
        <h3 className="font-semibold text-purple-800 mb-2">¿No tienes foto?</h3>
        <p className="text-sm text-purple-600 mb-4">
          Genera arte único con IA basado en una descripción
        </p>
        <button className="text-purple-600 font-medium text-sm hover:underline">
          Próximamente →
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Atrás
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedFilter}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};