import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import Breadcrumb from "../navigation/Breadcrumb";
import { getFAQ } from "../../rag_services";
import type { FAQItem } from "../../rag_services"; // ← importa só o tipo

type FaqUiItem = { id: string; question: string; answer: string };

function UserBadge() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center justify-end relative size-full">
        <div className="box-border content-stretch flex gap-2.5 items-center justify-end pb-0 pt-4 px-4 relative w-full">
          <div className="bg-primary-soft box-border content-stretch flex gap-2.5 items-center justify-center px-2 py-1 relative rounded-xl shrink-0">
            <div
              className=" font-bold leading-[0] relative shrink-0 text-primary text-[16px] text-center text-nowrap"
              style={{ fontVariationSettings: "'wdth' 100" }}
            >
              <p className="block leading-[normal] whitespace-pre">[Nome do usuário]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQContent({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const [faqItems, setFaqItems] = useState<FaqUiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFAQ = async () => {
      try {
        const response = await getFAQ(); // já é FAQItem[]
        const formattedFaqItems = response.map((item: FAQItem, index: number) => ({
          id: `item-${index + 1}`,
          question: item.question,
          answer: item.answer,
        }));
        setFaqItems(formattedFaqItems);
      } catch (error) {
        console.error("Erro ao carregar FAQ:", error);
        setFaqItems([
          {
            id: "item-error",
            question: "Erro ao carregar FAQ",
            answer: "Não foi possível carregar as perguntas frequentes. Tente novamente mais tarde.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadFAQ();
  }, []);

  if (loading) {
    return (
      <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start relative size-full">
        <Breadcrumb 
          items={[
            { label: "FAQ", isActive: true }
          ]}
          onNavigate={onNavigate || (() => {})}
        />
        <div className="flex items-center justify-center w-full h-64">
          <p className="text-lg text-muted-foreground">Carregando FAQ...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start relative size-full">
      <Breadcrumb 
        items={[
          { label: "FAQ", isActive: true }
        ]}
        onNavigate={onNavigate || (() => {})}
      />
      
      {/* Header */}
      <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center leading-[0] p-0 relative shrink-0">
        <div className="page-title relative shrink-0 text-left">
          <p className="block leading-[normal] whitespace-pre">FAQ ScholarRAG</p>
        </div>
        <div className=" font-normal relative shrink-0 text-ink text-[24px] md:text-[20px] sm:text-[18px] text-left">
          <p className="block leading-[normal] break-words">
            Encontre respostas para as perguntas mais frequentes sobre a plataforma.
          </p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="w-full max-w-4xl">
        <Accordion type="single" collapsible className="w-full space-y-6">
          {faqItems.map((item) => (
            <AccordionItem 
              key={item.id} 
              value={item.id} 
              className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden"
            >
              <AccordionTrigger className="px-6 sm:px-8 py-4 sm:py-6 text-left hover:no-underline hover:bg-surface-muted transition-colors [&[data-state=open]]:bg-surface-muted">
                <div className=" font-bold leading-[0] text-ink text-base sm:text-lg lg:text-[20px] text-left pr-4">
                  <p className="block leading-[normal]">{item.question}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
                <div className=" font-normal text-ink text-sm sm:text-base lg:text-[18px] leading-[1.5]">
                  <p className="block">{item.answer}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}