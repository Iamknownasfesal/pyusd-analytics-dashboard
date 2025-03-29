"use client";

import React, { useState, forwardRef, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ethers } from "ethers";
import { Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// Format number with K, M, B, T suffixes
const formatNumberWithSuffix = (num: number): string => {
  if (num === null || isNaN(num)) return "0";

  if (num < 1000) return num.toFixed(2).replace(/\.00$/, "");

  const units = ["", "K", "M", "B", "T"];
  const order = Math.floor(Math.log10(Math.abs(num)) / 3);
  const unitValue = num / Math.pow(1000, order);
  const suffix = units[order];

  // Format with up to 2 decimal places and remove trailing zeros
  return `${unitValue.toFixed(2).replace(/\.00$/, "")}${suffix}`;
};

// Form schema with Ethereum address validation
const addressFormSchema = z.object({
  address: z
    .string()
    .min(1, { message: "Address is required" })
    .refine((value: string) => ethers.isAddress(value), {
      message: "Invalid Ethereum address",
    }),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

type AddressInfo = {
  address: string;
  balance: number;
  stats: {
    total_transactions: number;
    first_transaction_date: string | null;
    send_transactions: number;
    receive_transactions: number;
    total_sent: number;
    total_received: number;
    max_sent: number;
    max_received: number;
    avg_sent: number;
    avg_received: number;
  };
  ai_insights: string[];
  error?: string;
};

// Define ref type for external access to modal controls
export type AddressSearchRef = {
  openAddressModal: (address: string) => void;
  closeAddressModal: () => void;
};

// Function to fetch address info
const fetchAddressInfo = async (address: string): Promise<AddressInfo> => {
  const response = await fetch(`/api/address-info?address=${address}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch address information");
  }
  return response.json();
};

export const AddressSearch = forwardRef<AddressSearchRef, {}>((props, ref) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  const { register, handleSubmit, formState, setValue } =
    useForm<AddressFormValues>({
      resolver: zodResolver(addressFormSchema),
      defaultValues: {
        address: "",
      },
    });

  // Use Tanstack Query for fetching and caching address data
  const {
    data: addressInfo,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["addressInfo", currentAddress],
    queryFn: () => fetchAddressInfo(currentAddress),
    enabled: !!currentAddress && isDialogOpen,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1,
  });

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    openAddressModal: (address: string) => {
      setValue("address", address);
      setCurrentAddress(address);
      setIsDialogOpen(true);
    },
    closeAddressModal: () => {
      setIsDialogOpen(false);
    },
  }));

  const onSubmit = async (data: AddressFormValues) => {
    setCurrentAddress(data.address);
    setIsDialogOpen(true);
  };

  // Show form validation errors as toast
  React.useEffect(() => {
    if (formState.errors.address) {
      toast.error(formState.errors.address.message);
    }
  }, [formState.errors.address]);

  // Helper function to safely format dates
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Unknown";

    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown";
    }
  };

  // Helper function to check if a date string is valid
  const isValidDate = (dateString: string | null): boolean => {
    if (!dateString) return false;

    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border bg-background px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-24"
            placeholder="Search by Ethereum address..."
            {...register("address")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit(onSubmit)();
                e.preventDefault();
              }
            }}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 z-10">
            <Button
              type="button"
              size="sm"
              className="h-7 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(onSubmit)();
              }}
            >
              Analyze
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>PYUSD Address Analysis</DialogTitle>
            <DialogDescription>
              Detailed information and AI insights for the PYUSD token holder.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <div className="text-destructive p-4">
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </div>
          ) : addressInfo ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Address</h3>
                  <a
                    href={`https://etherscan.io/address/${addressInfo.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    View on Etherscan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="rounded-md bg-muted p-3 break-all font-mono text-sm">
                  {addressInfo.address}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-2">PYUSD Balance</h3>
                  <p className="text-3xl font-bold">
                    ${formatNumberWithSuffix(addressInfo.balance)}
                  </p>
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-2">Transactions</h3>
                  <p className="text-3xl font-bold">
                    {formatNumberWithSuffix(
                      addressInfo.stats.total_transactions
                    )}
                  </p>
                </Card>
              </div>

              {addressInfo.stats.total_transactions > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-2">Total Sent</h3>
                    <p className="text-xl font-semibold">
                      ${formatNumberWithSuffix(addressInfo.stats.total_sent)}
                    </p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div>
                        Transactions: {addressInfo.stats.send_transactions}
                      </div>
                      <div>
                        Max: $
                        {formatNumberWithSuffix(addressInfo.stats.max_sent)}
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-2">Total Received</h3>
                    <p className="text-xl font-semibold">
                      $
                      {formatNumberWithSuffix(addressInfo.stats.total_received)}
                    </p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div>
                        Transactions: {addressInfo.stats.receive_transactions}
                      </div>
                      <div>
                        Max: $
                        {formatNumberWithSuffix(addressInfo.stats.max_received)}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-medium">AI Insights</h3>
                <div className="rounded-md border p-4 bg-card space-y-2">
                  {addressInfo.ai_insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 mt-1.5 bg-primary rounded-full" />
                      <p>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {addressInfo.stats.first_transaction_date &&
                isValidDate(addressInfo.stats.first_transaction_date) && (
                  <div className="text-sm text-muted-foreground">
                    First transaction:{" "}
                    {formatDate(addressInfo.stats.first_transaction_date)}
                  </div>
                )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
});

AddressSearch.displayName = "AddressSearch";
