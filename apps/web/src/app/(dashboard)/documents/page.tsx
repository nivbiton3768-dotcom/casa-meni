'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AddDocumentForm } from '@/components/forms/add-document-form';
import {
  FileText,
  Plus,
  Upload,
  Building2,
  Download,
} from 'lucide-react';

interface Doc {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  property: { id: string; name: string } | null;
  lease: { id: string; tenant: { name: string } } | null;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { data: docs, loading, refetch } = useApi<Doc[]>('/documents');
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">
            {docs ? `${docs.length} documents` : 'Loading...'}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !docs || docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-100 p-4">
              <FileText className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No documents yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Leases, inspection reports, and other files will appear here.
            </p>
            <Button className="mt-6">
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {doc.property && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {doc.property.name}
                        </span>
                      )}
                      {doc.lease?.tenant && (
                        <span>Tenant: {doc.lease.tenant.name}</span>
                      )}
                      {doc.sizeBytes && <span>{formatBytes(doc.sizeBytes)}</span>}
                      <span>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Document" size="md">
        <AddDocumentForm
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}
