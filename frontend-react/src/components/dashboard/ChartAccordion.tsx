import { useState } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

import FilesByProjectChart from "../dashboard/FilesByProjectChart";

interface AccordionItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

interface ChartAccordionProps {
  items: AccordionItem[];
}

export default function ChartAccordion({ items }: ChartAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(items.filter(item => item.defaultOpen).map(item => item.id))
  );
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
      // Se estiver expandido e for fechado, remover da expansão
      if (expandedItem === id) {
        setExpandedItem(null);
      }
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="flex flex-col component-gap">
      {items.map((item, index) => {
        const isOpen = openItems.has(item.id);
        const isExpanded = expandedItem === item.id;
        
        return (
          <div 
            key={item.id} 
            className={`sr-card overflow-hidden transition-all duration-300 ${
              isExpanded ? 'fixed inset-4 z-modal bg-white' : ''
            }`}
            style={isExpanded ? { 
              animation: 'scaleIn 0.3s ease-out',
              maxHeight: 'calc(100vh - 2rem)'
            } : {}}
          >
            <div className="flex items-center justify-between p-6 border-b border-surface-muted">
              <button
                onClick={() => toggleItem(item.id)}
                className="flex-1 flex items-center element-gap hover:bg-surface-muted transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center element-gap">
                  {item.icon}
                  <h3 className="component-title">{item.title}</h3>
                </div>
                
                <div className="ml-auto flex items-center element-gap">
                  {/* Indicator de status */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isOpen ? 'Aberto' : 'Fechado'}
                  </span>
                  
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
              
              {/* Botão de expandir/minimizar - apenas quando aberto */}
              {isOpen && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="ml-4 p-2 hover:bg-surface-muted rounded-lg transition-colors flex items-center justify-center"
                  title={isExpanded ? 'Minimizar' : 'Expandir'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
            
            {isOpen && (
              <div className={`${isExpanded ? 'flex-1 overflow-y-auto' : ''}`}>
                <div className="p-6 animate-fade-in">
                  {/* Header adicional quando expandido */}
                  {isExpanded && (
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-muted">
                      <div className="flex items-center element-gap">
                        {item.icon}
                        <h2 className="section-title">{item.title}</h2>
                        <span className="inline-flex items-center px-3 py-1 bg-primary-soft text-primary body-text-sm font-medium rounded-full">
                          Modo Expandido
                        </span>
                      </div>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="sr-button ghost"
                      >
                        <Minimize2 className="w-4 h-4" />
                        Minimizar
                      </button>
                    </div>
                  )}
                  
                  <div className={isExpanded ? 'h-full' : ''}>
                    {item.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Overlay quando item expandido */}
      {expandedItem && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-overlay"
          onClick={() => setExpandedItem(null)}
        />
      )}
    </div>
  );
}