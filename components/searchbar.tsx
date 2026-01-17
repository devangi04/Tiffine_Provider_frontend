import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import { fetchSearchResults, setSearchQuery, clearSearchQuery } from '../app/store/slices/searchslice';

interface SearchBarProps {
  onSearch?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search customers",
  autoFocus = false,
  onFocus,
  onBlur
}) => {
  const dispatch = useAppDispatch();
  const searchState = useAppSelector((state) => state.search);
  const searchQuery = searchState.query;
  const searchLoading = searchState.loading;
  
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
      }, 100);
    }
  }, [autoFocus]);

  
  const handleSearch = (text: string) => {
    setLocalText(text);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    dispatch(setSearchQuery(text));
    
    if (onSearch) {
      onSearch(text);
    }

    debounceTimer.current = setTimeout(() => {
      if (text.trim().length > 0) {
        dispatch(fetchSearchResults(text));
      } else {
        dispatch(clearSearchQuery());
      }
    }, 300);
  };

  const handleClear = () => {
    setLocalText('');
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    dispatch(clearSearchQuery());
    if (onSearch) {
      onSearch('');
    }
    
    // Keep focus after clearing
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (localText.trim().length > 0) {
      dispatch(fetchSearchResults(localText));
    }
  };

  const handleFocus = () => {
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
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
          value={localText}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        
        {localText.length > 0 ? (
          <View style={styles.iconsContainer}>
            {searchLoading ? (
              <ActivityIndicator size="small" color="#15803d" style={styles.loadingIndicator} />
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
          <TouchableOpacity 
            onPress={() => {
              textInputRef.current?.focus();
            }}
            style={styles.searchIconButton}
          >
            <Ionicons name="search" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 5,
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