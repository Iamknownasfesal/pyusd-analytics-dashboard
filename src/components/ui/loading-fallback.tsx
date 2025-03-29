import React from "react";
import { Card, CardContent } from "@/components/ui/card";

type LoadingFallbackProps = {
  message?: string;
};

export function LoadingFallback({
  message = "Loading data...",
}: LoadingFallbackProps) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center min-h-[200px] p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
