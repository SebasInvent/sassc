"use client";

import { useState, useMemo, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface ModernDataTableProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  isLoading?: boolean;
  error?: any;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  itemsPerPage?: number;
  onRowClick?: (item: T) => void;
  renderActions?: (item: T) => ReactNode;
}

export function ModernDataTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  error,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  emptyMessage = "No se encontraron resultados",
  emptyIcon,
  itemsPerPage = 10,
  onRowClick,
  renderActions,
}: ModernDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrar datos según búsqueda
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm || searchKeys.length === 0) return data;

    const searchLower = searchTerm.toLowerCase();
    return data.filter(item => 
      searchKeys.some(key => {
        const value = item[key];
        return value && String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [data, searchTerm, searchKeys]);

  // Paginación
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset página al buscar
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="border-2 border-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12 text-base border-2 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-2 border-white shadow-lg">
        <CardContent className="p-0">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Cargando datos...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-red-600 font-medium">Error al cargar los datos</p>
              <p className="text-sm text-gray-500 mt-1">Por favor, intenta nuevamente</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredData.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                {emptyIcon || <Search className="h-8 w-8 text-gray-400" />}
              </div>
              <p className="text-gray-600 font-medium">{emptyMessage}</p>
              <p className="text-sm text-gray-500 mt-1">Intenta con otros términos de búsqueda</p>
            </div>
          )}

          {/* Table with Data */}
          {!isLoading && !error && filteredData.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      {columns.map((column) => (
                        <TableHead key={column.key} className="font-bold text-gray-900">
                          {column.label}
                        </TableHead>
                      ))}
                      {renderActions && (
                        <TableHead className="font-bold text-gray-900 text-right">
                          Acciones
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => (
                      <TableRow
                        key={item.id}
                        onClick={() => onRowClick?.(item)}
                        className={`hover:bg-blue-50 transition-colors ${
                          onRowClick ? 'cursor-pointer' : ''
                        } group`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {columns.map((column) => (
                          <TableCell key={column.key}>
                            {column.render 
                              ? column.render(item) 
                              : String((item as any)[column.key] || '-')}
                          </TableCell>
                        ))}
                        {renderActions && (
                          <TableCell className="text-right">
                            {renderActions(item)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
                    {Math.min(currentPage * itemsPerPage, filteredData.length)} de{' '}
                    {filteredData.length} resultados
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 || 
                                 page === totalPages || 
                                 (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-9 w-9 p-0"
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}