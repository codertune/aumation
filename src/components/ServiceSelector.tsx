import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
}

interface ServiceSelectorProps {
  services: Service[];
  selectedService: Service | null;
  onSelect: (service: Service) => void;
}

export default function ServiceSelector({ services, selectedService, onSelect }: ServiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const groupedServices = useMemo(() => {
    const filtered = services.filter(
      (service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped: { [category: string]: Service[] } = {};
    filtered.forEach((service) => {
      if (!grouped[service.category]) {
        grouped[service.category] = [];
      }
      grouped[service.category].push(service);
    });

    return grouped;
  }, [services, searchQuery]);

  const handleSelect = (service: Service) => {
    onSelect(service);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-between hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {selectedService ? (
            <>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                {selectedService.icon}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-lg truncate">
                  {selectedService.name}
                </p>
                <p className="text-sm text-gray-500 truncate">{selectedService.category}</p>
              </div>
            </>
          ) : (
            <>
              <Search className="h-6 w-6 text-gray-400" />
              <span className="text-gray-500 text-lg">Select a service to get started...</span>
            </>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {Object.keys(groupedServices).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No services found</p>
                </div>
              ) : (
                Object.entries(groupedServices).map(([category, categoryServices]) => (
                  <div key={category} className="mb-4">
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {category}
                    </div>
                    <div className="space-y-1">
                      {categoryServices.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => handleSelect(service)}
                          className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3 hover:bg-blue-50 transition-colors text-left ${
                            selectedService?.id === service.id ? 'bg-blue-50 border-2 border-blue-400' : ''
                          }`}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                            {service.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {service.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {service.description}
                            </p>
                          </div>
                          {selectedService?.id === service.id && (
                            <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
