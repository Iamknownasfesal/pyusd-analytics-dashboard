"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
} from "react";
import { AddressSearch, AddressSearchRef } from "./address-search";
import { createPortal } from "react-dom";

// Create context
type AddressContextType = {
  openAddressModal: (address: string) => void;
};

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// Provider component
export function AddressProvider({ children }: { children: React.ReactNode }) {
  const addressSearchRef = useRef<AddressSearchRef>(null);
  const [searchContainer, setSearchContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    // Find the container in the header after component mounts
    const container = document.getElementById("header-search-container");
    if (container) {
      setSearchContainer(container);
    }
  }, []);

  const openAddressModal = (address: string) => {
    addressSearchRef.current?.openAddressModal(address);
  };

  return (
    <AddressContext.Provider value={{ openAddressModal }}>
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
