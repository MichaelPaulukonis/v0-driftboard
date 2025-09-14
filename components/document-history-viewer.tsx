"use client"

import { useState, useEffect } from "react";
import { getHistoryForDocument } from "@/lib/firebase-service";
import { LoadingSpinner } from "./loading-spinner";

interface DocumentHistoryViewerProps {
  collectionName: string;
  documentId: string;
}

export function DocumentHistoryViewer({ collectionName, documentId }: DocumentHistoryViewerProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const historyRecords = await getHistoryForDocument(collectionName, documentId);
        setHistory(historyRecords);
      } catch (err) {
        setError("Failed to load document history.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [collectionName, documentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold font-sans">Document History</h3>
      {history.length === 0 ? (
        <p className="text-muted-foreground font-serif">No history found for this document.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto p-1">
          {history.map((record) => (
            <div key={record.id} className="p-3 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm uppercase">{record.changeType}</span>
                <span className="text-xs text-muted-foreground">
                  {record.createdAt?.toDate().toLocaleString() || 'No date'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">By: {record.createdBy}</p>
              <details className="mt-2">
                <summary className="text-xs cursor-pointer">View Snapshot</summary>
                <pre className="mt-1 p-2 bg-background rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(record.snapshot, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
