import React, { useMemo } from 'react';
import { useVirtualScrolling } from '../../utils/performance';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  emptyComponent?: React.ComponentType;
  loadingComponent?: React.ComponentType;
  isLoading?: boolean;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  className = '',
  emptyComponent: EmptyComponent,
  loadingComponent: LoadingComponent,
  isLoading = false,
  overscan = 5,
  onScroll
}: VirtualListProps<T>) {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: handleScroll,
    startIndex
  } = useVirtualScrolling(items, itemHeight, containerHeight, overscan);

  const handleScrollWithCallback = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    handleScroll(event);
    onScroll?.(event.currentTarget.scrollTop);
  }, [handleScroll, onScroll]);

  // Renderizar estado de loading
  if (isLoading && LoadingComponent) {
    return (
      <div className={`w-full ${className}`} style={{ height: containerHeight }}>
        <LoadingComponent />
      </div>
    );
  }

  // Renderizar estado vazio
  if (items.length === 0 && !isLoading) {
    if (EmptyComponent) {
      return (
        <div className={`w-full ${className}`} style={{ height: containerHeight }}>
          <EmptyComponent />
        </div>
      );
    }
    
    return (
      <div className={`empty-container ${className}`} style={{ height: containerHeight }}>
        <p className="body-text">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScrollWithCallback}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={keyExtractor(item, startIndex + index)}
              style={{ height: itemHeight }}
              className="w-full"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Componentes pré-configurados para casos comuns
export const ProjectVirtualList = React.memo(function ProjectVirtualList({
  projects,
  onProjectSelect,
  containerHeight = 400,
  isLoading = false
}: {
  projects: Array<{ id: string; name: string; description: string; lastAccessed: string }>;
  onProjectSelect: (project: any) => void;
  containerHeight?: number;
  isLoading?: boolean;
}) {
  const LoadingComponent = () => (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="body-text">Carregando projetos...</p>
    </div>
  );

  const EmptyComponent = () => (
    <div className="empty-container">
      <p className="component-title mb-2">Nenhum projeto encontrado</p>
      <p className="body-text text-muted-foreground">Crie seu primeiro projeto para começar</p>
    </div>
  );

  return (
    <VirtualList
      items={projects}
      itemHeight={120} // Altura estimada de um ProjectCard
      containerHeight={containerHeight}
      overscan={3}
      isLoading={isLoading}
      loadingComponent={LoadingComponent}
      emptyComponent={EmptyComponent}
      keyExtractor={(project) => project.id}
      renderItem={(project, index) => (
        <div className="px-4 py-2">
          <div
            className="sr-card interactive p-4 cursor-pointer"
            onClick={() => onProjectSelect(project)}
          >
            <h3 className="component-title mb-2 line-clamp-1">{project.name}</h3>
            <p className="body-text-sm text-muted-foreground line-clamp-2 mb-2">
              {project.description}
            </p>
            <p className="body-text-sm text-muted-foreground">
              Último acesso: {new Date(project.lastAccessed).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}
    />
  );
});

// Lista virtual para arquivos
export const FileVirtualList = React.memo(function FileVirtualList({
  files,
  onFileSelect,
  containerHeight = 300,
  isLoading = false
}: {
  files: Array<{ id: string; name: string; size: number; type: string }>;
  onFileSelect: (file: any) => void;
  containerHeight?: number;
  isLoading?: boolean;
}) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📝';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    return '📁';
  };

  const LoadingComponent = () => (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="body-text">Carregando arquivos...</p>
    </div>
  );

  const EmptyComponent = () => (
    <div className="empty-container">
      <p className="component-title mb-2">Nenhum arquivo encontrado</p>
      <p className="body-text text-muted-foreground">Faça upload de arquivos para começar</p>
    </div>
  );

  return (
    <VirtualList
      items={files}
      itemHeight={60}
      containerHeight={containerHeight}
      overscan={5}
      isLoading={isLoading}
      loadingComponent={LoadingComponent}
      emptyComponent={EmptyComponent}
      keyExtractor={(file) => file.id}
      renderItem={(file, index) => (
        <div className="px-4 py-1">
          <div
            className="sr-card interactive p-3 cursor-pointer flex items-center element-gap"
            onClick={() => onFileSelect(file)}
          >
            <span className="text-xl">{getFileIcon(file.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="component-title line-clamp-1">{file.name}</p>
              <p className="body-text-sm text-muted-foreground">
                {formatFileSize(file.size)} • {file.type}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );
});