"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useMemo,
} from "react";
import { AddressSearch, AddressSearchRef } from "./address-search";
import { createPortal } from "react-dom";
import { useAddressInfo } from "@/hooks/use-api-queries";

// Create context
type AddressContextType = {
  openAddressModal: (address: string) => void;
  closeAddressModal: () => void;
  currentAddress: string | null;
  addressData: any; // Using any for now, but you could type this strictly
  isLoadingAddress: boolean;
  isAddressError: boolean;
};

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// Provider component
export function AddressProvider({ children }: { children: React.ReactNode }) {
  const addressSearchRef = useRef<AddressSearchRef>(null);
  const [searchContainer, setSearchContainer] = useState<HTMLElement | null>(
    null
  );
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  // Use React Query to fetch and cache address data
  const {
    data: addressData,
    isLoading: isLoadingAddress,
    error: isAddressError,
  } = useAddressInfo(currentAddress);

  // Setup search container in header
  useEffect(() => {
    const container = document.getElementById("header-search-container");
    if (container) {
      setSearchContainer(container);
    }
  }, []);

  const openAddressModal = (address: string) => {
    setCurrentAddress(address);
    addressSearchRef.current?.openAddressModal(address);
  };

  const closeAddressModal = () => {
    addressSearchRef.current?.closeAddressModal();
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      openAddressModal,
      closeAddressModal,
      currentAddress,
      addressData,
      isLoadingAddress,
      isAddressError: !!isAddressError,
    }),
    [currentAddress, addressData, isLoadingAddress, isAddressError]
  );

  return (
    <AddressContext.Provider value={contextValue}>
      {children}
      {searchContainer &&
        createPortal(<AddressSearch ref={addressSearchRef} />, searchContainer)}
    </AddressContext.Provider>
  );
}

// Hook for easy context consumption
export function useAddress() {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error("useAddress must be used within an AddressProvider");
  }
  return context;
}
