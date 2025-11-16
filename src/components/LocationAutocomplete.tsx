import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MapPin, Check } from 'lucide-react';
import { searchLocations, LocationSuggestion, GeocodeResult } from '@/lib/geocoding';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: GeocodeResult) => void;
  placeholder: string;
  label: string;
  selectedLocation?: GeocodeResult;
}

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder,
  label,
  selectedLocation,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for suggestions as user types
  useEffect(() => {
    // Don't search if location is already selected
    if (selectedLocation && selectedLocation.placeId !== '0') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(value, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSearching(false);
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimeout);
  }, [value, selectedLocation]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    // Clear selected location when user types
    if (selectedLocation) {
      onLocationSelect({
        lat: 0,
        lon: 0,
        displayName: '',
        placeId: '0',
      });
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    // Show place name in input if available, otherwise show address
    const displayValue = suggestion.name || suggestion.address;
    onChange(displayValue);
    onLocationSelect({
      lat: suggestion.lat,
      lon: suggestion.lon,
      displayName: suggestion.name || suggestion.displayName,
      placeId: suggestion.placeId,
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        {label}
      </label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (!selectedLocation || selectedLocation.placeId === '0') {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }
          }}
          className={`h-12 text-lg ${selectedLocation && selectedLocation.placeId !== '0' ? 'border-success border-2' : ''}`}
        />
        {selectedLocation && selectedLocation.placeId !== '0' && (
          <Check className="absolute right-3 top-3 w-6 h-6 text-success" />
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute z-50 w-full mt-2 max-h-80 overflow-auto shadow-elevated">
            <div className="divide-y">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base mb-0.5">
                        {suggestion.name || suggestion.address}
                      </div>
                      {suggestion.name && suggestion.name !== suggestion.address && (
                        <div className="text-xs text-muted-foreground">
                          {suggestion.address}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
        
        {isSearching && (
          <div className="absolute right-3 top-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {selectedLocation && selectedLocation.placeId !== '0' && (
        <p className="text-xs text-success flex items-center gap-1">
          <Check className="w-3 h-3" />
          Location confirmed
        </p>
      )}
    </div>
  );
}
