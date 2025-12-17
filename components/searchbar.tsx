import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import { fetchSearchResults, setSearchQuery, clearSearchQuery } from '../app/store/slices/searchslice';

interface SearchBarProps {
  onSearch?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search customers, dishes, menus, responses, bills...",
  autoFocus = false
}) => {
  const dispatch = useAppDispatch();
  const searchState = useAppSelector((state) => state.search);
  const searchQuery = searchState.query;
  const searchLoading = searchState.loading;
  
  // Local state for responsive typing
  const [localText, setLocalText] = useState(searchQuery);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const textInputRef = useRef<TextInput>(null);

  // Sync with Redux when it changes externally
  useEffect(() => {
    setLocalText(searchQuery);
  }, [searchQuery]);

  // Auto-focus if prop is true
  useEffect(() => {
    if (autoFocus && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
    }
  }, [autoFocus]);

  const handleSearch = (text: string) => {
    // Update local state immediately for responsive typing
    setLocalText(text);
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Update Redux state immediately (for UI sync)
    dispatch(setSearchQuery(text));
    
    // Call parent callback if provided
    if (onSearch) {
      onSearch(text);
    }

    // Set new timer for API calls (debounced)
    debounceTimer.current = setTimeout(() => {
      if (text.trim().length > 0) {
        dispatch(fetchSearchResults(text));
      } else {
        dispatch(clearSearchQuery());
      }
    }, 500); // 500ms delay for API calls
  };

  const handleClear = () => {
    setLocalText('');
    
    // Clear any pending timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    dispatch(clearSearchQuery());
    if (onSearch) {
      onSearch('');
    }
    
    // Focus back on input after clear
    textInputRef.current?.focus();
  };

  const handleSubmit = () => {
    // If user presses enter/return, trigger search immediately
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (localText.trim().length > 0) {
      dispatch(fetchSearchResults(localText));
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <TextInput
          ref={textInputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={localText} // Use local state for immediate feedback
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
        />
        
        {localText.length > 0 ? (
          <View style={styles.iconsContainer}>
            {searchLoading ? (
              <ActivityIndicator size="small" color="#2c95f8" style={styles.loadingIndicator} />
            ) : null}
            <TouchableOpacity 
              onPress={handleClear} 
              style={styles.searchIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchIconButton}>
            <Ionicons name="search" size={20} color="#999" />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingRight: 10,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconButton: {
    padding: 4,
  },
  loadingIndicator: {
    marginRight: 8,
  },
});

export default SearchBar;